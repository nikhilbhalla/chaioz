"""
Chaioz iter13 backend tests — operational settings + combo image_url + delivery
guard.
"""
import os
import uuid
import requests

BASE_URL = os.environ.get(
    "REACT_APP_BACKEND_URL", "https://late-night-chai-1.preview.emergentagent.com"
).rstrip("/")
API = f"{BASE_URL}/api"
ADMIN_EMAIL = "chaiozadl@gmail.com"
ADMIN_PASSWORD = "Chaioz@2026"


def _admin():
    r = requests.post(f"{API}/auth/token", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    r.raise_for_status()
    return r.json()["access_token"]


def _reset():
    tok = _admin()
    requests.put(
        f"{API}/admin/settings",
        json={"pickup_only": False, "soft_launch_banner": ""},
        headers={"Authorization": f"Bearer {tok}"},
        timeout=10,
    )


# ---------------- Settings ----------------
def test_public_settings_default_shape():
    r = requests.get(f"{API}/settings", timeout=10)
    assert r.status_code == 200
    body = r.json()
    assert "pickup_only" in body
    assert "soft_launch_banner" in body
    assert isinstance(body["pickup_only"], bool)


def test_admin_settings_requires_auth():
    r1 = requests.get(f"{API}/admin/settings", timeout=10)
    assert r1.status_code in (401, 403)
    r2 = requests.put(f"{API}/admin/settings", json={"pickup_only": True}, timeout=10)
    assert r2.status_code in (401, 403)


def test_admin_settings_update_persists():
    tok = _admin()
    payload = {"pickup_only": True, "soft_launch_banner": "Soft launch — DM @chaioz"}
    r = requests.put(f"{API}/admin/settings", json=payload, headers={"Authorization": f"Bearer {tok}"}, timeout=10)
    assert r.status_code == 200
    body = r.json()
    assert body["pickup_only"] is True
    assert "soft launch" in body["soft_launch_banner"].lower()
    # Public mirror reflects it
    pub = requests.get(f"{API}/settings", timeout=10).json()
    assert pub["pickup_only"] is True
    _reset()


def test_admin_settings_rejects_empty():
    tok = _admin()
    r = requests.put(f"{API}/admin/settings", json={"unsupported": True}, headers={"Authorization": f"Bearer {tok}"}, timeout=10)
    assert r.status_code == 400


# ---------------- Pickup-only delivery guard ----------------
def test_delivery_blocked_when_pickup_only():
    tok = _admin()
    requests.put(
        f"{API}/admin/settings",
        json={"pickup_only": True},
        headers={"Authorization": f"Bearer {tok}"},
        timeout=10,
    ).raise_for_status()
    item = requests.get(f"{API}/menu/items", timeout=10).json()[0]
    payload = {
        "items": [{"item_id": item["id"], "name": item["name"], "price": item["price"], "qty": 1, "line_total": item["price"]}],
        "customer_email": "d@test.com",
        "customer_name": "Test User",
        "customer_phone": "0412345678",
        "fulfillment": "delivery",
        "pickup_time": "ASAP",
        "delivery_address": {"line1": "1 King William St", "city": "Adelaide", "postcode": "5000"},
        "payment_method": "square_mock",
    }
    r = requests.post(f"{API}/orders", json=payload, timeout=15)
    assert r.status_code == 400
    assert "delivery" in r.json()["detail"].lower()
    _reset()


def test_pickup_passes_when_pickup_only():
    tok = _admin()
    requests.put(
        f"{API}/admin/settings",
        json={"pickup_only": True},
        headers={"Authorization": f"Bearer {tok}"},
        timeout=10,
    ).raise_for_status()
    item = requests.get(f"{API}/menu/items", timeout=10).json()[0]
    payload = {
        "items": [{"item_id": item["id"], "name": item["name"], "price": item["price"], "qty": 1, "line_total": item["price"]}],
        "customer_email": f"p{uuid.uuid4().hex[:6]}@test.com",
        "customer_name": "Test User",
        "customer_phone": "0412345678",
        "fulfillment": "pickup",
        "pickup_time": "ASAP",
        "payment_method": "square_mock",
    }
    r = requests.post(f"{API}/orders", json=payload, timeout=15)
    assert r.status_code == 200
    _reset()


# ---------------- Combo image_url ----------------
def test_combo_create_with_image_url():
    tok = _admin()
    payload = {
        "name": "Test Combo iter13",
        "tagline": "Test",
        "items": ["Karak Classic"],
        "bundle_price": 9.50,
        "image_url": "https://example.com/test.jpg",
    }
    r = requests.post(f"{API}/admin/combos", json=payload, headers={"Authorization": f"Bearer {tok}"}, timeout=10)
    assert r.status_code == 200
    combo = r.json()
    assert combo["image_url"] == "https://example.com/test.jpg"
    # Cleanup
    requests.delete(f"{API}/admin/combos/{combo['id']}", headers={"Authorization": f"Bearer {tok}"}, timeout=10)


def test_combo_update_image_url():
    tok = _admin()
    create = requests.post(
        f"{API}/admin/combos",
        json={"name": "T2 iter13", "items": ["Karak"], "bundle_price": 8.0, "image_url": ""},
        headers={"Authorization": f"Bearer {tok}"},
        timeout=10,
    )
    cid = create.json()["id"]
    upd = requests.put(
        f"{API}/admin/combos/{cid}",
        json={"image_url": "https://new.example.com/x.png"},
        headers={"Authorization": f"Bearer {tok}"},
        timeout=10,
    )
    assert upd.status_code == 200
    assert upd.json()["image_url"] == "https://new.example.com/x.png"
    requests.delete(f"{API}/admin/combos/{cid}", headers={"Authorization": f"Bearer {tok}"}, timeout=10)
