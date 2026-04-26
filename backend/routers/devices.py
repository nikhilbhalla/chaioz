"""Device + push token registration. Mobile app calls these on login + logout.

Anonymous tokens (registered before login) attach to a separate
`device_tokens` collection so abandoned-cart pings still reach the device.
On login, the token gets promoted onto the user's `expo_push_tokens` list
and removed from the anonymous collection."""
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth_utils import get_current_user, get_optional_user

router = APIRouter(prefix="/api/devices", tags=["devices"])


class RegisterTokenRequest(BaseModel):
    token: str
    platform: Optional[str] = None  # 'ios' / 'android' / 'web'
    device_name: Optional[str] = None


def _is_expo_token(t: str) -> bool:
    return isinstance(t, str) and (t.startswith("ExponentPushToken[") or t.startswith("ExpoPushToken["))


@router.post("/register")
async def register_token(payload: RegisterTokenRequest, user: Optional[dict] = Depends(get_optional_user)):
    """Idempotent — repeated calls just refresh `last_seen_at`."""
    from server import db
    token = payload.token.strip()
    if not _is_expo_token(token):
        raise HTTPException(status_code=400, detail="Invalid Expo push token")

    now = datetime.now(timezone.utc).isoformat()
    if user:
        # Promote the token onto the user (de-dupes via $addToSet).
        await db.users.update_one(
            {"id": user["id"]},
            {"$addToSet": {"expo_push_tokens": token},
             "$set": {"push_last_registered_at": now, "push_platform": payload.platform}},
        )
        # Drop from anonymous collection if it was sitting there.
        await db.device_tokens.delete_one({"token": token})
        return {"ok": True, "user": user["id"], "anonymous": False}

    await db.device_tokens.update_one(
        {"token": token},
        {"$set": {
            "token": token,
            "platform": payload.platform,
            "device_name": payload.device_name,
            "last_seen_at": now,
        },
         "$setOnInsert": {"created_at": now}},
        upsert=True,
    )
    return {"ok": True, "anonymous": True}


@router.post("/unregister")
async def unregister_token(payload: RegisterTokenRequest, user: dict = Depends(get_current_user)):
    """Mobile calls this on logout so the token stops receiving pushes for
    the previous user."""
    from server import db
    token = payload.token.strip()
    await db.users.update_one(
        {"id": user["id"]},
        {"$pull": {"expo_push_tokens": token}},
    )
    await db.device_tokens.delete_one({"token": token})
    return {"ok": True}
