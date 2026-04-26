"""Cart abandonment: tracks active carts and sends email/SMS recovery after inactivity."""
from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import os
import asyncio
import logging

from services.notifications import (
    send_email,
    send_sms,
    format_au_phone,
    cart_recovery_email_html,
    cart_recovery_sms,
)
from services.push import send_to_user as push_send_to_user, send_to_anon_token as push_send_anon

logger = logging.getLogger("chaioz.cart_recovery")
router = APIRouter(prefix="/api/cart", tags=["cart_recovery"])

# Time in minutes before cart is considered abandoned (normally 30, lowered for testing)
ABANDON_MINUTES = int(os.environ.get("CART_ABANDON_MINUTES", "30"))


class CartItemSnapshot(BaseModel):
    item_id: str
    name: str
    qty: int
    line_total: float


class CartSnapshot(BaseModel):
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    name: Optional[str] = None
    items: List[CartItemSnapshot]


@router.post("/snapshot")
async def snapshot_cart(payload: CartSnapshot):
    """Called from frontend whenever cart changes AND user has provided email/phone."""
    from server import db
    if not payload.items:
        return {"ok": True, "reason": "empty cart"}
    if not payload.email and not payload.phone:
        return {"ok": True, "reason": "no contact"}
    e164 = format_au_phone(payload.phone) if payload.phone else None
    key = payload.email or e164
    await db.abandoned_carts.update_one(
        {"key": key},
        {
            "$set": {
                "key": key,
                "email": payload.email,
                "phone": e164,
                "name": payload.name,
                "items": [i.model_dump() for i in payload.items],
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "recovered_at": None,
                "recovery_sent": False,
            },
            "$setOnInsert": {"created_at": datetime.now(timezone.utc).isoformat()},
        },
        upsert=True,
    )
    return {"ok": True}


@router.post("/recovered")
async def mark_recovered(payload: dict):
    from server import db
    key = payload.get("email") or format_au_phone(payload.get("phone", ""))
    if not key:
        return {"ok": True}
    await db.abandoned_carts.update_one(
        {"key": key},
        {"$set": {"recovered_at": datetime.now(timezone.utc).isoformat()}},
    )
    return {"ok": True}


@router.post("/scan")
async def scan_now(_: dict = None):
    """Admin/cron trigger — scans for abandoned carts and sends recovery messages."""
    sent = await run_recovery_scan()
    return {"scanned": True, "sent": sent}


async def run_recovery_scan() -> int:
    """Find carts last updated >= ABANDON_MINUTES ago, not yet recovered, not yet sent."""
    from server import db
    cutoff = (datetime.now(timezone.utc) - timedelta(minutes=ABANDON_MINUTES)).isoformat()
    cursor = db.abandoned_carts.find({
        "updated_at": {"$lte": cutoff},
        "recovery_sent": {"$ne": True},
        "recovered_at": None,
    }, {"_id": 0})
    sent_count = 0
    frontend_url = os.environ.get("FRONTEND_URL", "")
    resume_url = f"{frontend_url}/menu?resume=1"
    async for cart in cursor:
        items = cart.get("items", [])
        if not items:
            continue
        if cart.get("email"):
            html = cart_recovery_email_html(cart.get("name") or "", items, resume_url)
            await send_email(cart["email"], "Your chai's getting cold 🫖", html)
        if cart.get("phone"):
            await send_sms(cart["phone"], cart_recovery_sms(cart.get("name") or "", resume_url))

        # Push fallback — try the linked user, else any anonymous device tokens
        # we matched against this cart's email/phone.
        push_title = "Your chai is getting cold 🫖"
        push_body = "Tap to finish your order — your cart is saved."
        push_data = {"type": "abandoned_cart", "resume_url": resume_url}
        if cart.get("email"):
            user = await db.users.find_one({"email": cart["email"]}, {"_id": 0, "id": 1})
            if user:
                await push_send_to_user(user["id"], push_title, push_body, push_data)
        anon_tokens = cart.get("device_tokens") or []
        for t in anon_tokens:
            await push_send_anon(t, push_title, push_body, push_data)

        await db.abandoned_carts.update_one(
            {"key": cart["key"]},
            {"$set": {"recovery_sent": True, "recovery_sent_at": datetime.now(timezone.utc).isoformat()}},
        )
        sent_count += 1
    logger.info("Recovery scan: sent=%d", sent_count)
    return sent_count


async def recovery_loop():
    """Background loop — scans every 5 minutes."""
    while True:
        try:
            await run_recovery_scan()
        except Exception as e:
            logger.error("Recovery loop error: %s", e)
        await asyncio.sleep(300)
