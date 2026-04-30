from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo
import uuid

from auth_utils import get_current_admin
from services.notifications import send_sms, format_au_phone, order_ready_sms
from services.square_catalog import sync_menu_availability
from services.push import send_to_user as push_send_to_user, broadcast as push_broadcast

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
    if status == "ready" and order.get("user_id"):
        bg.add_task(
            push_send_to_user,
            order["user_id"],
            "Your chai is ready 🫖",
            f"Order #{order.get('short_code', '')} — come pick it up.",
            {"type": "order_ready", "order_id": order_id, "short_code": order.get("short_code", "")},
        )
    return {"ok": True}


# ---------- Marketing broadcast (push) ----------
@router.post("/broadcast/push")
async def broadcast_push(payload: dict, _: dict = Depends(get_current_admin)):
    """Send a push notification to every registered device. Use sparingly —
    Apple/Google flag spammy senders. Recommended cadence: <= 2/week."""
    title = (payload.get("title") or "").strip()
    body = (payload.get("body") or "").strip()
    audience = (payload.get("audience") or "all").lower()
    if audience not in ("all", "opted_in"):
        raise HTTPException(status_code=400, detail="audience must be 'all' or 'opted_in'")
    if not title or not body:
        raise HTTPException(status_code=400, detail="title and body required")
    if len(title) > 80 or len(body) > 200:
        raise HTTPException(status_code=400, detail="title<=80, body<=200")
    res = await push_broadcast(
        title,
        body,
        {"type": "marketing", "campaign": payload.get("campaign", "manual")},
        audience=audience,
    )
    return {**res, "audience": audience}


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
        "image_url": payload.get("image_url") or "",
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
    doc = await db.combos.find_one({"id": combo_id}, {"_id": 0})
    return doc


# ---------- Settings (operational toggles) ----------
@router.get("/settings")
async def get_settings(_: dict = Depends(get_current_admin)):
    """Operational toggles — pickup_only, soft_launch banner, etc."""
    from server import db
    doc = await db.settings.find_one({"key": "global"}, {"_id": 0}) or {}
    doc.pop("key", None)
    return {
        "pickup_only": bool(doc.get("pickup_only", False)),
        "soft_launch_banner": doc.get("soft_launch_banner", "") or "",
    }


@router.put("/settings")
async def update_settings(payload: dict, _: dict = Depends(get_current_admin)):
    from server import db
    update = {}
    if "pickup_only" in payload:
        update["pickup_only"] = bool(payload["pickup_only"])
    if "soft_launch_banner" in payload:
        update["soft_launch_banner"] = (payload["soft_launch_banner"] or "")[:280]
    if not update:
        raise HTTPException(status_code=400, detail="No supported settings in payload")
    await db.settings.update_one({"key": "global"}, {"$set": update}, upsert=True)
    return await get_settings(_)


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


@router.post("/products")
async def create_product(payload: dict, _: dict = Depends(get_current_admin)):
    from server import db
    if not payload.get("name") or payload.get("price") is None or not payload.get("category"):
        raise HTTPException(status_code=400, detail="name, price, category required")
    doc = {
        "id": str(uuid.uuid4()),
        "name": payload["name"],
        "description": payload.get("description", ""),
        "price": float(payload["price"]),
        "category": payload["category"],
        "image": payload.get("image"),
        "stock": int(payload.get("stock", 100)),
        "is_subscription": bool(payload.get("is_subscription", False)),
        "sort_order": int(payload.get("sort_order", 999)),
    }
    await db.products.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.put("/products/{product_id}")
async def update_product(product_id: str, payload: dict, _: dict = Depends(get_current_admin)):
    from server import db
    payload.pop("_id", None)
    payload.pop("id", None)
    if "price" in payload and payload["price"] is not None:
        payload["price"] = float(payload["price"])
    if "stock" in payload and payload["stock"] is not None:
        payload["stock"] = int(payload["stock"])
    res = await db.products.update_one({"id": product_id}, {"$set": payload})
    if not res.matched_count:
        raise HTTPException(status_code=404, detail="Product not found")
    doc = await db.products.find_one({"id": product_id}, {"_id": 0})
    return doc


@router.delete("/products/{product_id}")
async def delete_product(product_id: str, _: dict = Depends(get_current_admin)):
    from server import db
    res = await db.products.delete_one({"id": product_id})
    if not res.deleted_count:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"ok": True}


# ---------- Square sync (POS → website) ----------
@router.post("/sync/square-menu")
async def sync_square_menu(_: dict = Depends(get_current_admin)):
    """Pull live availability from Square's catalog and reflect it on the
    website's menu. Admins hit this when staff have toggled an item to
    'unavailable' on the Square tablet — or it can be triggered automatically
    by the Square `catalog.version.updated` webhook."""
    res = await sync_menu_availability()
    if not res.get("success"):
        raise HTTPException(status_code=502, detail=res.get("error", "Square error"))
    return res



# ---------- User management (CRUD) ---------------------------------------------
def _public_user_admin(u: dict) -> dict:
    """Admin-facing user shape — never includes the password hash."""
    return {
        "id": u.get("id"),
        "name": u.get("name"),
        "email": u.get("email"),
        "phone": u.get("phone"),
        "role": u.get("role", "customer"),
        "loyalty_points": u.get("loyalty_points", 0),
        "loyalty_tier": u.get("loyalty_tier", "Bronze"),
        "marketing_opt_in": bool(u.get("marketing_opt_in", False)),
        "verified_via": u.get("verified_via"),
        "created_at": u.get("created_at"),
        "last_login_at": u.get("last_login_at"),
    }


@router.get("/users")
async def list_users(
    q: str | None = None,
    role: str | None = None,
    limit: int = 100,
    skip: int = 0,
    _: dict = Depends(get_current_admin),
):
    """Search users by name/email/phone with pagination."""
    from server import db
    filt: dict = {}
    if role:
        filt["role"] = role
    if q:
        # Case-insensitive partial match on the most useful fields.
        import re
        rex = re.escape(q.strip())
        filt["$or"] = [
            {"email": {"$regex": rex, "$options": "i"}},
            {"name": {"$regex": rex, "$options": "i"}},
            {"phone": {"$regex": rex, "$options": "i"}},
        ]
    total = await db.users.count_documents(filt)
    cursor = db.users.find(filt, {"_id": 0, "password_hash": 0}).sort("created_at", -1).skip(max(0, skip)).limit(min(max(1, limit), 500))
    docs = await cursor.to_list(length=limit)
    return {"total": total, "items": [_public_user_admin(u) for u in docs]}


@router.post("/users")
async def admin_create_user(payload: dict, _: dict = Depends(get_current_admin)):
    """Create a user without going through the OTP flow. Useful for staff
    accounts and for support-led sign-ups when email delivery is broken."""
    from server import db
    from auth_utils import hash_password
    name = (payload.get("name") or "").strip()
    email = (payload.get("email") or "").strip().lower()
    password = payload.get("password") or ""
    role = payload.get("role") or "customer"
    phone = payload.get("phone")

    if not name or not email or not password:
        raise HTTPException(status_code=400, detail="name, email, password are required")
    if role not in ("customer", "admin"):
        raise HTTPException(status_code=400, detail="role must be 'customer' or 'admin'")
    if len(password) < 8 or not any(c.isalpha() for c in password) or not any(c.isdigit() for c in password):
        raise HTTPException(status_code=400, detail="Password must be 8+ chars, include a letter and a digit")
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")

    doc = {
        "id": str(uuid.uuid4()),
        "name": name,
        "email": email,
        "phone": phone,
        "password_hash": hash_password(password),
        "role": role,
        "loyalty_points": 0,
        "loyalty_tier": "Bronze",
        "favorites": [],
        "verified_via": "admin_created",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(doc)
    return _public_user_admin(doc)


@router.patch("/users/{user_id}")
async def admin_update_user(user_id: str, payload: dict, admin: dict = Depends(get_current_admin)):
    """Update name, phone, role, or marketing_opt_in. Email and password
    have dedicated endpoints (see /password and you can't change email here
    without breaking auth flows)."""
    from server import db
    update: dict = {}
    if "name" in payload:
        name = (payload.get("name") or "").strip()
        if len(name) < 2:
            raise HTTPException(status_code=400, detail="Name must be at least 2 characters")
        update["name"] = name
    if "phone" in payload:
        update["phone"] = payload.get("phone") or None
    if "role" in payload:
        if payload["role"] not in ("customer", "admin"):
            raise HTTPException(status_code=400, detail="role must be 'customer' or 'admin'")
        # Guard: don't let an admin demote themselves and orphan the system.
        if user_id == admin["id"] and payload["role"] != "admin":
            raise HTTPException(status_code=400, detail="You can't demote your own admin account")
        update["role"] = payload["role"]
    if "loyalty_points" in payload:
        update["loyalty_points"] = max(0, int(payload["loyalty_points"]))
    if "marketing_opt_in" in payload:
        update["marketing_opt_in"] = bool(payload["marketing_opt_in"])

    if not update:
        raise HTTPException(status_code=400, detail="No supported fields in payload")

    res = await db.users.update_one({"id": user_id}, {"$set": update})
    if not res.matched_count:
        raise HTTPException(status_code=404, detail="User not found")
    fresh = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    return _public_user_admin(fresh)


@router.post("/users/{user_id}/reset-password")
async def admin_reset_password(user_id: str, payload: dict, _: dict = Depends(get_current_admin)):
    """Force-set a user's password (admin override — no current-pw check).
    Returns ok:true. Caller should communicate the new password out-of-band."""
    from server import db
    from auth_utils import hash_password
    new_password = (payload.get("new_password") or "").strip()
    if len(new_password) < 8 or not any(c.isalpha() for c in new_password) or not any(c.isdigit() for c in new_password):
        raise HTTPException(status_code=400, detail="Password must be 8+ chars, include a letter and a digit")

    res = await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "password_hash": hash_password(new_password),
            "password_changed_at": datetime.now(timezone.utc).isoformat(),
        }},
    )
    if not res.matched_count:
        raise HTTPException(status_code=404, detail="User not found")
    return {"ok": True}


@router.delete("/users/{user_id}")
async def admin_delete_user(user_id: str, admin: dict = Depends(get_current_admin)):
    from server import db
    if user_id == admin["id"]:
        raise HTTPException(status_code=400, detail="You can't delete your own account")
    res = await db.users.delete_one({"id": user_id})
    if not res.deleted_count:
        raise HTTPException(status_code=404, detail="User not found")
    return {"ok": True}


# ---------- Email delivery diagnostics -----------------------------------------
@router.get("/email/status")
async def email_status(_: dict = Depends(get_current_admin)):
    """Surface the current Resend config + restrictions so the operator can
    see at a glance why customer emails aren't delivering."""
    import os
    sender = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")
    has_key = bool(os.environ.get("RESEND_API_KEY"))
    using_sandbox = sender.endswith("@resend.dev")
    return {
        "has_resend_key": has_key,
        "sender_email": sender,
        "using_sandbox_sender": using_sandbox,
        "delivers_to_anyone": has_key and not using_sandbox,
        "fix_steps": [
            "Verify chaioz.com.au at https://resend.com/domains (add the DNS records to Cloudflare).",
            "Once verified, set SENDER_EMAIL=orders@chaioz.com.au in the production env.",
            "Restart the backend — customer OTPs will then deliver to any email.",
        ] if using_sandbox else [],
    }


@router.post("/email/test")
async def email_test(payload: dict, _: dict = Depends(get_current_admin)):
    """Send a one-off test email to confirm Resend is delivering. Body must
    include {"to": "..."}; falls back to admin's own email if missing."""
    from services.notifications import send_email
    to = (payload.get("to") or "").strip()
    if not to:
        raise HTTPException(status_code=400, detail="`to` is required")
    html = """
    <div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:480px;margin:auto;background:#0F4C4A;color:#FDFBF7;padding:32px;border-radius:16px">
      <h1 style="font-family:Georgia,serif;color:#E8A84A;margin:0 0 12px;font-size:24px">Test email from Chaioz</h1>
      <p style="color:rgba(253,251,247,0.85);margin:0">If you can read this, Resend is delivering correctly to recipients beyond the verified admin email. 🎉</p>
    </div>"""
    result = await send_email(to, "Chaioz delivery test", html)
    return result
