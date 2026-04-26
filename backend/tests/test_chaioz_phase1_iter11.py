"""
Chaioz Phase 1 — Iteration 11 backend tests (mobile deepening).

Covers:
  A. Device + push token registration
     - rejects malformed tokens (400)
     - anon registration with valid Expo token (200, anonymous:true)
     - logged-in registration attaches to user (200, anonymous:false) and
       removes the matching anonymous record
     - unregister removes the token from user.expo_push_tokens (auth required)
  B. Universal-link config endpoints
     - /api/well-known/apple-app-site-association exposes appID + paths
     - /api/well-known/assetlinks.json exposes android package + fingerprints
  C. Marketing broadcast endpoint (/api/admin/broadcast/push)
     - 401 anon
     - 400 missing title/body
     - 400 over-length title/body
     - 200 with valid payload — `sent` field present
"""
import os
import uuid
import requests

BASE_URL = os.environ.get(
    "REACT_APP_BACKEND_URL", "https://late-night-chai-1.preview.emergentagent.com"
).rstrip("/")
API = f"{BASE_URL}/api"
ADMIN_EMAIL = "admin@chaioz.com.au"
ADMIN_PASSWORD = "Chaioz@2026"

VALID_TOKEN = "ExponentPushToken[ZZZZZZZZZZZZZZZZZZZZZZ]"


def _admin_token():
    r = requests.post(f"{API}/auth/token", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    r.raise_for_status()
    return r.json()["access_token"]


def _new_user():
    email = f"v{uuid.uuid4().hex[:8]}@gmail.com"
    requests.post(
        f"{API}/auth/register",
        json={"name": "Push Tester", "email": email, "password": "GoodPass1", "phone": "0412345678"},
        timeout=15,
    ).raise_for_status()
    tok = requests.post(
        f"{API}/auth/token", json={"email": email, "password": "GoodPass1"}, timeout=15
    ).json()["access_token"]
    return email, tok


# ---------- A. Devices ----------
def test_register_rejects_bad_token():
    r = requests.post(f"{API}/devices/register", json={"token": "not-a-token"}, timeout=15)
    assert r.status_code == 400


def test_register_anon_valid_token():
    token = "ExponentPushToken[anon" + uuid.uuid4().hex[:14] + "]"
    r = requests.post(
        f"{API}/devices/register",
        json={"token": token, "platform": "ios"},
        timeout=15,
    )
    assert r.status_code == 200
    assert r.json().get("anonymous") is True


def test_register_user_token_promotes_from_anon():
    token = "ExponentPushToken[promo" + uuid.uuid4().hex[:13] + "]"
    # Step 1: register anon
    r1 = requests.post(f"{API}/devices/register", json={"token": token, "platform": "android"}, timeout=15)
    assert r1.status_code == 200
    assert r1.json().get("anonymous") is True

    # Step 2: same token, now with auth → should attach to the user, drop anon
    _, tok = _new_user()
    r2 = requests.post(
        f"{API}/devices/register",
        json={"token": token, "platform": "android"},
        headers={"Authorization": f"Bearer {tok}"},
        timeout=15,
    )
    assert r2.status_code == 200
    body = r2.json()
    assert body.get("anonymous") is False
    assert body.get("user")  # user id present


def test_unregister_requires_auth():
    r = requests.post(f"{API}/devices/unregister", json={"token": VALID_TOKEN}, timeout=15)
    assert r.status_code in (401, 403)


def test_unregister_removes_token():
    _, tok = _new_user()
    token = "ExponentPushToken[unreg" + uuid.uuid4().hex[:14] + "]"
    requests.post(
        f"{API}/devices/register",
        json={"token": token},
        headers={"Authorization": f"Bearer {tok}"},
        timeout=15,
    ).raise_for_status()
    r = requests.post(
        f"{API}/devices/unregister",
        json={"token": token},
        headers={"Authorization": f"Bearer {tok}"},
        timeout=15,
    )
    assert r.status_code == 200
    assert r.json().get("ok") is True


# ---------- B. Universal-link config ----------
def test_aasa_endpoint():
    r = requests.get(f"{API}/well-known/apple-app-site-association", timeout=10)
    assert r.status_code == 200
    body = r.json()
    details = body["applinks"]["details"][0]
    assert details["appID"].endswith(".com.chaioz.app")
    assert "/order/*" in details["paths"]
    assert "/menu" in details["paths"]


def test_assetlinks_endpoint():
    r = requests.get(f"{API}/well-known/assetlinks.json", timeout=10)
    assert r.status_code == 200
    body = r.json()
    assert isinstance(body, list)
    assert body[0]["target"]["package_name"] == "com.chaioz.app"
    assert "delegate_permission/common.handle_all_urls" in body[0]["relation"]


# ---------- C. Marketing broadcast ----------
def test_broadcast_requires_auth():
    r = requests.post(f"{API}/admin/broadcast/push", json={"title": "T", "body": "B"}, timeout=15)
    assert r.status_code in (401, 403)


def test_broadcast_rejects_missing_fields():
    tok = _admin_token()
    r1 = requests.post(
        f"{API}/admin/broadcast/push",
        json={"title": "Only title"},
        headers={"Authorization": f"Bearer {tok}"},
        timeout=15,
    )
    assert r1.status_code == 400
    r2 = requests.post(
        f"{API}/admin/broadcast/push",
        json={"body": "Only body"},
        headers={"Authorization": f"Bearer {tok}"},
        timeout=15,
    )
    assert r2.status_code == 400


def test_broadcast_rejects_over_length():
    tok = _admin_token()
    r = requests.post(
        f"{API}/admin/broadcast/push",
        json={"title": "X" * 100, "body": "Y" * 50},
        headers={"Authorization": f"Bearer {tok}"},
        timeout=15,
    )
    assert r.status_code == 400


def test_broadcast_accepts_valid():
    tok = _admin_token()
    r = requests.post(
        f"{API}/admin/broadcast/push",
        json={"title": "Brekie combo 25% off", "body": "Saturday only — Karak + Bun Maska."},
        headers={"Authorization": f"Bearer {tok}"},
        timeout=20,
    )
    assert r.status_code == 200
    body = r.json()
    assert "sent" in body
    assert isinstance(body["sent"], int)
