from fastapi import APIRouter, HTTPException, Response, Request, Depends
from datetime import datetime, timezone
from typing import Literal, Optional
from pydantic import BaseModel, EmailStr, Field
import uuid

from models import RegisterRequest, LoginRequest, UserPublic
from auth_utils import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    get_optional_user,
)
from services import otp as otp_service

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
        "phone": user.get("phone"),
        "role": user.get("role", "customer"),
        "loyalty_points": user.get("loyalty_points", 0),
        "loyalty_tier": user.get("loyalty_tier", "Bronze"),
        "marketing_opt_in": bool(user.get("marketing_opt_in", False)),
        "created_at": user.get("created_at"),
    }


DISPOSABLE_DOMAINS = {
    "mailinator.com", "guerrillamail.com", "10minutemail.com",
    "tempmail.com", "trashmail.com", "throwaway.email", "yopmail.com",
    "fakeinbox.com", "sharklasers.com", "maildrop.cc",
}


def _ensure_clean_email(email: str) -> str:
    domain = email.split("@", 1)[-1]
    if domain in DISPOSABLE_DOMAINS:
        raise HTTPException(status_code=400, detail="Please use a permanent email address")
    return email


# ---------- Legacy /register kept for the mobile app until it ships an OTP UI.
# The web client now uses /signup/start + /signup/verify, which gates account
# creation behind an OTP delivered to the user's email or phone.

@router.post("/register", response_model=UserPublic)
async def register(payload: RegisterRequest, response: Response):
    from server import db
    email = _ensure_clean_email(payload.email.lower().strip())

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


@router.patch("/me/preferences")
async def update_preferences(payload: dict, user: dict = Depends(get_current_user)):
    """Update user's notification preferences. Currently only
    `marketing_opt_in` (bool) — extend with email/SMS toggles when needed."""
    from server import db
    update: dict = {}
    if "marketing_opt_in" in payload:
        update["marketing_opt_in"] = bool(payload["marketing_opt_in"])
    if not update:
        raise HTTPException(status_code=400, detail="No supported preferences in payload")
    await db.users.update_one({"id": user["id"]}, {"$set": update})
    fresh = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    return _public_user(fresh)



# ---------- OTP-protected signup ------------------------------------------------
class SignupStartRequest(RegisterRequest):
    """Same fields as RegisterRequest plus the channel the user wants to use."""
    channel: Literal["email", "phone"] = "email"


class SignupVerifyRequest(BaseModel):
    pending_id: str = Field(min_length=10, max_length=128)
    code: str = Field(min_length=4, max_length=8)


class SignupResendRequest(BaseModel):
    pending_id: str = Field(min_length=10, max_length=128)


@router.post("/signup/start")
async def signup_start(payload: SignupStartRequest):
    """Step 1 — validate the form, create a pending-signup doc, send an OTP.
    No user is created and no auth cookie is set until /signup/verify succeeds."""
    from server import db
    email = _ensure_clean_email(payload.email.lower().strip())

    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")

    if payload.channel == "phone":
        if not payload.phone:
            raise HTTPException(status_code=400, detail="Phone is required when verifying by SMS")
        if await db.users.find_one({"phone": payload.phone}):
            raise HTTPException(status_code=400, detail="Phone already registered")

    try:
        result = await otp_service.create_pending(
            db,
            name=payload.name.strip(),
            email=email,
            password=payload.password,
            phone=payload.phone,
            channel=payload.channel,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return result


@router.post("/signup/verify", response_model=UserPublic)
async def signup_verify(payload: SignupVerifyRequest, response: Response):
    """Step 2 — match the OTP, create the user, set the auth cookie."""
    from server import db
    try:
        pending = await otp_service.verify_code(db, pending_id=payload.pending_id, code=payload.code)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Race-safe duplicate check — someone could have registered with the same
    # email between /start and /verify.
    if await db.users.find_one({"email": pending["email"]}):
        await db.signup_otps.delete_one({"pending_id": payload.pending_id})
        raise HTTPException(status_code=400, detail="Email already registered")

    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "name": pending["name"],
        "email": pending["email"],
        "phone": pending.get("phone"),
        "password_hash": pending["password_hash"],
        "role": "customer",
        "loyalty_points": 100,
        "loyalty_tier": "Bronze",
        "favorites": [],
        "verified_via": pending["channel"],
        "verified_at": datetime.now(timezone.utc).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user_doc)
    await db.signup_otps.delete_one({"pending_id": payload.pending_id})

    token = create_access_token(user_id, pending["email"], "customer")
    _set_cookie(response, token)
    return _public_user(user_doc)


@router.post("/signup/resend")
async def signup_resend(payload: SignupResendRequest):
    from server import db
    try:
        result = await otp_service.resend_code(db, pending_id=payload.pending_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return result
