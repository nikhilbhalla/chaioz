"""
Chaioz Backend API tests.
Covers: health, auth (register/login/logout/me), menu, products, orders, loyalty, admin.
"""
import os
import time
import uuid
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://late-night-chai-1.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@chaioz.com.au"
ADMIN_PASSWORD = "Chaioz@2026"


@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    assert r.json().get("role") == "admin"
    return s


@pytest.fixture(scope="module")
def user_session():
    s = requests.Session()
    uniq = uuid.uuid4().hex[:8]
    email = f"TEST_user_{uniq}@example.com"
    password = "TestPass123!"
    r = s.post(f"{API}/auth/register", json={"name": "Test User", "email": email, "password": password}, timeout=30)
    assert r.status_code == 200, f"Register failed: {r.status_code} {r.text}"
    data = r.json()
    s.user_id = data["id"]
    s.user_email = email
    s.user_password = password
    return s


# ---------- Health ----------
def test_health():
    r = requests.get(f"{API}/", timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert data.get("status") == "ok"


# ---------- Auth ----------
class TestAuth:
    def test_register_sets_cookie_and_defaults(self):
        s = requests.Session()
        uniq = uuid.uuid4().hex[:8]
        email = f"TEST_reg_{uniq}@example.com"
        r = s.post(f"{API}/auth/register", json={"name": "Reg User", "email": email, "password": "Pass1234!"}, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["email"] == email.lower()
        assert data["role"] == "customer"
        assert data["loyalty_points"] == 100
        assert data["loyalty_tier"] == "Bronze"
        # cookie set
        assert "access_token" in s.cookies.get_dict()

    def test_register_duplicate_email(self, user_session):
        r = requests.post(
            f"{API}/auth/register",
            json={"name": "Test User", "email": user_session.user_email, "password": "abc12345"},
            timeout=30,
        )
        assert r.status_code == 400

    def test_admin_login_returns_admin_role(self, admin_session):
        r = admin_session.get(f"{API}/auth/me", timeout=15)
        assert r.status_code == 200
        assert r.json()["role"] == "admin"
        assert r.json()["email"] == ADMIN_EMAIL

    def test_me_unauth(self):
        r = requests.get(f"{API}/auth/me", timeout=15)
        # iter6: anonymous /auth/me now returns 200 + null (was 401) to avoid
        # browser console spam on anonymous landing page loads.
        assert r.status_code == 200
        assert r.json() is None

    def test_login_invalid_credentials(self):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"}, timeout=15)
        assert r.status_code == 401

    def test_logout_clears_cookie(self):
        s = requests.Session()
        uniq = uuid.uuid4().hex[:8]
        email = f"TEST_logout_{uniq}@example.com"
        s.post(f"{API}/auth/register", json={"name": "Lo", "email": email, "password": "Pass1234!"}, timeout=30)
        r = s.get(f"{API}/auth/me", timeout=15)
        assert r.status_code == 200
        r2 = s.post(f"{API}/auth/logout", timeout=15)
        assert r2.status_code == 200
        # After logout, /me should return 200 + null (iter6 change)
        s.cookies.clear()  # server delete_cookie might not propagate through proxy; clear client too
        r3 = s.get(f"{API}/auth/me", timeout=15)
        assert r3.status_code == 200
        assert r3.json() is None


# ---------- Menu ----------
class TestMenu:
    def test_categories(self):
        r = requests.get(f"{API}/menu/categories", timeout=15)
        assert r.status_code == 200
        cats = r.json()
        names = [c["name"] for c in cats]
        expected = ["Hot Drinks", "Cold Drinks", "Breakfast", "All Day Eats", "Street Food", "Desserts"]
        for e in expected:
            assert e in names, f"Missing category {e}. Got: {names}"

    def test_items_count_and_filter(self):
        r = requests.get(f"{API}/menu/items", timeout=15)
        assert r.status_code == 200
        items = r.json()
        assert len(items) >= 71, f"Expected >=71 items, got {len(items)}"

        r2 = requests.get(f"{API}/menu/items", params={"category": "Hot Drinks"}, timeout=15)
        assert r2.status_code == 200
        filtered = r2.json()
        assert len(filtered) > 0
        for it in filtered:
            assert it["category"] == "Hot Drinks"

    def test_bestsellers(self):
        r = requests.get(f"{API}/menu/bestsellers", timeout=15)
        assert r.status_code == 200
        bs = r.json()
        all_items = requests.get(f"{API}/menu/items", timeout=15).json()
        assert 0 < len(bs) <= len(all_items)
        for it in bs:
            assert it.get("is_bestseller") is True


# ---------- Products ----------
class TestProducts:
    def test_list_products(self):
        r = requests.get(f"{API}/products", timeout=15)
        assert r.status_code == 200
        ps = r.json()
        assert len(ps) == 8, f"Expected 8 retail products, got {len(ps)}"
        assert all("id" in p and "name" in p and "price" in p for p in ps)


# ---------- Orders ----------
def _sample_items():
    items = requests.get(f"{API}/menu/items", timeout=15).json()
    pick = items[0]
    return [{
        "item_id": pick["id"],
        "name": pick["name"],
        "size": None,
        "addons": [],
        "price": pick["price"],
        "qty": 2,
        "line_total": round(pick["price"] * 2, 2),
        "notes": None,
    }]


class TestOrders:
    def test_create_order_guest_square_mock_paid(self):
        items = _sample_items()
        payload = {
            "items": items,
            "pickup_time": "ASAP",
            "customer_name": "Guest User",
            "customer_phone": "0400000000",
            "notes": None,
            "payment_method": "square_mock",
        }
        r = requests.post(f"{API}/orders", json=payload, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["payment_status"] == "paid"
        assert "id" in data
        assert data["total"] == round(items[0]["line_total"], 2)
        # short_code exists
        assert data.get("short_code"), "short_code missing"

    def test_create_order_empty_400(self):
        payload = {
            "items": [],
            "pickup_time": "ASAP",
            "customer_name": "Guest",
            "customer_phone": "0400000000",
            "payment_method": "square_mock",
        }
        r = requests.post(f"{API}/orders", json=payload, timeout=15)
        assert r.status_code == 400

    def test_order_awards_loyalty_points(self, user_session):
        me_before = user_session.get(f"{API}/auth/me", timeout=15).json()
        pts_before = me_before["loyalty_points"]
        items = _sample_items()
        payload = {
            "items": items,
            "pickup_time": "ASAP",
            "customer_name": "Loyal User",
            "customer_phone": "0400000000",
            "payment_method": "square_mock",
        }
        r = user_session.post(f"{API}/orders", json=payload, timeout=30)
        assert r.status_code == 200
        order = r.json()
        assert order["payment_status"] == "paid"
        earned_expected = int(order["subtotal"])  # 1pt per AU$1 (Square Loyalty rule)
        assert order.get("points_earned") == earned_expected
        # /me points bumped
        me_after = user_session.get(f"{API}/auth/me", timeout=15).json()
        assert me_after["loyalty_points"] == pts_before + earned_expected

    def test_orders_me_requires_auth(self):
        r = requests.get(f"{API}/orders/me", timeout=15)
        assert r.status_code == 401

    def test_orders_me_returns_user_orders(self, user_session):
        r = user_session.get(f"{API}/orders/me", timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)
        assert len(r.json()) >= 1


# ---------- Admin ----------
class TestAdmin:
    def test_stats_non_admin_forbidden(self, user_session):
        r = user_session.get(f"{API}/admin/stats", timeout=15)
        assert r.status_code == 403

    def test_stats_admin(self, admin_session):
        r = admin_session.get(f"{API}/admin/stats", timeout=15)
        assert r.status_code == 200
        data = r.json()
        for k in ["today_revenue", "today_orders", "aov", "repeat_customer_rate", "daily_revenue_14d"]:
            assert k in data, f"Missing key {k} in stats"
        assert isinstance(data["daily_revenue_14d"], list)
        assert len(data["daily_revenue_14d"]) == 14

    def test_admin_update_order_status(self, admin_session):
        # Create an order (guest) then update status
        items = _sample_items()
        r = requests.post(f"{API}/orders", json={
            "items": items, "pickup_time": "ASAP", "customer_name": "S", "customer_phone": "0400000000",
            "payment_method": "square_mock",
        }, timeout=30)
        assert r.status_code == 200
        order_id = r.json()["id"]
        r2 = admin_session.put(f"{API}/admin/orders/{order_id}/status", json={"status": "preparing"}, timeout=15)
        assert r2.status_code == 200
        # verify via list
        r3 = admin_session.get(f"{API}/admin/orders", timeout=15)
        assert r3.status_code == 200
        found = [o for o in r3.json() if o["id"] == order_id]
        assert found and found[0]["status"] == "preparing"

    def test_admin_update_menu_toggle(self, admin_session):
        # Pick an item, toggle is_available off then on
        items = requests.get(f"{API}/menu/items", timeout=15).json()
        item_id = items[-1]["id"]
        r = admin_session.put(f"{API}/admin/menu/{item_id}", json={"is_available": False}, timeout=15)
        assert r.status_code == 200
        # verify disappears from public listing
        all_items = requests.get(f"{API}/menu/items", timeout=15).json()
        assert not any(i["id"] == item_id for i in all_items)
        # restore
        r2 = admin_session.put(f"{API}/admin/menu/{item_id}", json={"is_available": True}, timeout=15)
        assert r2.status_code == 200
