from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone
from typing import Optional

from models import CreateOrderRequest, Order
from auth_utils import get_optional_user, get_current_user

router = APIRouter(prefix="/api/orders", tags=["orders"])


def _calc_loyalty_tier(points: int) -> str:
    if points >= 2000:
        return "Gold"
    if points >= 800:
        return "Silver"
    return "Bronze"


@router.post("")
async def create_order(payload: CreateOrderRequest, user: Optional[dict] = Depends(get_optional_user)):
    from server import db
    if not payload.items:
        raise HTTPException(status_code=400, detail="Cart is empty")
    subtotal = round(sum(i.line_total for i in payload.items), 2)
    discount = 0.0
    total = round(subtotal - discount, 2)
    order = Order(
        user_id=user["id"] if user else None,
        items=payload.items,
        subtotal=subtotal,
        discount=discount,
        total=total,
        pickup_time=payload.pickup_time,
        customer_name=payload.customer_name,
        customer_phone=payload.customer_phone,
        notes=payload.notes,
        payment_method=payload.payment_method,
        payment_status="paid" if payload.payment_method == "square_mock" else "unpaid",
    )
    doc = order.model_dump()
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.orders.insert_one(doc)

    # Loyalty: 10 pts per dollar spent
    if user:
        earned = int(total * 10)
        new_pts = user.get("loyalty_points", 0) + earned
        new_tier = _calc_loyalty_tier(new_pts)
        await db.users.update_one(
            {"id": user["id"]},
            {"$set": {"loyalty_points": new_pts, "loyalty_tier": new_tier}}
        )
        doc["points_earned"] = earned

    doc.pop("_id", None)
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
