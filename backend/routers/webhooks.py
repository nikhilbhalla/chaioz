"""Square webhook handler — receives `order.updated` / `payment.updated` events
from Square POS and mirrors the state back onto our local order document.

Square's Orders API surfaces fulfilment state changes as an `order.updated`
event with `data.object.order_updated.state` of either the new order state
(OPEN/COMPLETED/CANCELED) or a fulfillment-level state inside
`fulfillments[*].state` (PROPOSED/RESERVED/PREPARED/COMPLETED/CANCELED).

We map those to our local `status` field (pending/confirmed/preparing/
ready/completed/cancelled) so the admin dashboard + SMS automation stays in
sync when staff progresses the ticket on the Square tablet."""

import os
import hmac
import hashlib
import base64
import logging
import json
from datetime import datetime, timezone
from fastapi import APIRouter, Request, HTTPException, BackgroundTasks

from services.notifications import send_sms, format_au_phone, order_ready_sms

logger = logging.getLogger("chaioz.webhooks.square")

router = APIRouter(prefix="/api/webhooks/square", tags=["webhooks"])

SIGNATURE_KEY = os.environ.get("SQUARE_WEBHOOK_SIGNATURE_KEY", "")


def _verify_signature(request_url: str, body: bytes, signature_header: str) -> bool:
    """Square signs `<notificationUrl><rawBody>` with HMAC-SHA256 (key = the
    webhook signature key) and sends the base64-encoded digest in the
    `x-square-hmacsha256-signature` header."""
    if not SIGNATURE_KEY or not signature_header:
        return False
    payload = (request_url + body.decode("utf-8", errors="replace")).encode("utf-8")
    mac = hmac.new(SIGNATURE_KEY.encode("utf-8"), payload, hashlib.sha256).digest()
    expected = base64.b64encode(mac).decode("utf-8")
    return hmac.compare_digest(expected, signature_header)


# Fulfillment state → our local status
_FULFILLMENT_STATE_MAP = {
    "PROPOSED": "confirmed",
    "RESERVED": "preparing",
    "PREPARED": "ready",
    "COMPLETED": "completed",
    "CANCELED": "cancelled",
    "FAILED": "cancelled",
}

# Order state → our local status
_ORDER_STATE_MAP = {
    "OPEN": None,            # don't downgrade — fulfillment state is richer
    "COMPLETED": "completed",
    "CANCELED": "cancelled",
    "DRAFT": None,
}


def _derive_status(order_updated: dict) -> str | None:
    """Pick the most informative status we can from the Square order payload."""
    # Prefer fulfillment-level state (PREPARED / COMPLETED / …)
    fulfillments = order_updated.get("fulfillments") or []
    for f in fulfillments:
        mapped = _FULFILLMENT_STATE_MAP.get((f.get("state") or "").upper())
        if mapped:
            return mapped
    return _ORDER_STATE_MAP.get((order_updated.get("state") or "").upper())


async def _find_local_order(db, square_order_id: str):
    if not square_order_id:
        return None
    return await db.orders.find_one({"square_order_id": square_order_id}, {"_id": 0})


@router.post("")
async def receive_webhook(request: Request, bg: BackgroundTasks):
    raw = await request.body()
    sig = request.headers.get("x-square-hmacsha256-signature", "")

    # Square signs `<notificationUrl><rawBody>`. The notificationUrl is exactly
    # the URL the webhook is configured against (no trailing slash normalisation).
    # Use the public base URL the frontend already knows about.
    public_base = os.environ.get("PUBLIC_BACKEND_URL") or ""
    notif_url = public_base.rstrip("/") + "/api/webhooks/square"

    if SIGNATURE_KEY and not _verify_signature(notif_url, raw, sig):
        # Log but don't leak details — return 401 for Square to retry.
        logger.warning("Square webhook signature mismatch (url=%s, sig=%s)", notif_url, sig[:8])
        raise HTTPException(status_code=401, detail="Invalid signature")

    try:
        event = json.loads(raw.decode("utf-8"))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    event_type = event.get("type", "")
    data = (event.get("data") or {}).get("object") or {}

    from server import db

    if event_type.startswith("order."):
        order_updated = data.get("order_updated") or data.get("order") or {}
        sq_order_id = order_updated.get("id") or data.get("id")
        local = await _find_local_order(db, sq_order_id)
        if not local:
            logger.info("Webhook for unknown Square order %s — ignoring", sq_order_id)
            return {"ok": True, "matched": False}

        new_status = _derive_status(order_updated)
        if not new_status or new_status == local.get("status"):
            await db.orders.update_one(
                {"id": local["id"]},
                {"$set": {"square_last_event_at": datetime.now(timezone.utc).isoformat()}},
            )
            return {"ok": True, "matched": True, "status_changed": False}

        await db.orders.update_one(
            {"id": local["id"]},
            {"$set": {
                "status": new_status,
                "square_last_event_at": datetime.now(timezone.utc).isoformat(),
                "square_last_event_type": event_type,
            }},
        )

        # Notify customer when staff marks ready on the Square tablet.
        if new_status == "ready" and local.get("status") != "ready" and local.get("customer_phone"):
            phone = format_au_phone(local["customer_phone"])
            if phone:
                bg.add_task(
                    send_sms,
                    phone,
                    order_ready_sms(local.get("short_code", ""), local.get("customer_name", "")),
                )

        logger.info("Square webhook: order %s → %s", local.get("short_code"), new_status)
        return {"ok": True, "matched": True, "status_changed": True, "new_status": new_status}

    if event_type.startswith("payment."):
        payment = data.get("payment") or data
        sq_order_id = payment.get("order_id")
        local = await _find_local_order(db, sq_order_id)
        if not local:
            return {"ok": True, "matched": False}
        await db.orders.update_one(
            {"id": local["id"]},
            {"$set": {
                "square_payment_status": (payment.get("status") or "").lower(),
                "square_last_event_at": datetime.now(timezone.utc).isoformat(),
                "square_last_event_type": event_type,
            }},
        )
        return {"ok": True, "matched": True}

    logger.info("Unhandled Square webhook: %s", event_type)
    return {"ok": True, "matched": False, "unhandled": event_type}


@router.get("/health")
async def health():
    """Lightweight health check Square's dashboard pings when you save a new
    subscription. Returns 200 without requiring a signature."""
    return {
        "ok": True,
        "signature_configured": bool(SIGNATURE_KEY),
        "public_url_configured": bool(os.environ.get("PUBLIC_BACKEND_URL")),
    }
