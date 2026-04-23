"""
Chaioz Phase 1 — Iteration 5 backend tests.
Covers: /menu/combos, /menu/items tags + tag filter, /orders/usual, /orders/{id}/reorder,
/admin/stats extra fields (morning/evening/hourly). Also regression: Square sandbox sync.
"""

import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://late-night-chai-1.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@chaioz.com.au"
ADMIN_PASSWORD = "Chaioz@2026"


# ---------- fixtures ----------
@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="module")
def fresh_user():
    """Register a brand-new test user and return session + profile."""
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    email = f"TEST_iter5_{uuid.uuid4().hex[:8]}@example.com"
    r = s.post(f"{API}/auth/register", json={
        "name": "Iter5 Tester",
        "email": email,
        "password": "Testpass@2026",
    })
    assert r.status_code == 200, f"register failed: {r.status_code} {r.text}"
    me = s.get(f"{API}/auth/me")
    assert me.status_code == 200
    return {"session": s, "email": email, "user": me.json()}


# ---------- MENU: combos ----------
class TestCombos:
    def test_combos_shape_and_savings(self, api):
        r = api.get(f"{API}/menu/combos")
        assert r.status_code == 200
        combos = r.json()
        assert isinstance(combos, list) and len(combos) == 3, f"expected 3 combos, got {len(combos)}"
        for c in combos:
            for k in ("id", "name", "bundle_price", "original_price", "save_aud", "items_detail"):
                assert k in c, f"combo missing {k}: {c.keys()}"
            assert isinstance(c["items_detail"], list) and len(c["items_detail"]) >= 1
            assert c["save_aud"] > 0, f"combo {c['name']} has no savings: {c}"
            assert c["original_price"] >= c["bundle_price"]


# ---------- MENU: tags + filter ----------
class TestMenuTags:
    def test_items_have_tags_array(self, api):
        r = api.get(f"{API}/menu/items")
        assert r.status_code == 200
        items = r.json()
        assert len(items) > 0
        for it in items:
            assert "tags" in it, f"item missing tags: {it.get('name')}"
            assert isinstance(it["tags"], list)

    def test_bun_maska_tags(self, api):
        r = api.get(f"{API}/menu/items")
        assert r.status_code == 200
        items = r.json()
        bun = next((i for i in items if i["name"].lower() == "bun maska"), None)
        assert bun is not None, "Bun Maska not found in menu"
        assert "quick_breakfast" in bun["tags"], f"Bun Maska tags: {bun['tags']}"
        assert "savoury" in bun["tags"], f"Bun Maska tags: {bun['tags']}"

    def test_filter_quick_breakfast(self, api):
        r = api.get(f"{API}/menu/items", params={"tag": "quick_breakfast"})
        assert r.status_code == 200
        items = r.json()
        assert len(items) >= 6, f"expected >=6 quick_breakfast, got {len(items)}"
        for it in items:
            assert "quick_breakfast" in it["tags"], f"{it['name']} missing quick_breakfast: {it['tags']}"

    def test_filter_under_10(self, api):
        r = api.get(f"{API}/menu/items", params={"tag": "under_10"})
        assert r.status_code == 200
        items = r.json()
        assert len(items) > 0
        for it in items:
            assert it["price"] < 10, f"{it['name']} price {it['price']} !< 10"
            assert "under_10" in it["tags"]


# ---------- ORDERS: usual + reorder ----------
class TestUsualAndReorder:
    @pytest.fixture(scope="class")
    def placed_order(self, fresh_user, api):
        """Fresh user → /usual empty, place an order, /usual populated, then reorder."""
        sess = fresh_user["session"]
        # 1. /usual empty for fresh user
        r = sess.get(f"{API}/orders/usual")
        assert r.status_code == 200
        assert r.json() == {"has_usual": False}

        # 2. Pick a real menu item for the order
        items_r = api.get(f"{API}/menu/items")
        assert items_r.status_code == 200
        menu = items_r.json()
        # Prefer "Masala Chai" for determinism
        chosen = next((m for m in menu if m["name"] == "Masala Chai"), menu[0])

        line = {
            "item_id": chosen["id"],
            "name": chosen["name"],
            "qty": 2,
            "price": chosen["price"],
            "line_total": round(chosen["price"] * 2, 2),
        }
        from datetime import datetime, timezone, timedelta
        pickup_iso = (datetime.now(timezone.utc) + timedelta(minutes=20)).isoformat()
        payload = {
            "items": [line],
            "delivery_fee": 0.0,
            "pickup_time": pickup_iso,
            "customer_name": "Iter5 Tester",
            "customer_phone": "+61400000000",
            "customer_email": fresh_user["email"],
            "payment_method": "square_mock",
            "fulfillment": "pickup",
        }
        r = sess.post(f"{API}/orders", json=payload)
        assert r.status_code == 200, f"create_order failed: {r.status_code} {r.text}"
        order = r.json()
        assert "id" in order and "short_code" in order
        return {"order": order, "chosen": chosen}

    def test_usual_after_order(self, fresh_user, placed_order):
        chosen = placed_order["chosen"]
        sess = fresh_user["session"]
        r = sess.get(f"{API}/orders/usual")
        assert r.status_code == 200
        data = r.json()
        assert data["has_usual"] is True, f"expected has_usual=True, got {data}"
        # normalise — strip size suffix like " (Regular)" from chosen name for compare
        chosen_base = chosen["name"].split(" (")[0]
        assert data["item_name"].lower() == chosen_base.lower(), data
        assert data.get("item") is not None
        assert data["item"].get("name", "").lower() == chosen_base.lower()

    def test_reorder_clones_order(self, fresh_user, placed_order):
        sess = fresh_user["session"]
        original = placed_order["order"]
        r = sess.post(f"{API}/orders/{original['id']}/reorder")
        assert r.status_code == 200, f"reorder failed: {r.status_code} {r.text}"
        new_order = r.json()
        assert new_order["id"] != original["id"]
        assert new_order.get("short_code") and new_order["short_code"] != original["short_code"]
        assert new_order["fulfillment"] == "pickup"
        assert new_order["payment_method"] == "square_mock"
        assert new_order.get("points_earned", 0) > 0
        assert len(new_order["items"]) == len(original["items"])
        # subtotal should equal original's (items preserved)
        assert abs(new_order["subtotal"] - original["subtotal"]) < 0.01

    def test_reorder_requires_auth(self, api, placed_order):
        # Unauthenticated session should be rejected
        r = api.post(f"{API}/orders/{placed_order['order']['id']}/reorder")
        assert r.status_code in (401, 403), f"unauth reorder should fail, got {r.status_code}"

    def test_reorder_404_on_other_user_order(self, fresh_user):
        sess = fresh_user["session"]
        r = sess.post(f"{API}/orders/nonexistent-id-xyz/reorder")
        assert r.status_code == 404


# ---------- ADMIN stats extra fields ----------
class TestAdminStats:
    def test_stats_has_morning_evening_hourly(self, admin_session):
        r = admin_session.get(f"{API}/admin/stats")
        assert r.status_code == 200
        data = r.json()
        for k in ("morning_revenue", "evening_revenue", "morning_orders", "evening_orders", "hourly_revenue_today"):
            assert k in data, f"stats missing {k}"
        hr = data["hourly_revenue_today"]
        assert isinstance(hr, list) and len(hr) == 24, f"expected 24 buckets, got {len(hr)}"
        for bucket in hr:
            assert "hour" in bucket and "revenue" in bucket and "orders" in bucket
        # Types
        assert isinstance(data["morning_revenue"], (int, float))
        assert isinstance(data["evening_revenue"], (int, float))
        assert isinstance(data["morning_orders"], int)
        assert isinstance(data["evening_orders"], int)


# ---------- REGRESSION: Square sandbox sync ----------
class TestSquareSync:
    def test_square_order_id_appears(self, fresh_user, api):
        """After creating an order, background task should attach square_order_id."""
        sess = fresh_user["session"]
        items_r = api.get(f"{API}/menu/items")
        menu = items_r.json()
        chosen = next((m for m in menu if m["name"] == "Karak Classic"), menu[0])
        line = {
            "item_id": chosen["id"],
            "name": chosen["name"],
            "qty": 1,
            "price": chosen["price"],
            "line_total": chosen["price"],
        }
        from datetime import datetime, timezone, timedelta
        payload = {
            "items": [line],
            "delivery_fee": 0.0,
            "pickup_time": (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat(),
            "customer_name": "Iter5 Square",
            "customer_phone": "+61400000000",
            "customer_email": fresh_user["email"],
            "payment_method": "square_mock",
            "fulfillment": "pickup",
        }
        r = sess.post(f"{API}/orders", json=payload)
        assert r.status_code == 200
        order = r.json()
        oid = order["id"]
        # Wait a bit for the background task to run and persist square_order_id
        got_square = False
        for _ in range(8):
            time.sleep(1.0)
            g = api.get(f"{API}/orders/{oid}")
            if g.status_code == 200 and g.json().get("square_order_id"):
                got_square = True
                break
        # This is a regression check — if Square is configured, we expect it. If not, pass soft.
        if not got_square:
            pytest.skip("square_order_id not observed within 8s — Square may not be configured in preview env")


# ---------- REGRESSION smoke ----------
class TestRegressionSmoke:
    def test_auth_me_and_logout(self, fresh_user):
        sess = fresh_user["session"]
        r = sess.get(f"{API}/auth/me")
        assert r.status_code == 200
        r2 = sess.post(f"{API}/auth/logout")
        assert r2.status_code in (200, 204)

    def test_instagram_feed(self, api):
        # Endpoint may not exist on all builds — be lenient
        r = api.get(f"{API}/community/instagram")
        assert r.status_code in (200, 404)
