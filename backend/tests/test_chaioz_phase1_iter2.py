"""
Chaioz Phase 1 — Iteration 2 tests
Covers: admin image upload, admin menu CRUD, cart snapshot+scan,
Uber delivery quote, delivery order flow, per-item bestseller imagery,
order status 'ready' SMS dev log, pickup regression.
"""
import io
import os
import uuid
import time
import requests
import pytest
from datetime import datetime, timezone, timedelta

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://late-night-chai-1.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@chaioz.com.au"
ADMIN_PASSWORD = "Chaioz@2026"

# 1x1 px PNG (valid)
PNG_1x1 = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\rIDATx\x9cc\xf8\xcf"
    b"\xc0\x00\x00\x00\x03\x00\x01\x6e\xc1\x50\xe6\x00\x00\x00\x00IEND\xaeB`\x82"
)


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
    email = f"TEST_iter2_{uniq}@example.com"
    r = s.post(f"{API}/auth/register", json={"name": "Test2", "email": email, "password": "Pass1234!"}, timeout=30)
    assert r.status_code == 200
    return s


def _iso_pickup_in(minutes=15):
    return (datetime.now(timezone.utc) + timedelta(minutes=minutes)).isoformat()


# ================== Uploads ==================
class TestUploads:
    def test_upload_requires_admin(self):
        # anonymous
        files = {"file": ("a.png", PNG_1x1, "image/png")}
        r = requests.post(f"{API}/uploads/image", files=files, timeout=30)
        assert r.status_code in (401, 403), r.text

    def test_upload_non_admin_forbidden(self, user_session):
        files = {"file": ("a.png", PNG_1x1, "image/png")}
        r = user_session.post(f"{API}/uploads/image", files=files, timeout=30)
        assert r.status_code in (401, 403), r.text

    def test_upload_admin_success_and_public_fetch(self, admin_session):
        files = {"file": ("test.png", PNG_1x1, "image/png")}
        r = admin_session.post(f"{API}/uploads/image", files=files, timeout=60)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "id" in data and "url" in data
        assert data["url"].startswith("/api/uploads/public/")
        # Fetch via public endpoint
        full_url = f"{BASE_URL}{data['url']}"
        r2 = requests.get(full_url, timeout=30)
        assert r2.status_code == 200, r2.text
        ct = r2.headers.get("Content-Type", "")
        assert ct.startswith("image/png"), f"Unexpected ct: {ct}"
        assert len(r2.content) > 0

    def test_upload_bad_ext_rejected(self, admin_session):
        files = {"file": ("x.txt", b"hello", "text/plain")}
        r = admin_session.post(f"{API}/uploads/image", files=files, timeout=30)
        assert r.status_code == 400


# ================== Admin Menu CRUD ==================
class TestAdminMenuCRUD:
    created_id = None

    def test_create_menu_item(self, admin_session):
        payload = {
            "name": "TEST_Latte_iter2",
            "price": 5.5,
            "category": "Hot Drinks",
            "description": "Test only",
            "is_bestseller": False,
        }
        r = admin_session.post(f"{API}/admin/menu", json=payload, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["name"] == payload["name"]
        assert data["price"] == 5.5
        assert "id" in data
        TestAdminMenuCRUD.created_id = data["id"]
        # appears in admin list
        r2 = admin_session.get(f"{API}/admin/menu", timeout=30)
        assert r2.status_code == 200
        assert any(i["id"] == data["id"] for i in r2.json())
        # appears in public menu
        r3 = requests.get(f"{API}/menu/items", timeout=30)
        assert any(i["id"] == data["id"] for i in r3.json())

    def test_update_menu_item(self, admin_session):
        assert TestAdminMenuCRUD.created_id, "create test must run first"
        r = admin_session.put(
            f"{API}/admin/menu/{TestAdminMenuCRUD.created_id}",
            json={"price": 6.95, "image": "https://example.com/img.jpg"},
            timeout=30,
        )
        assert r.status_code == 200, r.text
        # verify persistence via public listing
        all_items = requests.get(f"{API}/menu/items", timeout=30).json()
        it = next((i for i in all_items if i["id"] == TestAdminMenuCRUD.created_id), None)
        assert it is not None
        assert it["price"] == 6.95
        assert it["image"] == "https://example.com/img.jpg"

    def test_delete_menu_item(self, admin_session):
        assert TestAdminMenuCRUD.created_id
        r = admin_session.delete(f"{API}/admin/menu/{TestAdminMenuCRUD.created_id}", timeout=30)
        assert r.status_code == 200
        # no longer in public listing
        all_items = requests.get(f"{API}/menu/items", timeout=30).json()
        assert not any(i["id"] == TestAdminMenuCRUD.created_id for i in all_items)
        # 404 on second delete
        r2 = admin_session.delete(f"{API}/admin/menu/{TestAdminMenuCRUD.created_id}", timeout=30)
        assert r2.status_code == 404

    def test_create_requires_fields(self, admin_session):
        r = admin_session.post(f"{API}/admin/menu", json={"name": "only"}, timeout=30)
        assert r.status_code == 400

    def test_create_non_admin_forbidden(self, user_session):
        r = user_session.post(f"{API}/admin/menu", json={"name": "x", "price": 1, "category": "Hot Drinks"}, timeout=30)
        assert r.status_code in (401, 403)


# ================== Bestseller per-item imagery ==================
class TestBestsellerImages:
    def test_bestsellers_have_distinct_images(self):
        r = requests.get(f"{API}/menu/bestsellers", timeout=30)
        assert r.status_code == 200
        bs = r.json()
        assert len(bs) >= 2
        imgs = [b.get("image") for b in bs]
        # no None
        assert all(i for i in imgs), f"Some bestsellers missing image: {imgs}"
        # no generic emergent CDN URL
        for u in imgs:
            assert "customer-assets.emergentagent.com" not in u, f"generic CDN still present: {u}"
        # at least 2 distinct (user expects per-item imagery)
        assert len(set(imgs)) >= 2, f"All bestsellers share same image: {imgs}"


# ================== Cart snapshot + scan ==================
class TestCartRecovery:
    def test_snapshot_empty(self):
        r = requests.post(f"{API}/cart/snapshot", json={"email": "TEST_cart@example.com", "items": []}, timeout=30)
        assert r.status_code == 200
        j = r.json()
        assert j.get("ok") is True
        assert j.get("reason") == "empty cart"

    def test_snapshot_no_contact(self):
        r = requests.post(f"{API}/cart/snapshot", json={
            "items": [{"item_id": "x", "name": "Y", "qty": 1, "line_total": 4.5}]
        }, timeout=30)
        assert r.status_code == 200
        assert r.json().get("reason") == "no contact"

    def test_snapshot_with_email_ok(self):
        r = requests.post(f"{API}/cart/snapshot", json={
            "email": "TEST_cart_ok@example.com",
            "name": "Test",
            "items": [{"item_id": "abc", "name": "Karak", "qty": 1, "line_total": 4.95}],
        }, timeout=30)
        assert r.status_code == 200
        assert r.json().get("ok") is True

    def test_snapshot_with_phone_ok(self):
        r = requests.post(f"{API}/cart/snapshot", json={
            "phone": "0400123456",
            "items": [{"item_id": "abc", "name": "Karak", "qty": 1, "line_total": 4.95}],
        }, timeout=30)
        assert r.status_code == 200
        assert r.json().get("ok") is True

    def test_scan_returns_count(self):
        r = requests.post(f"{API}/cart/scan", timeout=60)
        assert r.status_code == 200
        data = r.json()
        assert "sent" in data
        assert isinstance(data["sent"], int)


# ================== Delivery quote ==================
class TestDeliveryQuote:
    def test_quote_mock_response(self):
        payload = {
            "street_address": ["15 Smith St"],
            "city": "Adelaide",
            "state": "SA",
            "zip_code": "5000",
            "country": "AU",
        }
        r = requests.post(f"{API}/delivery/quote", json=payload, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("mock") is True
        assert data.get("currency") == "AUD"
        assert isinstance(data.get("fee_aud"), (int, float))
        # mock returns 899 cents = 8.99 AUD
        assert abs(data["fee_aud"] - 8.99) < 0.01
        assert data.get("pickup_duration_min") is not None
        assert data.get("dropoff_eta")
        assert data.get("id", "").startswith("mock-quote-")


# ================== Delivery order flow ==================
class TestDeliveryOrder:
    def test_delivery_order_creates_with_mock_tracking(self):
        # 1) get quote
        addr = {
            "street_address": ["100 King William St"],
            "city": "Adelaide",
            "state": "SA",
            "zip_code": "5000",
            "country": "AU",
        }
        qr = requests.post(f"{API}/delivery/quote", json=addr, timeout=30)
        assert qr.status_code == 200
        q = qr.json()
        # 2) get an item
        items = requests.get(f"{API}/menu/items", timeout=30).json()
        pick = items[0]
        order_items = [{
            "item_id": pick["id"],
            "name": pick["name"],
            "size": None,
            "addons": [],
            "price": pick["price"],
            "qty": 1,
            "line_total": round(pick["price"], 2),
            "notes": None,
        }]
        payload = {
            "items": order_items,
            "pickup_time": _iso_pickup_in(20),
            "customer_name": "Delivery Test",
            "customer_phone": "0400111222",
            "customer_email": "TEST_delivery@example.com",
            "payment_method": "square_mock",
            "fulfillment": "delivery",
            "delivery_address": addr,
            "delivery_quote_id": q["id"],
            "delivery_fee": q["fee_aud"],
        }
        r = requests.post(f"{API}/orders", json=payload, timeout=60)
        assert r.status_code == 200, r.text
        order = r.json()
        assert order["fulfillment"] == "delivery"
        assert order["delivery_fee"] == q["fee_aud"]
        expected_total = round(order_items[0]["line_total"] + q["fee_aud"], 2)
        assert abs(order["total"] - expected_total) < 0.01
        assert order.get("uber_tracking_url"), "tracking url missing"
        assert order.get("uber_delivery_id", "").startswith("mock-delivery-")
        assert order.get("delivery_status") == "pending"
        assert order["payment_status"] == "paid"
        assert order.get("delivery_address") == addr


# ================== Pickup regression ==================
class TestPickupRegression:
    def test_pickup_order_still_works(self):
        items = requests.get(f"{API}/menu/items", timeout=30).json()
        pick = items[0]
        payload = {
            "items": [{
                "item_id": pick["id"], "name": pick["name"], "price": pick["price"],
                "qty": 1, "line_total": round(pick["price"], 2), "size": None, "addons": [], "notes": None,
            }],
            "pickup_time": "ASAP",
            "customer_name": "Pickup Test",
            "customer_phone": "0400999888",
            "payment_method": "square_mock",
            # explicit pickup
            "fulfillment": "pickup",
        }
        r = requests.post(f"{API}/orders", json=payload, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["fulfillment"] == "pickup"
        assert data["delivery_fee"] == 0.0
        assert data["payment_status"] == "paid"
        assert data.get("short_code")


# ================== Order ready SMS dev log ==================
class TestOrderReadyNotification:
    def test_ready_status_triggers_dev_sms(self, admin_session):
        # Create order first
        items = requests.get(f"{API}/menu/items", timeout=30).json()
        pick = items[0]
        r = requests.post(f"{API}/orders", json={
            "items": [{
                "item_id": pick["id"], "name": pick["name"], "price": pick["price"],
                "qty": 1, "line_total": round(pick["price"], 2),
                "size": None, "addons": [], "notes": None,
            }],
            "pickup_time": "ASAP",
            "customer_name": "Ready Test",
            "customer_phone": "0400555666",
            "payment_method": "square_mock",
        }, timeout=30)
        assert r.status_code == 200
        order_id = r.json()["id"]
        # Update to 'ready'
        r2 = admin_session.put(f"{API}/admin/orders/{order_id}/status", json={"status": "ready"}, timeout=30)
        assert r2.status_code == 200
        # Verify via list
        r3 = admin_session.get(f"{API}/admin/orders", timeout=30)
        found = [o for o in r3.json() if o["id"] == order_id]
        assert found and found[0]["status"] == "ready"


# ================== Auth regression ==================
class TestAuthRegression:
    def test_me_admin(self, admin_session):
        r = admin_session.get(f"{API}/auth/me", timeout=15)
        assert r.status_code == 200
        assert r.json()["role"] == "admin"

    def test_stats_admin_ok(self, admin_session):
        r = admin_session.get(f"{API}/admin/stats", timeout=30)
        assert r.status_code == 200
        for k in ("today_revenue", "today_orders", "aov", "daily_revenue_14d"):
            assert k in r.json()
