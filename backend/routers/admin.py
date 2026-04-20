from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from datetime import datetime, timezone, timedelta
import uuid

from auth_utils import get_current_admin
from services.notifications import send_sms, format_au_phone, order_ready_sms

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/stats")
async def stats(_: dict = Depends(get_current_admin)):
    from server import db
    now = datetime.now(timezone.utc)
    today_start = datetime(now.year, now.month, now.day, tzinfo=timezone.utc).isoformat()
    week_start = (now - timedelta(days=7)).isoformat()
    thirty_start = (now - timedelta(days=30)).isoformat()

    today_orders = await db.orders.find({"created_at": {"$gte": today_start}}, {"_id": 0}).to_list(2000)
    week_orders = await db.orders.find({"created_at": {"$gte": week_start}}, {"_id": 0}).to_list(5000)
    month_orders = await db.orders.find({"created_at": {"$gte": thirty_start}}, {"_id": 0}).to_list(20000)

    today_rev = round(sum(o.get("total", 0) for o in today_orders), 2)
    week_rev = round(sum(o.get("total", 0) for o in week_orders), 2)
    month_rev = round(sum(o.get("total", 0) for o in month_orders), 2)
    aov = round((week_rev / len(week_orders)), 2) if week_orders else 0.0

    user_ids = [o.get("user_id") for o in month_orders if o.get("user_id")]
    unique_users = len(set(user_ids)) or 1
    repeat_users = sum(1 for u in set(user_ids) if user_ids.count(u) > 1)
    repeat_rate = round((repeat_users / unique_users) * 100, 1) if user_ids else 0.0

    daily = {}
    for o in month_orders:
        try:
            d = o["created_at"][:10]
            daily[d] = daily.get(d, 0) + o.get("total", 0)
        except Exception:
            continue
    series = []
    for i in range(13, -1, -1):
        d = (now - timedelta(days=i)).strftime("%Y-%m-%d")
        series.append({"date": d, "revenue": round(daily.get(d, 0), 2)})

    return {
        "today_revenue": today_rev,
        "today_orders": len(today_orders),
        "week_revenue": week_rev,
        "month_revenue": month_rev,
        "aov": aov,
        "repeat_customer_rate": repeat_rate,
        "daily_revenue_14d": series,
    }


@router.get("/orders")
async def list_orders(_: dict = Depends(get_current_admin)):
    from server import db
    return await db.orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)


@router.put("/orders/{order_id}/status")
async def update_order_status(
    order_id: str,
    payload: dict,
    bg: BackgroundTasks,
    _: dict = Depends(get_current_admin),
):
    from server import db
    status = payload.get("status")
    if status not in ("pending", "confirmed", "preparing", "ready", "completed", "cancelled"):
        raise HTTPException(status_code=400, detail="Invalid status")
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    await db.orders.update_one({"id": order_id}, {"$set": {"status": status}})

    # Notify customer when order is ready
    if status == "ready" and order.get("customer_phone"):
        phone = format_au_phone(order["customer_phone"])
        if phone:
            bg.add_task(send_sms, phone, order_ready_sms(order.get("short_code", ""), order.get("customer_name", "")))
    return {"ok": True}


# ---------- Menu CRUD ----------
@router.get("/menu")
async def list_menu_admin(_: dict = Depends(get_current_admin)):
    from server import db
    return await db.menu_items.find({}, {"_id": 0}).sort("sort_order", 1).to_list(2000)


@router.post("/menu")
async def create_menu_item(payload: dict, _: dict = Depends(get_current_admin)):
    from server import db
    if not payload.get("name") or payload.get("price") is None or not payload.get("category"):
        raise HTTPException(status_code=400, detail="name, price, category required")
    doc = {
        "id": str(uuid.uuid4()),
        "name": payload["name"],
        "description": payload.get("description", ""),
        "price": float(payload["price"]),
        "category": payload["category"],
        "subcategory": payload.get("subcategory"),
        "image": payload.get("image"),
        "calories": payload.get("calories"),
        "sizes": payload.get("sizes", []),
        "addons": payload.get("addons", []),
        "is_bestseller": bool(payload.get("is_bestseller", False)),
        "is_vegan": bool(payload.get("is_vegan", False)),
        "is_available": True,
        "sort_order": int(payload.get("sort_order", 999)),
    }
    await db.menu_items.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.put("/menu/{item_id}")
async def update_menu(item_id: str, payload: dict, _: dict = Depends(get_current_admin)):
    from server import db
    payload.pop("_id", None)
    payload.pop("id", None)
    # Cast numeric fields
    if "price" in payload and payload["price"] is not None:
        payload["price"] = float(payload["price"])
    res = await db.menu_items.update_one({"id": item_id}, {"$set": payload})
    if not res.matched_count:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"ok": True}


@router.delete("/menu/{item_id}")
async def delete_menu(item_id: str, _: dict = Depends(get_current_admin)):
    from server import db
    res = await db.menu_items.delete_one({"id": item_id})
    if not res.deleted_count:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"ok": True}


# ---------- Products ----------
@router.get("/products")
async def list_products_admin(_: dict = Depends(get_current_admin)):
    from server import db
    return await db.products.find({}, {"_id": 0}).sort("sort_order", 1).to_list(500)


@router.put("/products/{product_id}")
async def update_product(product_id: str, payload: dict, _: dict = Depends(get_current_admin)):
    from server import db
    payload.pop("_id", None)
    payload.pop("id", None)
    res = await db.products.update_one({"id": product_id}, {"$set": payload})
    if not res.matched_count:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"ok": True}
