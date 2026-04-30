"""
Chaioz Phase 1 — Iteration 12 backend tests.

Covers:
  A. PATCH /api/auth/me/preferences:
     - requires auth
     - rejects payload without supported keys (400)
     - persists `marketing_opt_in: true` and reflects in /auth/me
     - persists `marketing_opt_in: false`
  B. POST /api/admin/broadcast/push with `audience` field:
     - 'opted_in' (default in UI) returns audience='opted_in' in response
     - 'all' returns audience='all'
     - invalid audience values → 400
  C. UserPublic shape now includes phone + marketing_opt_in.
  D. Loyalty page: /api/loyalty/program shape unchanged for Rewards page
     consumption (sanity regression).
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


def _admin_token():
    r = requests.post(f"{API}/auth/token", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    r.raise_for_status()
    return r.json()["access_token"]


def _new_user(phone="0412345678"):
    email = f"v{uuid.uuid4().hex[:8]}@gmail.com"
    requests.post(
        f"{API}/auth/register",
        json={"name": "Pref Tester", "email": email, "password": "GoodPass1", "phone": phone},
        timeout=15,
    ).raise_for_status()
    tok = requests.post(
        f"{API}/auth/token", json={"email": email, "password": "GoodPass1"}, timeout=15
    ).json()["access_token"]
    return email, tok


# ---------- A. Preferences ----------
def test_preferences_requires_auth():
    r = requests.patch(f"{API}/auth/me/preferences", json={"marketing_opt_in": True}, timeout=15)
    assert r.status_code in (401, 403)


def test_preferences_rejects_empty_payload():
    _, tok = _new_user()
    r = requests.patch(
        f"{API}/auth/me/preferences",
        json={"unsupported_key": True},
        headers={"Authorization": f"Bearer {tok}"},
        timeout=15,
    )
    assert r.status_code == 400


def test_preferences_persists_opt_in_toggle():
    _, tok = _new_user()
    # default should be False
    r0 = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {tok}"}, timeout=15)
    assert r0.json()["marketing_opt_in"] is False

    # opt in
    r1 = requests.patch(
        f"{API}/auth/me/preferences",
        json={"marketing_opt_in": True},
        headers={"Authorization": f"Bearer {tok}"},
        timeout=15,
    )
    assert r1.status_code == 200
    assert r1.json()["marketing_opt_in"] is True

    # confirm via /me
    r2 = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {tok}"}, timeout=15)
    assert r2.json()["marketing_opt_in"] is True

    # opt out
    r3 = requests.patch(
        f"{API}/auth/me/preferences",
        json={"marketing_opt_in": False},
        headers={"Authorization": f"Bearer {tok}"},
        timeout=15,
    )
    assert r3.json()["marketing_opt_in"] is False


# ---------- B. Audience-aware broadcast ----------
def test_broadcast_audience_opted_in():
    tok = _admin_token()
    r = requests.post(
        f"{API}/admin/broadcast/push",
        json={"title": "Combo drop", "body": "Brekie", "audience": "opted_in"},
        headers={"Authorization": f"Bearer {tok}"},
        timeout=20,
    )
    assert r.status_code == 200
    body = r.json()
    assert body["audience"] == "opted_in"
    assert "sent" in body


def test_broadcast_audience_all():
    tok = _admin_token()
    r = requests.post(
        f"{API}/admin/broadcast/push",
        json={"title": "All-points", "body": "Body", "audience": "all"},
        headers={"Authorization": f"Bearer {tok}"},
        timeout=20,
    )
    assert r.status_code == 200
    body = r.json()
    assert body["audience"] == "all"


def test_broadcast_rejects_invalid_audience():
    tok = _admin_token()
    r = requests.post(
        f"{API}/admin/broadcast/push",
        json={"title": "X", "body": "Y", "audience": "marketing-only"},
        headers={"Authorization": f"Bearer {tok}"},
        timeout=15,
    )
    assert r.status_code == 400


# ---------- C. UserPublic shape ----------
def test_userpublic_shape_includes_phone_and_optin():
    _, tok = _new_user(phone="0412349999")
    r = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {tok}"}, timeout=15)
    assert r.status_code == 200
    body = r.json()
    assert body["phone"] == "0412349999"
    assert body["marketing_opt_in"] is False


# ---------- D. Loyalty regression ----------
def test_loyalty_program_shape_for_rewards_page():
    r = requests.get(f"{API}/loyalty/program", timeout=15)
    assert r.status_code == 200
    body = r.json()
    # Rewards page reads: tiers list, accrual string, optional needs_setup flag
    assert isinstance(body.get("tiers"), list)
    assert "accrual" in body
