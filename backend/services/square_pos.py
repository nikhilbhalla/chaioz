"""Square POS integration — pushes new website orders into Square so they appear
on the café's existing Square tablet/KDS for staff (zero behaviour change).

Built against `squareup>=44.0` which exposes `Square` as the top-level client."""

import os
import uuid
import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

logger = logging.getLogger("chaioz.square")

SQUARE_ACCESS_TOKEN = os.environ.get("SQUARE_ACCESS_TOKEN", "")
SQUARE_ENVIRONMENT = os.environ.get("SQUARE_ENVIRONMENT", "sandbox").lower()
SQUARE_LOCATION_ID = os.environ.get("SQUARE_LOCATION_ID", "")
SQUARE_CURRENCY = os.environ.get("SQUARE_CURRENCY", "AUD")

_client = None


def is_configured() -> bool:
    return bool(SQUARE_ACCESS_TOKEN and SQUARE_LOCATION_ID)


def _get_client():
    global _client
    if _client is not None:
        return _client
    if not is_configured():
        return None
    try:
        from square import Square
        from square.environment import SquareEnvironment
        env = SquareEnvironment.SANDBOX if SQUARE_ENVIRONMENT == "sandbox" else SquareEnvironment.PRODUCTION
        _client = Square(token=SQUARE_ACCESS_TOKEN, environment=env)
        logger.info("Square client initialised (%s)", SQUARE_ENVIRONMENT)
        return _client
    except Exception as e:
        logger.error("Square client init failed: %s", e)
        return None


def _format_phone_e164(raw: str) -> str:
    if not raw:
        return "+61000000000"
    digits = "".join(c for c in raw if c.isdigit() or c == "+")
    if digits.startswith("+"):
        return digits
    if digits.startswith("0") and len(digits) == 10:
        return "+61" + digits[1:]
    if digits.startswith("61"):
        return "+" + digits
    return "+61" + digits.lstrip("0")


def _cents(aud: float) -> int:
    return int(round(aud * 100))


def _ensure_rfc3339(ts: str, fallback_minutes: int = 15) -> str:
    """Return a valid RFC3339 ISO-8601 timestamp. Square rejects anything else
    (notably the literal 'ASAP'). If the incoming string cannot be parsed, fall
    back to now + `fallback_minutes`."""
    if ts:
        try:
            # Accept 'Z' suffix as a synonym for '+00:00'
            candidate = ts.replace("Z", "+00:00") if ts.endswith("Z") else ts
            parsed = datetime.fromisoformat(candidate)
            if parsed.tzinfo is None:
                parsed = parsed.replace(tzinfo=timezone.utc)
            out = parsed.isoformat()
            return out.replace("+00:00", "Z") if out.endswith("+00:00") else out
        except Exception:
            pass
    fut = datetime.now(timezone.utc) + timedelta(minutes=fallback_minutes)
    return fut.isoformat().replace("+00:00", "Z")


def _serialize_square_error(e: Exception) -> str:
    """Square SDK v44 ApiError exposes `.body` (dict/bytes/str) + `.status_code`.

    Produces structured messages like:
      [INVALID_REQUEST_ERROR/MISSING_REQUIRED_FIELD] (field=location_id) Missing required field.

    This is far easier to action than a raw JSON dump and avoids the header-first
    truncation issue of str(e)."""
    import json as _json
    body = getattr(e, "body", None)
    if body is not None:
        # bytes → str
        if isinstance(body, (bytes, bytearray)):
            try:
                body = body.decode("utf-8", errors="replace")
            except Exception:
                pass
        # str → dict
        if isinstance(body, str):
            try:
                body = _json.loads(body)
            except Exception:
                return body[:2000]
        # dict → structured error list
        if isinstance(body, dict):
            errors = body.get("errors") or []
            if errors:
                parts = []
                for err in errors:
                    cat = err.get("category", "?")
                    code = err.get("code", "?")
                    detail = err.get("detail", "no detail")
                    field = err.get("field", "")
                    field_str = f" (field={field})" if field else ""
                    parts.append(f"[{cat}/{code}]{field_str} {detail}")
                return " | ".join(parts)[:2000]
            try:
                return _json.dumps(body)[:2000]
            except Exception:
                return str(body)[:2000]
    # Fall back to well-known attributes before resorting to str()
    for attr in ("message", "errors", "args"):
        val = getattr(e, attr, None)
        if val:
            try:
                return _json.dumps(val)[:2000]
            except Exception:
                return str(val)[:2000]
    return str(e)[:2000]


async def push_order_to_square(order: dict) -> dict:
    """Create a corresponding order in Square POS. Graceful: never raises."""
    client = _get_client()
    if not client:
        return {"success": False, "square_order_id": None, "error": "Square not configured"}

    line_items = []
    for i in order.get("items", []):
        line_items.append({
            "name": i["name"][:255],
            "quantity": str(i.get("qty", 1)),
            "base_price_money": {
                "amount": _cents(i.get("price", 0)),
                "currency": SQUARE_CURRENCY,
            },
            "note": (i.get("notes") or "")[:500],
        })

    fulfillment_type = "DELIVERY" if order.get("fulfillment") == "delivery" else "PICKUP"
    phone = _format_phone_e164(order.get("customer_phone", ""))

    # Square requires RFC3339. Guard against 'ASAP' / empty / legacy values.
    pickup_iso = _ensure_rfc3339(order.get("pickup_time") or "")

    # Fulfillment state RESERVED tells Square "this is a committed online
    # pickup/delivery — surface it on the POS tablet now". Default state is
    # PROPOSED, which keeps the order hidden from the Pickup Orders queue
    # until a payment lands. In production we skip auto-payment (staff
    # charges on the tablet at pickup), so without RESERVED the staff never
    # sees the order.
    fulfillment = {"type": fulfillment_type, "state": "RESERVED"}
    if fulfillment_type == "PICKUP":
        fulfillment["pickup_details"] = {
            "recipient": {
                "display_name": order.get("customer_name", "Customer"),
                "phone_number": phone,
            },
            "schedule_type": "SCHEDULED",
            "pickup_at": pickup_iso,
            "note": (order.get("notes") or "")[:500],
        }
    else:
        addr = order.get("delivery_address") or {}
        fulfillment["delivery_details"] = {
            "recipient": {
                "display_name": order.get("customer_name", "Customer"),
                "phone_number": phone,
                "address": {
                    "address_line_1": (addr.get("street_address") or [""])[0],
                    "locality": addr.get("city", ""),
                    "administrative_district_level_1": addr.get("state", ""),
                    "postal_code": addr.get("zip_code", ""),
                    "country": addr.get("country", "AU"),
                },
            },
            "schedule_type": "SCHEDULED",
            "deliver_at": pickup_iso,
            "note": (order.get("notes") or "")[:500],
        }

    try:
        def _call():
            return client.orders.create(
                idempotency_key=str(uuid.uuid4()),
                order={
                    "location_id": SQUARE_LOCATION_ID,
                    "reference_id": str(order.get("short_code") or order.get("id") or "")[:40],
                    # Order-level note surfaces the customer's special request at
                    # the top of the Square ticket so staff see it immediately.
                    "note": (order.get("notes") or "")[:500],
                    "line_items": line_items,
                    "fulfillments": [fulfillment],
                },
            )
        resp = await asyncio.to_thread(_call)
        # SDK v44 returns a response with `.order`
        square_order = getattr(resp, "order", None) or (resp.get("order") if isinstance(resp, dict) else None)
        if square_order:
            sid = square_order.id if hasattr(square_order, "id") else square_order.get("id")
            logger.info("Square order created: %s (local=%s)", sid, order.get("short_code"))
            return {"success": True, "square_order_id": sid, "error": None}
        logger.error("Square create returned no order: %s", resp)
        return {"success": False, "square_order_id": None, "error": "no order in response"}
    except Exception as e:
        err = _serialize_square_error(e)
        logger.exception("Square push exception: %s", err)
        return {"success": False, "square_order_id": None, "error": err}


async def create_sandbox_payment(square_order_id: str, total_aud: float) -> dict:
    """Mark the order as paid in Square sandbox (uses test nonce).

    ONLY safe in sandbox — the test nonce `cnon:card-nonce-ok` is rejected by
    Square production. In production we skip auto-payment entirely; staff
    complete the payment on the café's Square tablet at pickup."""
    if SQUARE_ENVIRONMENT != "sandbox":
        return {"success": False, "skipped": True, "error": "production — staff completes payment on tablet"}
    client = _get_client()
    if not client or not square_order_id:
        return {"success": False, "error": "no client / order"}
    try:
        def _call():
            return client.payments.create(
                idempotency_key=str(uuid.uuid4()),
                source_id="cnon:card-nonce-ok",
                amount_money={"amount": _cents(total_aud), "currency": SQUARE_CURRENCY},
                order_id=square_order_id,
            )
        resp = await asyncio.to_thread(_call)
        payment = getattr(resp, "payment", None) or (resp.get("payment") if isinstance(resp, dict) else None)
        if payment:
            pid = payment.id if hasattr(payment, "id") else payment.get("id")
            status = payment.status if hasattr(payment, "status") else payment.get("status")
            return {"success": True, "payment_id": pid, "status": status}
        logger.warning("Square payment returned no payment: %s", resp)
        return {"success": False, "error": "no payment in response"}
    except Exception as e:
        err = _serialize_square_error(e)
        logger.exception("Square payment exception: %s", err)
        return {"success": False, "error": err}


async def sync_order_async(order_id: str, order_doc: dict, max_retries: int = 3):
    """Background task: push to Square + optional payment + persist IDs."""
    from server import db
    last_err = None
    for attempt in range(max_retries):
        res = await push_order_to_square(order_doc)
        if res["success"]:
            update = {
                "square_order_id": res["square_order_id"],
                "square_synced_at": datetime.now(timezone.utc).isoformat(),
            }
            if order_doc.get("payment_method") == "square_mock":
                pay = await create_sandbox_payment(res["square_order_id"], order_doc.get("total", 0))
                if pay.get("success"):
                    update["square_payment_id"] = pay.get("payment_id")
                elif pay.get("skipped"):
                    # Production — staff will tap through payment on the tablet.
                    update["square_payment_status"] = "awaiting_pos"
                else:
                    update["square_payment_error"] = str(pay.get("error"))[:500]
            await db.orders.update_one({"id": order_id}, {"$set": update})
            return
        last_err = res.get("error")
        await asyncio.sleep(2 * (attempt + 1))
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {
            "square_sync_error": (last_err or "unknown")[:2000],
            "square_sync_failed_at": datetime.now(timezone.utc).isoformat(),
        }},
    )
    logger.error("Square sync gave up for order %s: %s", order_id, last_err)
