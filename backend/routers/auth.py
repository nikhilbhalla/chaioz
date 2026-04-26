from fastapi import APIRouter, HTTPException, Response, Request, Depends
from datetime import datetime, timezone
import uuid

from models import RegisterRequest, LoginRequest, UserPublic
from auth_utils import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    get_optional_user,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _set_cookie(response: Response, token: str):
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=60 * 60 * 24 * 7,
        path="/",
    )


def _public_user(user: dict) -> dict:
    return {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "role": user.get("role", "customer"),
        "loyalty_points": user.get("loyalty_points", 0),
        "loyalty_tier": user.get("loyalty_tier", "Bronze"),
        "created_at": user.get("created_at"),
    }


@router.post("/register", response_model=UserPublic)
async def register(payload: RegisterRequest, response: Response):
    from server import db
    email = payload.email.lower().strip()

    # Lightweight anti-spam: block obvious disposable email domains. Keep the
    # list short to avoid false positives — Pydantic + password rules already
    # do most of the heavy lifting upstream.
    disposable = {
        "mailinator.com", "guerrillamail.com", "10minutemail.com",
        "tempmail.com", "trashmail.com", "throwaway.email", "yopmail.com",
        "fakeinbox.com", "sharklasers.com", "maildrop.cc",
    }
    domain = email.split("@", 1)[-1]
    if domain in disposable:
        raise HTTPException(status_code=400, detail="Please use a permanent email address")

    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "name": payload.name.strip(),
        "email": email,
        "phone": payload.phone,
        "password_hash": hash_password(payload.password),
        "role": "customer",
        "loyalty_points": 100,  # signup bonus
        "loyalty_tier": "Bronze",
        "favorites": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user_doc)
    token = create_access_token(user_id, email, "customer")
    _set_cookie(response, token)
    return _public_user(user_doc)


@router.post("/login", response_model=UserPublic)
async def login(payload: LoginRequest, response: Response):
    from server import db
    email = payload.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token(user["id"], user["email"], user.get("role", "customer"))
    _set_cookie(response, token)
    return _public_user(user)


@router.post("/token")
async def issue_token(payload: LoginRequest):
    """Mobile/API clients that cannot read HttpOnly cookies.
    Returns the JWT in the response body for Authorization: Bearer usage."""
    from server import db
    email = payload.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token(user["id"], user["email"], user.get("role", "customer"))
    return {"access_token": token, "token_type": "bearer", "user": _public_user(user)}


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}


@router.get("/me")
async def me(user: dict | None = Depends(get_optional_user)):
    """Returns the current user or null. Uses 200+null for anonymous so
    front-end probes don't spam the browser console with 401s."""
    if not user:
        return None
    return _public_user(user)
