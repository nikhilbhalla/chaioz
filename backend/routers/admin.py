from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo
import uuid

from auth_utils import get_current_admin
from services.notifications import send_sms, format_au_phone, order_ready_sms

router = APIRouter(prefix="/api/admin", tags=["admin"])

ADELAIDE_TZ = ZoneInfo("Australia/Adelaide")


def _local_hour(created_at: str) -> int:
    """Parse an ISO timestamp and return the Adelaide local hour (DST-aware)."""
    dt_utc = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
    if dt_utc.tzinfo is None:
        dt_utc = dt_utc.replace(tzinfo=timezone.utc)
    return dt_utc.astimezone(ADELAIDE_TZ).hour


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

    # ----- Daily revenue (last 14 days) -----
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

    # ----- Morning vs Evening split (last 30d, Adelaide local time — DST-aware) -----
    # Morning: 5am–2pm local. Evening: 2pm–late.
    morning_rev = 0.0
    evening_rev = 0.0
    morning_orders = 0
    evening_orders = 0
    for o in month_orders:
        try:
            local_hour = _local_hour(o["created_at"])
            total = o.get("total", 0)
            if 5 <= local_hour < 14:
                morning_rev += total
                morning_orders += 1
            else:
                evening_rev += total
                evening_orders += 1
        except Exception:
            continue

    # ----- Hourly revenue TODAY (Adelaide local hours 0-23, DST-aware) -----
    hourly_today = [0.0] * 24
    hourly_today_orders = [0] * 24
    for o in today_orders:
        try:
            local_hour = _local_hour(o["created_at"])
            hourly_today[local_hour] += o.get("total", 0)
            hourly_today_orders[local_hour] += 1
        except Exception:
            continue
    hourly_series = [
        {"hour": f"{h:02d}:00", "revenue": round(hourly_today[h], 2), "orders": hourly_today_orders[h]}
        for h in range(24)
    ]

    return {
        "today_revenue": today_rev,
        "today_orders": len(today_orders),
        "week_revenue": week_rev,
        "month_revenue": month_rev,
        "aov": aov,
        "repeat_customer_rate": repeat_rate,
        "daily_revenue_14d": series,
        "morning_revenue": round(morning_rev, 2),
        "evening_revenue": round(evening_rev, 2),
        "morning_orders": morning_orders,
        "evening_orders": evening_orders,
        "hourly_revenue_today": hourly_series,
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
        "tags": [t for t in (payload.get("tags") or []) if isinstance(t, str) and t],
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


# ---------- Combos ----------
@router.get("/combos")
async def list_combos_admin(_: dict = Depends(get_current_admin)):
    from server import db
    return await db.combos.find({}, {"_id": 0}).sort("sort_order", 1).to_list(100)


@router.post("/combos")
async def create_combo(payload: dict, _: dict = Depends(get_current_admin)):
    from server import db
    if not payload.get("name") or not payload.get("items") or payload.get("bundle_price") is None:
        raise HTTPException(status_code=400, detail="name, items, bundle_price required")
    doc = {
        "id": payload.get("id") or str(uuid.uuid4()),
        "name": payload["name"],
        "tagline": payload.get("tagline", ""),
        "items": list(payload["items"]),
        "bundle_price": float(payload["bundle_price"]),
        "badge": payload.get("badge", ""),
        "icon": payload.get("icon", "sparkles"),
        "is_active": bool(payload.get("is_active", True)),
        "sort_order": int(payload.get("sort_order", 999)),
    }
    await db.combos.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.put("/combos/{combo_id}")
async def update_combo(combo_id: str, payload: dict, _: dict = Depends(get_current_admin)):
    from server import db
    payload.pop("_id", None)
    payload.pop("id", None)
    if "bundle_price" in payload and payload["bundle_price"] is not None:
        payload["bundle_price"] = float(payload["bundle_price"])
    res = await db.combos.update_one({"id": combo_id}, {"$set": payload})
    if not res.matched_count:
        raise HTTPException(status_code=404, detail="Combo not found")
    return {"ok": True}


@router.delete("/combos/{combo_id}")
async def delete_combo(combo_id: str, _: dict = Depends(get_current_admin)):
    from server import db
    res = await db.combos.delete_one({"id": combo_id})
    if not res.deleted_count:
        raise HTTPException(status_code=404, detail="Combo not found")
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
