"""Email/SMS OTP verification for signup — anti-spam gate.

Stores pending signups in the `signup_otps` collection. Codes are hashed at
rest (bcrypt-style hashing reused from auth_utils) so a DB leak doesn't expose
working OTPs. We bake all rate limiting + attempt tracking into Mongo so the
API is stateless and can scale horizontally.

Flow:
  1. POST /api/auth/signup/start  → creates a pending doc, sends OTP, returns pending_id
  2. POST /api/auth/signup/verify → matches code, creates the actual user, sets cookie
  3. POST /api/auth/signup/resend → regenerates a code (max 3 per hour per identifier)
"""
from __future__ import annotations

import os
import secrets
import logging
from datetime import datetime, timezone, timedelta
from typing import Literal, Optional

from auth_utils import hash_password, verify_password
from services.notifications import send_email, send_sms, format_au_phone

logger = logging.getLogger("chaioz.otp")

OTP_TTL_MINUTES = 10
MAX_VERIFY_ATTEMPTS = 5
MAX_CODES_PER_HOUR = 3
MAX_PENDING_PER_HOUR = 3


def generate_code() -> str:
    """6-digit OTP — `secrets` for cryptographic randomness."""
    return f"{secrets.randbelow(1_000_000):06d}"


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _identifier(channel: str, email: str, phone: Optional[str]) -> str:
    return f"phone:{phone}" if channel == "phone" else f"email:{email}"


async def count_recent_starts(db, identifier: str) -> int:
    cutoff = _now() - timedelta(hours=1)
    return await db.signup_otps.count_documents({
        "identifier": identifier,
        "created_at": {"$gte": cutoff.isoformat()},
    })


async def deliver_code(channel: str, email: str, phone: Optional[str], code: str, name: str) -> dict:
    """Dispatch the code via the chosen channel. Returns the notification result."""
    if channel == "email":
        subject = "Your Chaioz verification code"
        html = _otp_email_html(name=name, code=code)
        return await send_email(email, subject, html)
    elif channel == "phone":
        e164 = format_au_phone(phone or "")
        if not e164:
            return {"status": "error", "error": "invalid_phone"}
        body = f"Chaioz: your verification code is {code}. Valid for {OTP_TTL_MINUTES} minutes."
        return await send_sms(e164, body)
    return {"status": "error", "error": "unknown_channel"}


def _otp_email_html(name: str, code: str) -> str:
    spaced = " ".join(code)
    return f"""
<div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:480px;margin:auto;background:#0F4C4A;color:#FDFBF7;padding:36px 28px;border-radius:18px">
  <h1 style="font-family:Georgia,serif;color:#E8A84A;margin:0 0 12px;font-size:26px">Welcome to Chaioz, {name or 'friend'}.</h1>
  <p style="color:rgba(253,251,247,0.85);margin:0 0 24px;line-height:1.6">Use the code below to verify your email and finish setting up your account.</p>
  <div style="text-align:center;background:#FDFBF7;color:#0F4C4A;padding:18px;border-radius:12px;letter-spacing:14px;font-size:32px;font-weight:700;font-family:Menlo,monospace">{spaced}</div>
  <p style="color:rgba(253,251,247,0.6);font-size:12px;margin:18px 0 0;text-align:center">This code expires in {OTP_TTL_MINUTES} minutes. If you didn't sign up for Chaioz, you can ignore this email.</p>
  <p style="color:rgba(253,251,247,0.45);font-size:11px;text-align:center;margin:24px 0 0">Chaioz · Unit 2, 132 O'Connell St, North Adelaide</p>
</div>"""


async def create_pending(
    db,
    *,
    name: str,
    email: str,
    password: str,
    phone: Optional[str],
    channel: Literal["email", "phone"],
) -> dict:
    """Create a pending-signup doc + dispatch an OTP. Returns {pending_id, channel, target_masked}.

    Raises ValueError on rate limit / channel issues so the router can surface
    a 429/400 cleanly.
    """
    if channel == "phone" and not phone:
        raise ValueError("Phone is required when channel='phone'")

    identifier = _identifier(channel, email, phone)
    if await count_recent_starts(db, identifier) >= MAX_PENDING_PER_HOUR:
        raise ValueError("Too many signup attempts. Please try again in an hour.")

    # Invalidate any previous pending docs for this identifier so the user can
    # retry cleanly (e.g. they typed the wrong email and want to restart).
    await db.signup_otps.delete_many({"identifier": identifier})

    code = generate_code()
    pending_id = secrets.token_urlsafe(24)
    expires_at = _now() + timedelta(minutes=OTP_TTL_MINUTES)

    await db.signup_otps.insert_one({
        "pending_id": pending_id,
        "identifier": identifier,
        "channel": channel,
        "name": name,
        "email": email,
        "phone": phone,
        "password_hash": hash_password(password),
        "code_hash": hash_password(code),
        "attempts": 0,
        "resends": 0,
        "created_at": _now().isoformat(),
        "expires_at": expires_at.isoformat(),
    })

    delivery = await deliver_code(channel, email, phone, code, name)
    dev_mode = bool(delivery.get("dev_mode")) or delivery.get("status") == "error"
    if delivery.get("status") == "error":
        # Don't block signup on a delivery failure — Resend dev keys + un-verified
        # Twilio numbers will both surface here. Log the OTP at WARN so the operator
        # can still complete the flow in non-prod and fix the integration later.
        logger.warning(
            "[DEV OTP — delivery failed: %s] channel=%s target=%s code=%s",
            delivery.get("error"), channel, email if channel == "email" else phone, code,
        )

    target = _mask_target(channel, email, phone)
    return {"pending_id": pending_id, "channel": channel, "target": target, "dev_mode": dev_mode}


async def verify_code(db, *, pending_id: str, code: str) -> dict:
    """Match the code against the pending doc. Raises ValueError on failure
    with a user-safe message. Returns the pending doc on success — the router
    is responsible for actually creating the user + setting the cookie."""
    doc = await db.signup_otps.find_one({"pending_id": pending_id})
    if not doc:
        raise ValueError("This verification request has expired. Please sign up again.")

    expires_at = datetime.fromisoformat(doc["expires_at"])
    if _now() >= expires_at:
        await db.signup_otps.delete_one({"pending_id": pending_id})
        raise ValueError("Code expired. Please request a new one.")

    if doc.get("attempts", 0) >= MAX_VERIFY_ATTEMPTS:
        await db.signup_otps.delete_one({"pending_id": pending_id})
        raise ValueError("Too many incorrect attempts. Please sign up again.")

    if not verify_password(code, doc["code_hash"]):
        await db.signup_otps.update_one({"pending_id": pending_id}, {"$inc": {"attempts": 1}})
        remaining = MAX_VERIFY_ATTEMPTS - (doc.get("attempts", 0) + 1)
        raise ValueError(f"Incorrect code. {remaining} attempt{'s' if remaining != 1 else ''} left.")

    return doc


async def resend_code(db, *, pending_id: str) -> dict:
    doc = await db.signup_otps.find_one({"pending_id": pending_id})
    if not doc:
        raise ValueError("Pending signup not found. Please start again.")

    if doc.get("resends", 0) >= MAX_CODES_PER_HOUR - 1:  # -1 because the original send counts
        raise ValueError("Too many resend attempts. Please wait a bit before trying again.")

    code = generate_code()
    expires_at = _now() + timedelta(minutes=OTP_TTL_MINUTES)
    await db.signup_otps.update_one(
        {"pending_id": pending_id},
        {"$set": {
            "code_hash": hash_password(code),
            "expires_at": expires_at.isoformat(),
            "attempts": 0,
        }, "$inc": {"resends": 1}},
    )
    delivery = await deliver_code(doc["channel"], doc["email"], doc.get("phone"), code, doc.get("name", ""))
    dev_mode = bool(delivery.get("dev_mode")) or delivery.get("status") == "error"
    if delivery.get("status") == "error":
        logger.warning(
            "[DEV OTP RESEND — delivery failed: %s] channel=%s target=%s code=%s",
            delivery.get("error"), doc["channel"],
            doc["email"] if doc["channel"] == "email" else doc.get("phone"),
            code,
        )
    return {
        "channel": doc["channel"],
        "target": _mask_target(doc["channel"], doc["email"], doc.get("phone")),
        "dev_mode": dev_mode,
    }


def _mask_target(channel: str, email: str, phone: Optional[str]) -> str:
    if channel == "phone" and phone:
        # Show last 3 digits only.
        digits = "".join(c for c in phone if c.isdigit())
        return f"•••• ••• {digits[-3:]}" if len(digits) >= 3 else "••••"
    if "@" in email:
        local, domain = email.split("@", 1)
        masked = local[0] + "•" * max(1, len(local) - 2) + (local[-1] if len(local) > 1 else "")
        return f"{masked}@{domain}"
    return email
