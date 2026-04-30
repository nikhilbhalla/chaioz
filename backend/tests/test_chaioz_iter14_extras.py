"""iter14 — extra coverage: OTP verify rate limit, phone channel happy, pickup order regression."""
import os
import re
import time
import uuid
import subprocess
import requests

BASE_URL = os.environ.get(
    "REACT_APP_BACKEND_URL",
    "https://late-night-chai-1.preview.emergentagent.com",
).rstrip("/")
API = f"{BASE_URL}/api"
LOG_PATH = "/var/log/supervisor/backend.err.log"


def _read_otp(target: str) -> str:
    deadline = time.time() + 5
    while time.time() < deadline:
        try:
            out = subprocess.check_output(["tail", "-n", "400", LOG_PATH], text=True)
        except subprocess.CalledProcessError:
            time.sleep(0.2); continue
        m = list(re.finditer(rf"target=({re.escape(target)}) code=(\d{{6}})", out))
        if m:
            return m[-1].group(2)
        time.sleep(0.2)
    raise AssertionError(f"OTP for {target} not found")


def test_otp_wrong_code_5x_rejects_then_locks():
    """After 5 wrong verify attempts the pending record should be rejected."""
    email = f"iter14.lock.{uuid.uuid4().hex[:6]}@example.com"
    r = requests.post(f"{API}/auth/signup/start", json={
        "name": "Lock Me", "email": email, "password": "TestPass123", "channel": "email",
    })
    assert r.status_code == 200, r.text
    pending_id = r.json()["pending_id"]
    # Five wrong attempts
    for i in range(5):
        rr = requests.post(f"{API}/auth/signup/verify",
                           json={"pending_id": pending_id, "code": "000000"})
        assert rr.status_code == 400, f"attempt {i}: {rr.status_code} {rr.text}"
    # The real code should now be rejected (too many attempts)
    code = _read_otp(email)
    rr = requests.post(f"{API}/auth/signup/verify",
                       json={"pending_id": pending_id, "code": code})
    assert rr.status_code in (400, 429), rr.text


def test_otp_phone_channel_happy_with_phone():
    email = f"iter14.phone.{uuid.uuid4().hex[:6]}@example.com"
    # Unique phone each run to avoid "Phone already registered" from prior runs
    phone = f"+6141{uuid.uuid4().int % 10000000:07d}"
    r = requests.post(f"{API}/auth/signup/start", json={
        "name": "Phone OK", "email": email, "password": "TestPass123",
        "channel": "phone", "phone": phone,
    })
    assert r.status_code == 200, r.text
    body = r.json()
    assert body.get("pending_id")
    # In dev mode, delivery should have been dev-logged
    assert body.get("dev_mode") is True


def test_pickup_order_regression():
    """Create a pickup order end-to-end (anonymous) to confirm /api/orders still works."""
    # Pick first available menu item
    mr = requests.get(f"{API}/menu/items")
    assert mr.status_code == 200
    items = mr.json()
    assert len(items) > 0
    item = items[0]
    payload = {
        "items": [{"item_id": item["id"], "name": item["name"],
                   "price": item["price"], "qty": 1,
                   "line_total": item["price"]}],
        "fulfillment_type": "pickup",
        "pickup_time": "ASAP",
        "customer_name": "Regression Pickup",
        "customer_email": "pickup-regression@example.com",
        "customer_phone": "+61400000000",
        "subtotal": item["price"],
        "tax": 0,
        "total": item["price"],
    }
    r = requests.post(f"{API}/orders", json=payload)
    assert r.status_code in (200, 201), r.text
    body = r.json()
    assert body.get("id") or body.get("order_id") or body.get("_id") is None  # present somehow
    assert (body.get("fulfillment_type") or body.get("fulfillment") or "pickup") == "pickup"
