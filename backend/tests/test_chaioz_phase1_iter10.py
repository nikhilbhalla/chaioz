"""
Chaioz Phase 1 — Iteration 10 backend tests.

Covers:
  A. Stricter register validation:
     - rejects weak passwords (<8 chars, missing letter or digit)
     - rejects bad names (too short, illegal chars)
     - rejects disposable email domains
     - rejects malformed phone numbers
     - accepts a clean payload with optional valid AU phone
  B. Square Loyalty endpoints — graceful when Sandbox merchant has no
     program configured (returns local fallback tiers, never 502s the UI).
  C. Square catalog sync — admin-only endpoint that returns a structured
     report (success/scanned/matched/flipped/unmatched).
  D. Webhook now triggers re-sync on `catalog.version.updated` and
     `inventory.count.updated` events.
"""
import os
import time
import uuid
import json
import requests

BASE_URL = os.environ.get(
    "REACT_APP_BACKEND_URL", "https://late-night-chai-1.preview.emergentagent.com"
).rstrip("/")
API = f"{BASE_URL}/api"
WEBHOOK_URL = f"{API}/webhooks/square"
ADMIN_EMAIL = "admin@chaioz.com.au"
ADMIN_PASSWORD = "Chaioz@2026"


def _admin_token():
    r = requests.post(f"{API}/auth/token", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    r.raise_for_status()
    return r.json()["access_token"]


# ---------------- A. Validation ----------------
def test_register_rejects_short_password():
    r = requests.post(
        f"{API}/auth/register",
        json={"name": "Real Person", "email": f"v{uuid.uuid4().hex[:6]}@gmail.com", "password": "abc1"},
        timeout=15,
    )
    assert r.status_code == 422


def test_register_rejects_password_without_digit():
    r = requests.post(
        f"{API}/auth/register",
        json={"name": "Real Person", "email": f"v{uuid.uuid4().hex[:6]}@gmail.com", "password": "abcdefgh"},
        timeout=15,
    )
    assert r.status_code == 422


def test_register_rejects_password_without_letter():
    r = requests.post(
        f"{API}/auth/register",
        json={"name": "Real Person", "email": f"v{uuid.uuid4().hex[:6]}@gmail.com", "password": "12345678"},
        timeout=15,
    )
    assert r.status_code == 422


def test_register_rejects_short_name():
    r = requests.post(
        f"{API}/auth/register",
        json={"name": "A", "email": f"v{uuid.uuid4().hex[:6]}@gmail.com", "password": "GoodPass1"},
        timeout=15,
    )
    assert r.status_code == 422


def test_register_rejects_disposable_email():
    r = requests.post(
        f"{API}/auth/register",
        json={"name": "Real Person", "email": "spam@mailinator.com", "password": "GoodPass1"},
        timeout=15,
    )
    assert r.status_code == 400
    assert "permanent" in r.json()["detail"].lower()


def test_register_rejects_invalid_phone():
    r = requests.post(
        f"{API}/auth/register",
        json={
            "name": "Real Person",
            "email": f"v{uuid.uuid4().hex[:6]}@gmail.com",
            "password": "GoodPass1",
            "phone": "12345",
        },
        timeout=15,
    )
    assert r.status_code == 422


def test_register_accepts_good_payload():
    email = f"v{uuid.uuid4().hex[:8]}@gmail.com"
    r = requests.post(
        f"{API}/auth/register",
        json={
            "name": "Real Person",
            "email": email,
            "password": "GoodPass1",
            "phone": "0412345678",
        },
        timeout=15,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["email"] == email
    assert body["loyalty_points"] == 100  # signup bonus


# ---------------- B. Loyalty graceful ----------------
def test_loyalty_program_graceful_when_not_setup():
    r = requests.get(f"{API}/loyalty/program", timeout=15)
    assert r.status_code == 200
    body = r.json()
    # Whether configured or not, we must always give the UI a renderable
    # tier list + 1pt/$1 accrual copy. No 502s allowed.
    assert "tiers" in body
    assert isinstance(body["tiers"], list)
    assert "accrual" in body


def test_loyalty_me_requires_auth():
    r = requests.get(f"{API}/loyalty/me", timeout=15)
    assert r.status_code in (401, 403)


def test_loyalty_me_after_login_has_safe_shape():
    # Register a fresh user with phone
    email = f"v{uuid.uuid4().hex[:8]}@gmail.com"
    requests.post(
        f"{API}/auth/register",
        json={"name": "Loyalty Tester", "email": email, "password": "GoodPass1", "phone": "0412345678"},
        timeout=15,
    ).raise_for_status()
    tok = requests.post(
        f"{API}/auth/token", json={"email": email, "password": "GoodPass1"}, timeout=15
    ).json()["access_token"]
    r = requests.get(f"{API}/loyalty/me", headers={"Authorization": f"Bearer {tok}"}, timeout=20)
    assert r.status_code == 200
    body = r.json()
    assert "balance" in body
    assert "tiers" in body
    # When sandbox merchant has no program, we still return tiers (local fallback)
    assert isinstance(body["tiers"], list)


# ---------------- C. Square catalog sync ----------------
def test_admin_sync_square_menu():
    tok = _admin_token()
    r = requests.post(
        f"{API}/admin/sync/square-menu",
        headers={"Authorization": f"Bearer {tok}"},
        timeout=30,
    )
    # Either succeeds (sandbox has empty catalog → 0/0/0 report) or returns
    # a structured 502 if Square is unreachable. We never want 500s.
    assert r.status_code in (200, 502), r.text
    if r.status_code == 200:
        body = r.json()
        assert body.get("success") is True
        for k in ("scanned", "matched", "flipped"):
            assert isinstance(body.get(k), int)


def test_admin_sync_square_menu_requires_auth():
    r = requests.post(f"{API}/admin/sync/square-menu", timeout=15)
    assert r.status_code in (401, 403)


# ---------------- D. Webhook catalog re-sync ----------------
def test_webhook_catalog_version_updated_triggers_resync():
    payload = {
        "type": "catalog.version.updated",
        "data": {"object": {"catalog_version": {"updated_at": "2026-04-26T05:30:00Z"}}},
    }
    r = requests.post(WEBHOOK_URL, json=payload, timeout=15)
    assert r.status_code == 200
    body = r.json()
    assert body.get("ok") is True
    assert body.get("sync_triggered") is True


def test_webhook_inventory_count_updated_triggers_resync():
    payload = {"type": "inventory.count.updated", "data": {"object": {}}}
    r = requests.post(WEBHOOK_URL, json=payload, timeout=15)
    assert r.status_code == 200
    body = r.json()
    assert body.get("sync_triggered") is True
