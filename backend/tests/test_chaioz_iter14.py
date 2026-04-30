"""iter14 — admin email rotation, settings backfill, OTP signup gate.

These tests hit the running backend over HTTPS (same pattern as iter5..13).
The OTP delivery service is in dev-mode here (Resend dev key), so the OTP code
is logged to the server log instead of sent. We grep the log to retrieve it.
"""
import os
import re
import time
import uuid
import pytest
import requests
import subprocess

BASE_URL = os.environ.get(
    "REACT_APP_BACKEND_URL",
    "https://late-night-chai-1.preview.emergentagent.com",
).rstrip("/")
API = f"{BASE_URL}/api"

LOG_PATH = "/var/log/supervisor/backend.err.log"


def _read_otp_from_log_for(target_email: str, since_offset: int = 0) -> str:
    """Walk the tail of the backend log until we find the OTP for `target_email`.
    `since_offset` lets the caller anchor reads to a particular tail position."""
    deadline = time.time() + 5
    while time.time() < deadline:
        try:
            out = subprocess.check_output(["tail", "-n", "200", LOG_PATH], text=True)
        except subprocess.CalledProcessError:
            time.sleep(0.2)
            continue
        # Find the most recent OTP line for this target.
        m = list(re.finditer(rf"target=({re.escape(target_email)}) code=(\d{{6}})", out))
        if m:
            return m[-1].group(2)
        time.sleep(0.2)
    raise AssertionError(f"OTP for {target_email} not found in backend log")


def test_new_admin_login_works():
    r = requests.post(f"{API}/auth/token", json={"email": "chaiozadl@gmail.com", "password": "Chaioz@2026"})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["access_token"]
    assert body["user"]["role"] == "admin"


def test_old_admin_email_removed():
    r = requests.post(f"{API}/auth/token", json={"email": "admin@chaioz.com.au", "password": "Chaioz@2026"})
    assert r.status_code == 401


def test_settings_endpoint_returns_banner():
    r = requests.get(f"{API}/settings")
    assert r.status_code == 200
    body = r.json()
    assert "pickup_only" in body and isinstance(body["pickup_only"], bool)
    assert isinstance(body.get("soft_launch_banner"), str)
    assert len(body["soft_launch_banner"]) > 0


def test_otp_signup_full_happy_path():
    email = f"iter14.happy.{uuid.uuid4().hex[:6]}@example.com"
    r = requests.post(f"{API}/auth/signup/start", json={
        "name": "Iter Fourteen",
        "email": email,
        "password": "TestPass123",
        "channel": "email",
    })
    assert r.status_code == 200, r.text
    pending_id = r.json()["pending_id"]

    code = _read_otp_from_log_for(email)

    # Wrong code
    r = requests.post(f"{API}/auth/signup/verify", json={"pending_id": pending_id, "code": "000000"})
    assert r.status_code == 400

    # Right code
    r = requests.post(f"{API}/auth/signup/verify", json={"pending_id": pending_id, "code": code})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["email"] == email
    assert body["loyalty_points"] == 100

    # Login should now succeed
    r = requests.post(f"{API}/auth/token", json={"email": email, "password": "TestPass123"})
    assert r.status_code == 200


def test_otp_signup_blocks_duplicate_email():
    r = requests.post(f"{API}/auth/signup/start", json={
        "name": "Dup Test",
        "email": "chaiozadl@gmail.com",
        "password": "TestPass123",
        "channel": "email",
    })
    assert r.status_code == 400
    assert "registered" in r.json()["detail"].lower()


def test_otp_signup_phone_channel_requires_phone():
    r = requests.post(f"{API}/auth/signup/start", json={
        "name": "Phone Test",
        "email": f"phone.test.{uuid.uuid4().hex[:6]}@example.com",
        "password": "TestPass123",
        "channel": "phone",
    })
    assert r.status_code == 400


def test_otp_resend_works():
    email = f"iter14.resend.{uuid.uuid4().hex[:6]}@example.com"
    r = requests.post(f"{API}/auth/signup/start", json={
        "name": "Re Send",
        "email": email,
        "password": "TestPass123",
        "channel": "email",
    })
    assert r.status_code == 200
    pending_id = r.json()["pending_id"]
    code1 = _read_otp_from_log_for(email)

    r = requests.post(f"{API}/auth/signup/resend", json={"pending_id": pending_id})
    assert r.status_code == 200
    # Wait briefly for the new code line to land
    time.sleep(0.5)
    code2 = _read_otp_from_log_for(email)
    assert code1 != code2


def test_otp_signup_invalid_password_rejected():
    r = requests.post(f"{API}/auth/signup/start", json={
        "name": "Weak Pass",
        "email": f"weak.{uuid.uuid4().hex[:6]}@example.com",
        "password": "short",
        "channel": "email",
    })
    assert r.status_code == 422
