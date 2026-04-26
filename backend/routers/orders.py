from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from datetime import datetime, timezone
from typing import Optional

from models import CreateOrderRequest, Order
from auth_utils import get_optional_user, get_current_user
from services.uber import create_delivery
from services.notifications import (
    send_email,
    send_sms,
    format_au_phone,
    order_confirmation_email_html,
    order_ready_sms,
)
from services.square_pos import sync_order_async, is_configured as square_configured, _ensure_rfc3339
from services.loyalty import sync_account_for_order, square_configured as loyalty_configured
from services.push import send_to_user as push_send_to_user

router = APIRouter(prefix="/api/orders", tags=["orders"])


def _calc_loyalty_tier(points: int) -> str:
    if points >= 2000:
        return "Gold"
    if points >= 800:
        return "Silver"
    return "Bronze"


@router.post("")
async def create_order(
    payload: CreateOrderRequest,
    bg: BackgroundTasks,
    user: Optional[dict] = Depends(get_optional_user),
):
    from server import db
    if not payload.items:
        raise HTTPException(status_code=400, detail="Cart is empty")
    # Coerce non-ISO literals like 'ASAP' to a real RFC3339 timestamp so every
    # downstream consumer (Square push, email formatter, DB) gets a consistent
    # value.
    pickup_time_iso = _ensure_rfc3339(payload.pickup_time or "")
    subtotal = round(sum(i.line_total for i in payload.items), 2)
    delivery_fee = round(payload.delivery_fee, 2) if payload.fulfillment == "delivery" else 0.0
    discount = 0.0
    total = round(subtotal + delivery_fee - discount, 2)

    order = Order(
        user_id=user["id"] if user else None,
        items=payload.items,
        subtotal=subtotal,
        discount=discount,
        delivery_fee=delivery_fee,
        total=total,
        pickup_time=pickup_time_iso,
        customer_name=payload.customer_name,
        customer_phone=payload.customer_phone,
        customer_email=payload.customer_email,
        notes=payload.notes,
        payment_method=payload.payment_method,
        payment_status="paid" if payload.payment_method == "square_mock" else "unpaid",
        fulfillment=payload.fulfillment,
        delivery_address=payload.delivery_address,
    )
    doc = order.model_dump()
    doc["created_at"] = datetime.now(timezone.utc).isoformat()

    if payload.fulfillment == "delivery" and payload.delivery_address:
        try:
            d = create_delivery(
                quote_id=payload.delivery_quote_id or "",
                dropoff_address=payload.delivery_address,
                dropoff_name=payload.customer_name,
                dropoff_phone=format_au_phone(payload.customer_phone) or payload.customer_phone,
                dropoff_notes=payload.delivery_notes or "",
                external_order_id=order.id,
                items=[i.model_dump() for i in payload.items],
            )
            doc["uber_delivery_id"] = d.get("id")
            doc["uber_tracking_url"] = d.get("tracking_url")
            doc["delivery_status"] = d.get("status", "pending")
        except Exception:
            doc["delivery_status"] = "dispatch_failed"

    await db.orders.insert_one(doc)

    points_earned = 0
    if user:
        # 1 point per AU$1 spent (matches Square Loyalty accrual rule).
        # Square's accumulate_points() will reconcile the official balance
        # asynchronously after the order syncs — this local cache exists
        # only so the receipt UI shows immediate feedback.
        points_earned = int(subtotal)
        new_pts = user.get("loyalty_points", 0) + points_earned
        new_tier = _calc_loyalty_tier(new_pts)
        await db.users.update_one(
            {"id": user["id"]},
            {"$set": {"loyalty_points": new_pts, "loyalty_tier": new_tier}}
        )

    if payload.customer_email:
        try:
            pickup_local = datetime.fromisoformat(pickup_time_iso.replace("Z", "+00:00")).strftime("%I:%M %p")
        except Exception:
            pickup_local = "soon"
        bg.add_task(
            send_email,
            payload.customer_email,
            f"Chaioz — order #{order.short_code} confirmed",
            order_confirmation_email_html(
                payload.customer_name,
                order.short_code,
                [i.model_dump() for i in payload.items],
                total,
                pickup_local,
            ),
        )

    if payload.customer_email:
        await db.abandoned_carts.update_one(
            {"key": payload.customer_email},
            {"$set": {"recovered_at": datetime.now(timezone.utc).isoformat()}},
        )

    # Push: order confirmation (only when we have a logged-in user with tokens)
    if user:
        try:
            pickup_local = datetime.fromisoformat(pickup_time_iso.replace("Z", "+00:00")).strftime("%I:%M %p").lstrip("0")
        except Exception:
            pickup_local = "soon"
        bg.add_task(
            push_send_to_user,
            user["id"],
            f"Order #{order.short_code} confirmed",
            f"We're brewing — pickup at {pickup_local}. Tap to track.",
            {"type": "order_confirmed", "order_id": order.id, "short_code": order.short_code},
        )

    # Push to Square POS → staff KDS (non-blocking). The wrapper also fires
    # the Square Loyalty accrual once the order has been pushed.
    if square_configured():
        async def _sync_then_loyalty(order_id: str, doc: dict, user_doc: dict | None):
            await sync_order_async(order_id, doc)
            if user_doc and loyalty_configured():
                # Re-read so we get the just-stored square_order_id
                from server import db as _db
                fresh = await _db.orders.find_one({"id": order_id}, {"_id": 0})
                if fresh and fresh.get("square_order_id"):
                    await sync_account_for_order(user_doc, fresh)

        bg.add_task(_sync_then_loyalty, order.id, doc, user)

    doc.pop("_id", None)
    doc["points_earned"] = points_earned
    return doc


@router.get("/me")
async def my_orders(user: dict = Depends(get_current_user)):
    from server import db
    orders = await db.orders.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return orders


import re

_SIZE_SUFFIX_RE = re.compile(
    r"\s*(?:\((Regular|Large|Small|Medium|Iced|Hot)\)|[-–—:]\s*(Regular|Large|Small|Medium|Iced|Hot))\s*$",
    flags=re.IGNORECASE,
)


def _normalise_item_name(name: str) -> str:
    """Strip size/variant suffix (e.g. ' (Regular)', ' - Large', ': Iced')."""
    if not name:
        return name
    prev = None
    out = name
    # Strip iteratively in case multiple suffixes were appended
    while prev != out:
        prev = out
        out = _SIZE_SUFFIX_RE.sub("", out).strip()
    return out


@router.get("/usual")
async def my_usual(user: dict = Depends(get_current_user)):
    """Returns the user's most-ordered item name (for 'Your usual?' prompt)."""
    from server import db
    orders = await db.orders.find({"user_id": user["id"]}, {"_id": 0, "items": 1}).to_list(200)
    counts: dict = {}
    for o in orders:
        for i in o.get("items", []):
            base = _normalise_item_name(i.get("name", ""))
            if not base:
                continue
            counts[base] = counts.get(base, 0) + i.get("qty", 1)
    if not counts:
        return {"has_usual": False}
    top_name = max(counts, key=counts.get)
    item = await db.menu_items.find_one(
        {"name": {"$regex": f"^{re.escape(top_name)}$", "$options": "i"}},
        {"_id": 0},
    )
    return {
        "has_usual": True,
        "item_name": top_name,
        "order_count": counts[top_name],
        "item": item,
    }


@router.post("/{order_id}/reorder")
async def reorder(order_id: str, bg: BackgroundTasks, user: dict = Depends(get_current_user)):
    """Clone a past order into a new one (1-click reorder)."""
    from server import db
    original = await db.orders.find_one({"id": order_id, "user_id": user["id"]}, {"_id": 0})
    if not original:
        raise HTTPException(status_code=404, detail="Order not found")

    # Build new order from original — guard against legacy docs that may be
    # missing required OrderLineItem/Order fields (e.g. 'price', 'line_total',
    # 'customer_name').
    try:
        items = [
            {**i, "notes": i.get("notes")}
            for i in original.get("items", [])
        ]
        new_order = Order(
            user_id=user["id"],
            items=items,
            subtotal=original.get("subtotal", 0.0),
            discount=0.0,
            delivery_fee=0.0,
            total=original.get("subtotal", 0.0),
            pickup_time=datetime.now(timezone.utc).isoformat(),
            customer_name=original.get("customer_name") or user.get("name", "Customer"),
            customer_phone=original.get("customer_phone") or "",
            customer_email=original.get("customer_email"),
            notes="Reorder of #" + original.get("short_code", ""),
            payment_method="square_mock",
            payment_status="paid",
            fulfillment="pickup",
        )
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Original order cannot be reordered: {e}")

    doc = new_order.model_dump()
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.orders.insert_one(doc)

    # 1 point per AU$1 spent (matches Square Loyalty rule). See note above.
    points_earned = int(new_order.subtotal)
    new_pts = user.get("loyalty_points", 0) + points_earned
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"loyalty_points": new_pts, "loyalty_tier": _calc_loyalty_tier(new_pts)}}
    )

    if square_configured():
        bg.add_task(sync_order_async, new_order.id, doc)

    doc.pop("_id", None)
    doc["points_earned"] = points_earned
    return doc


@router.get("/{order_id}")
async def get_order(order_id: str):
    from server import db
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order
