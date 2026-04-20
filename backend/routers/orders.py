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
        pickup_time=payload.pickup_time,
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

    # Delivery dispatch
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
            # Don't fail the order if dispatch fails — mark and let admin recover
            doc["delivery_status"] = "dispatch_failed"

    await db.orders.insert_one(doc)

    # Loyalty accrual (only on subtotal — not delivery fee)
    points_earned = 0
    if user:
        points_earned = int(subtotal * 10)
        new_pts = user.get("loyalty_points", 0) + points_earned
        new_tier = _calc_loyalty_tier(new_pts)
        await db.users.update_one(
            {"id": user["id"]},
            {"$set": {"loyalty_points": new_pts, "loyalty_tier": new_tier}}
        )

    # Confirmation email (async)
    if payload.customer_email:
        pickup_local = datetime.fromisoformat(payload.pickup_time.replace("Z", "+00:00")).strftime("%I:%M %p")
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
    # Mark any abandoned cart for this user as recovered
    if payload.customer_email:
        await db.abandoned_carts.update_one(
            {"key": payload.customer_email},
            {"$set": {"recovered_at": datetime.now(timezone.utc).isoformat()}},
        )

    doc.pop("_id", None)
    doc["points_earned"] = points_earned
    return doc


@router.get("/me")
async def my_orders(user: dict = Depends(get_current_user)):
    from server import db
    orders = await db.orders.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return orders


@router.get("/{order_id}")
async def get_order(order_id: str):
    from server import db
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order
