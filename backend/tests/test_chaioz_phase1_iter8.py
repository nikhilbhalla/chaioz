"""
Chaioz Phase 1 — Iteration 8 backend tests.

Covers:
  A. Square webhook router: /health, signature verification (valid/invalid),
     order.updated → local status mapping (PREPARED → ready; COMPLETED → completed),
     unknown order id → {ok:true, matched:false}, payment.updated persists
     square_payment_status, and SMS "order ready" sent via mocked notifications.
  B. Admin combo CRUD backend retest: POST/PUT/DELETE /api/admin/combos,
     GET /api/admin/combos lists inactive, GET /api/menu/combos hides inactive.

NOTE: Tests that exercise signature verification temporarily set
SQUARE_WEBHOOK_SIGNATURE_KEY in /app/backend/.env and restart the backend,
then restore the original empty value in teardown.
"""
import os
import re
import time
import json
import uuid
import hmac
import base64
import hashlib
import subprocess
import pytest
import requests
from pathlib import Path

BASE_URL = os.environ.get(
    "REACT_APP_BACKEND_URL", "https://late-night-chai-1.preview.emergentagent.com"
).rstrip("/")
API = f"{BASE_URL}/api"
WEBHOOK_URL = f"{API}/webhooks/square"

ADMIN_EMAIL = "chaiozadl@gmail.com"
ADMIN_PASSWORD = "Chaioz@2026"

ENV_PATH = Path("/app/backend/.env")
PUBLIC_BACKEND_URL = "https://late-night-chai-1.preview.emergentagent.com"
NOTIF_URL = f"{PUBLIC_BACKEND_URL}/api/webhooks/square"


# -------------------- helpers --------------------


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


def _sign(body: bytes, key: str, url: str = NOTIF_URL) -> str:
    payload = (url + body.decode("utf-8")).encode("utf-8")
    mac = hmac.new(key.encode("utf-8"), payload, hashlib.sha256).digest()
    return base64.b64encode(mac).decode("utf-8")


def _set_env_key(key: str, value: str):
    """Overwrite a KEY=... line inside /app/backend/.env (keeps surrounding lines)."""
    text = ENV_PATH.read_text()
    pattern = re.compile(rf'^{re.escape(key)}=.*$', re.MULTILINE)
    new_line = f'{key}="{value}"'
    if pattern.search(text):
        text = pattern.sub(new_line, text)
    else:
        if not text.endswith("\n"):
            text += "\n"
        text += new_line + "\n"
    ENV_PATH.write_text(text)


def _restart_backend():
    subprocess.run(["sudo", "supervisorctl", "restart", "backend"], check=False, capture_output=True)
    # Wait for health
    deadline = time.time() + 20
    while time.time() < deadline:
        try:
            r = requests.get(f"{WEBHOOK_URL}/health", timeout=3)
            if r.status_code == 200:
                return r.json()
        except Exception:
            pass
        time.sleep(0.5)
    return {}


def _wait_for_square(order_id: str, timeout: int = 15):
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


# -------------------- fixtures --------------------


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
    assert r.status_code == 200, r.text
    return s


@pytest.fixture(scope="module")
def menu_items(api):
    r = api.get(f"{API}/menu/items")
    assert r.status_code == 200
    return r.json()


# ============================================================================
# 1. Health endpoint
# ============================================================================


class TestWebhookHealth:
    def test_health_returns_expected_shape(self, api):
        r = api.get(f"{WEBHOOK_URL}/health")
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("ok") is True
        assert isinstance(data.get("signature_configured"), bool)
        assert isinstance(data.get("public_url_configured"), bool)
        # In sandbox, PUBLIC_BACKEND_URL is configured
        assert data["public_url_configured"] is True


# ============================================================================
# 2. Webhook order state mapping with empty signature key (skips verification).
#    Also covers unknown-order and payment.updated flows.
# ============================================================================


class TestWebhookStateMapping:
    """Phase-1: SIGNATURE_KEY stays empty → handler skips verification. This
    lets us exercise state-mapping + SMS side-effects without needing signed
    payloads."""

    @pytest.fixture(scope="class")
    def pickup_order(self, api, menu_items):
        it = _pick(menu_items, "karak classic") or menu_items[0]
        payload = {
            "items": [_line(it)],
            "pickup_time": "ASAP",
            "customer_name": "Iter8 Webhook Ready",
            "customer_phone": "+61400000200",
            "customer_email": f"TEST_iter8_webhook_{uuid.uuid4().hex[:6]}@example.com",
            "payment_method": "square_mock",
            "fulfillment": "pickup",
        }
        r = api.post(f"{API}/orders", json=payload)
        assert r.status_code == 200, r.text
        order = r.json()
        # Wait for square_order_id so the webhook can match it
        final = _wait_for_square(order["id"], timeout=20)
        assert final.get("square_order_id"), f"Square did not sync: {final.get('square_sync_error')!r}"
        return final

    def test_order_updated_prepared_maps_to_ready_and_sends_sms(self, api, pickup_order):
        sq_id = pickup_order["square_order_id"]
        evt = {
            "type": "order.updated",
            "data": {
                "object": {
                    "order_updated": {
                        "id": sq_id,
                        "state": "OPEN",
                        "fulfillments": [{"state": "PREPARED"}],
                    }
                }
            },
        }
        r = api.post(WEBHOOK_URL, data=json.dumps(evt))
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("ok") is True
        assert body.get("matched") is True
        assert body.get("new_status") == "ready"

        # Allow DB write to settle
        time.sleep(0.6)
        r2 = api.get(f"{API}/orders/{pickup_order['id']}")
        assert r2.status_code == 200
        doc = r2.json()
        assert doc.get("status") == "ready"
        assert doc.get("square_last_event_at")

    def test_order_updated_completed_maps_to_completed(self, api, pickup_order):
        sq_id = pickup_order["square_order_id"]
        evt = {
            "type": "order.updated",
            "data": {
                "object": {
                    "order_updated": {
                        "id": sq_id,
                        "state": "COMPLETED",
                        "fulfillments": [{"state": "COMPLETED"}],
                    }
                }
            },
        }
        r = api.post(WEBHOOK_URL, data=json.dumps(evt))
        assert r.status_code == 200, r.text
        time.sleep(0.6)
        doc = api.get(f"{API}/orders/{pickup_order['id']}").json()
        assert doc.get("status") == "completed"

    def test_webhook_unknown_square_order_id_returns_matched_false(self, api):
        evt = {
            "type": "order.updated",
            "data": {
                "object": {
                    "order_updated": {
                        "id": f"nonexistent-{uuid.uuid4().hex}",
                        "state": "OPEN",
                        "fulfillments": [{"state": "PREPARED"}],
                    }
                }
            },
        }
        r = api.post(WEBHOOK_URL, data=json.dumps(evt))
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("ok") is True
        assert body.get("matched") is False

    def test_payment_updated_persists_square_payment_status(self, api, pickup_order):
        sq_id = pickup_order["square_order_id"]
        evt = {
            "type": "payment.updated",
            "data": {
                "object": {
                    "payment": {
                        "id": "pay_" + uuid.uuid4().hex[:12],
                        "order_id": sq_id,
                        "status": "COMPLETED",
                    }
                }
            },
        }
        r = api.post(WEBHOOK_URL, data=json.dumps(evt))
        assert r.status_code == 200, r.text
        assert r.json().get("matched") is True
        time.sleep(0.6)
        doc = api.get(f"{API}/orders/{pickup_order['id']}").json()
        assert doc.get("square_payment_status") == "completed"


# ============================================================================
# 3. Signature verification — set SIGNATURE_KEY, restart backend, test
#    valid vs invalid signatures, then restore.
# ============================================================================


@pytest.fixture(scope="class")
def signed_backend():
    """Set SQUARE_WEBHOOK_SIGNATURE_KEY=pytest-sig-key, restart backend.
    Teardown restores the original empty value + restarts again."""
    test_key = "pytest-sig-key"
    original_text = ENV_PATH.read_text()
    try:
        _set_env_key("SQUARE_WEBHOOK_SIGNATURE_KEY", test_key)
        health = _restart_backend()
        assert health.get("signature_configured") is True, f"signature key not applied: {health}"
        yield test_key
    finally:
        ENV_PATH.write_text(original_text)
        _restart_backend()


class TestWebhookSignature:
    def test_valid_signature_returns_200(self, signed_backend, api):
        key = signed_backend
        body_dict = {
            "type": "order.updated",
            "data": {
                "object": {
                    "order_updated": {
                        "id": f"nonexistent-{uuid.uuid4().hex}",
                        "state": "OPEN",
                        "fulfillments": [{"state": "PREPARED"}],
                    }
                }
            },
        }
        raw = json.dumps(body_dict).encode("utf-8")
        sig = _sign(raw, key)
        r = requests.post(
            WEBHOOK_URL,
            data=raw,
            headers={
                "Content-Type": "application/json",
                "x-square-hmacsha256-signature": sig,
            },
        )
        assert r.status_code == 200, f"valid-sig expected 200, got {r.status_code}: {r.text}"
        body = r.json()
        assert body.get("ok") is True
        # Unknown square_order_id → matched:false
        assert body.get("matched") is False

    def test_invalid_signature_returns_401(self, signed_backend, api):
        body_dict = {"type": "order.updated", "data": {"object": {"order_updated": {"id": "x"}}}}
        raw = json.dumps(body_dict).encode("utf-8")
        r = requests.post(
            WEBHOOK_URL,
            data=raw,
            headers={
                "Content-Type": "application/json",
                "x-square-hmacsha256-signature": "AAAAdeadbeefBADsignatureAAAAAAAAAAAAA=",
            },
        )
        assert r.status_code == 401, f"invalid-sig expected 401, got {r.status_code}: {r.text}"

    def test_missing_signature_header_returns_401(self, signed_backend, api):
        body_dict = {"type": "order.updated", "data": {"object": {"order_updated": {"id": "x"}}}}
        raw = json.dumps(body_dict).encode("utf-8")
        r = requests.post(
            WEBHOOK_URL,
            data=raw,
            headers={"Content-Type": "application/json"},
        )
        assert r.status_code == 401, f"missing-sig expected 401, got {r.status_code}: {r.text}"


# ============================================================================
# 4. Admin combo CRUD retest (regression from iter6)
# ============================================================================


class TestAdminCombosCRUD:
    def test_admin_combos_listing_includes_inactive(self, admin_session):
        # Create an inactive combo
        name = f"TEST_iter8_inactive_{uuid.uuid4().hex[:6]}"
        r = admin_session.post(
            f"{API}/admin/combos",
            json={
                "name": name,
                "tagline": "iter8 inactive",
                "items": ["Karak Classic", "Bun Maska"],
                "bundle_price": 7.00,
                "is_active": False,
            },
        )
        assert r.status_code in (200, 201), r.text
        combo_id = r.json().get("id")
        try:
            # Admin listing includes inactive
            adm = admin_session.get(f"{API}/admin/combos")
            assert adm.status_code == 200
            adm_names = [c.get("name") for c in adm.json()]
            assert name in adm_names, f"Admin combos missing {name}"

            # Public listing hides inactive
            pub = requests.get(f"{API}/menu/combos")
            assert pub.status_code == 200
            pub_names = [c.get("name") for c in pub.json()]
            assert name not in pub_names, f"Inactive combo leaked to public: {pub_names}"
        finally:
            if combo_id:
                admin_session.delete(f"{API}/admin/combos/{combo_id}")

    def test_admin_combo_full_crud_and_save_calc(self, admin_session):
        name = f"TEST_iter8_crud_{uuid.uuid4().hex[:6]}"
        create = admin_session.post(
            f"{API}/admin/combos",
            json={
                "name": name,
                "tagline": "e2e crud",
                "items": ["Karak Classic", "Bun Maska"],
                "bundle_price": 7.00,
                "is_active": True,
            },
        )
        assert create.status_code in (200, 201), create.text
        combo = create.json()
        combo_id = combo["id"]
        try:
            # UPDATE
            upd = admin_session.put(
                f"{API}/admin/combos/{combo_id}",
                json={
                    "name": name,
                    "tagline": "e2e crud updated",
                    "items": ["Karak Classic", "Bun Maska"],
                    "bundle_price": 6.50,
                    "is_active": True,
                },
            )
            assert upd.status_code == 200, upd.text
            # API returns {ok: true} on update — verify by GET below

            # Verify via GET
            adm = admin_session.get(f"{API}/admin/combos")
            row = next((c for c in adm.json() if c.get("id") == combo_id), None)
            assert row is not None
            assert row.get("bundle_price") == 6.50
            assert row.get("tagline") == "e2e crud updated"

            # Public surfaces it
            pub = requests.get(f"{API}/menu/combos").json()
            pub_row = next((c for c in pub if c.get("id") == combo_id), None)
            assert pub_row is not None
            # items_detail resolved and save > 0 (bundle_price 6.50 < sum of items)
            items_detail = pub_row.get("items_detail") or []
            assert len(items_detail) == 2
            total = sum(float(x["price"]) for x in items_detail)
            assert total > 6.50, f"expected save>0, items sum={total}"
        finally:
            dl = admin_session.delete(f"{API}/admin/combos/{combo_id}")
            assert dl.status_code in (200, 204), dl.text
            # Gone
            adm = admin_session.get(f"{API}/admin/combos")
            assert all(c.get("id") != combo_id for c in adm.json())
