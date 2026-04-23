"""
Chaioz Phase 1 — Iteration 7 backend tests.
Targeted retests of iter6 critical findings:
  1. POST /api/orders ASAP + customer_email → 200, pickup_time stored as ISO (not literal 'ASAP'),
     square_order_id populated within 10s.
  2. POST /api/orders DELIVERY + ASAP + customer_email → 200, square_order_id populated.
  3. Reorder resilience: original doc missing customer_name (simulated via direct DB $unset)
     → should NOT 500. Must succeed (using user.name fallback) or 422 cleanly.
  4. Combos partial resolution: combo with 1 valid + 1 missing item must NOT appear in
     GET /api/menu/combos (partial skipped).
"""
import os
import re
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://late-night-chai-1.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"
ADMIN_EMAIL = "admin@chaioz.com.au"
ADMIN_PASSWORD = "Chaioz@2026"

ISO_RE = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}")


def _pick(items, name_fragment):
    nf = name_fragment.lower()
    for it in items:
        if nf in it["name"].lower():
            return it
    return None


def _line(it, qty=1):
    return {
        "item_id": it["id"],
        "name": it["name"],
        "price": it["price"],
        "qty": qty,
        "line_total": round(it["price"] * qty, 2),
        "customizations": {},
        "notes": None,
    }


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def menu_items(api):
    r = api.get(f"{API}/menu/items")
    assert r.status_code == 200
    return r.json()


@pytest.fixture(scope="module")
def admin_cookie_session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    return s


def _wait_for_square(order_id: str, timeout: int = 12):
    deadline = time.time() + timeout
    last = None
    while time.time() < deadline:
        r = requests.get(f"{API}/orders/{order_id}")
        if r.status_code == 200:
            last = r.json()
            if last.get("square_order_id") or last.get("square_sync_error"):
                return last
        time.sleep(0.7)
    return last or {}


# ===== 1 & 2. ASAP pickup/delivery — retest =====

class TestASAPOrdersRetest:
    def test_asap_pickup_with_email_returns_200_and_iso_pickup_time(self, api, menu_items):
        it = _pick(menu_items, "karak classic") or menu_items[0]
        payload = {
            "items": [_line(it)],
            "pickup_time": "ASAP",
            "customer_name": "Iter7 ASAP Pickup",
            "customer_phone": "+61400000010",
            "customer_email": f"TEST_iter7_asap_pickup_{uuid.uuid4().hex[:6]}@example.com",
            "payment_method": "square_mock",
            "fulfillment": "pickup",
        }
        r = api.post(f"{API}/orders", json=payload)
        assert r.status_code == 200, r.text
        order = r.json()
        # pickup_time must be coerced to real ISO (not literal 'ASAP')
        pt = order.get("pickup_time", "")
        assert pt and pt != "ASAP", f"pickup_time not coerced: {pt!r}"
        assert ISO_RE.match(pt), f"pickup_time not ISO RFC3339: {pt!r}"
        # Square sync completes
        final = _wait_for_square(order["id"])
        assert final.get("square_order_id"), (
            f"Square sync did not populate square_order_id. "
            f"sync_error={final.get('square_sync_error')!r}"
        )

    def test_asap_delivery_with_email_returns_200_square_synced(self, api, menu_items):
        it = _pick(menu_items, "karak") or menu_items[0]
        payload = {
            "items": [_line(it)],
            "pickup_time": "ASAP",
            "customer_name": "Iter7 ASAP Delivery",
            "customer_phone": "+61400000011",
            "customer_email": f"TEST_iter7_asap_del_{uuid.uuid4().hex[:6]}@example.com",
            "payment_method": "square_mock",
            "fulfillment": "delivery",
            "delivery_fee": 7.99,
            "delivery_address": {
                "street_address": ["10 Pulteney St"],
                "city": "Adelaide",
                "state": "SA",
                "zip_code": "5000",
                "country": "AU",
            },
        }
        r = api.post(f"{API}/orders", json=payload)
        assert r.status_code == 200, r.text
        order = r.json()
        pt = order.get("pickup_time", "")
        assert pt and pt != "ASAP", f"delivery pickup_time not coerced: {pt!r}"
        assert ISO_RE.match(pt), f"delivery pickup_time not ISO: {pt!r}"
        final = _wait_for_square(order["id"])
        assert final.get("square_order_id"), (
            f"delivery Square sync failed: {final.get('square_sync_error')!r}"
        )


# ===== 3. Reorder resilience when customer_name is missing from legacy doc =====

class TestReorderLegacyMissingCustomerName:
    def test_reorder_order_with_customer_name_unset_does_not_500(self, api, menu_items):
        # Register a fresh user
        email = f"TEST_iter7_reorder_{uuid.uuid4().hex[:8]}@example.com"
        pwd = "Testpass@2026"
        sess = requests.Session()
        sess.headers.update({"Content-Type": "application/json"})
        r = sess.post(f"{API}/auth/register", json={
            "email": email,
            "password": pwd,
            "name": "Fallback UserName",
            "phone": "+61400000099",
        })
        assert r.status_code in (200, 201), r.text

        # Create an original order with full fields
        it = _pick(menu_items, "karak") or menu_items[0]
        r = sess.post(f"{API}/orders", json={
            "items": [_line(it)],
            "pickup_time": "ASAP",
            "customer_name": "Original Customer",
            "customer_phone": "+61400000099",
            "customer_email": email,
            "payment_method": "square_mock",
            "fulfillment": "pickup",
        })
        assert r.status_code == 200, r.text
        original = r.json()
        original_id = original["id"]

        # Simulate legacy order: $unset customer_name via admin raw DB hook.
        # There's no raw DB API exposed, so we use the admin endpoint to update the order
        # if one exists, otherwise we emulate via a direct motor call through an admin-only
        # test hook. Fallback: use the admin to PATCH the doc via mongo shell style.
        # Since no such endpoint exists publicly, use pymongo direct connection (allowed in tests).
        from motor.motor_asyncio import AsyncIOMotorClient
        import asyncio
        mongo_url = os.environ.get("MONGO_URL")
        db_name = os.environ.get("DB_NAME", "chaioz_db")
        if not mongo_url:
            # Load from backend/.env
            env_path = "/app/backend/.env"
            if os.path.exists(env_path):
                with open(env_path) as f:
                    for line in f:
                        line = line.strip()
                        if line.startswith("MONGO_URL="):
                            mongo_url = line.split("=", 1)[1].strip().strip('"').strip("'")
                        elif line.startswith("DB_NAME="):
                            db_name = line.split("=", 1)[1].strip().strip('"').strip("'")
        assert mongo_url, "MONGO_URL must be set for this test"

        async def _unset():
            client = AsyncIOMotorClient(mongo_url)
            db = client[db_name]
            res = await db.orders.update_one(
                {"id": original_id},
                {"$unset": {"customer_name": "", "customer_phone": ""}}
            )
            client.close()
            return res.modified_count

        modified = asyncio.get_event_loop().run_until_complete(_unset())
        assert modified == 1, f"failed to unset fields; modified={modified}"

        # Now try to reorder — must NOT 500. Must return 200 (with fallback) or 422.
        r = sess.post(f"{API}/orders/{original_id}/reorder", json={})
        assert r.status_code != 500, f"reorder 500 regression! body={r.text}"
        assert r.status_code in (200, 422), f"unexpected status {r.status_code}: {r.text}"
        if r.status_code == 200:
            new_order = r.json()
            # customer_name fell back to user.name
            assert new_order.get("customer_name") in ("Fallback UserName", "Customer"), (
                f"customer_name fallback unexpected: {new_order.get('customer_name')!r}"
            )


# ===== 4. Combos partial resolution skipped =====

class TestCombosPartialResolution:
    def test_partial_combo_is_skipped(self, admin_cookie_session, api):
        # Create a combo with 1 real + 1 fake item
        combo_name = f"TEST_iter7_partial_{uuid.uuid4().hex[:6]}"
        payload = {
            "name": combo_name,
            "tagline": "partial test",
            "items": ["Karak Classic", "NonExistentItem99"],
            "bundle_price": 9.99,
        }
        created = admin_cookie_session.post(f"{API}/admin/combos", json=payload)
        assert created.status_code in (200, 201), created.text
        combo_id = created.json().get("id")
        try:
            # Public combos should NOT include this combo
            r = api.get(f"{API}/menu/combos")
            assert r.status_code == 200
            combos = r.json()
            names = [c.get("name") for c in combos]
            assert combo_name not in names, (
                f"Partial combo unexpectedly surfaced in public list! names={names}"
            )
        finally:
            # Cleanup
            if combo_id:
                admin_cookie_session.delete(f"{API}/admin/combos/{combo_id}")
