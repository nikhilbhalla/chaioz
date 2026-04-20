"""Uber Direct delivery service with graceful mock fallback."""
import os
import time
import logging
import hmac
import hashlib
import requests
from typing import Optional
from datetime import datetime, timezone, timedelta

logger = logging.getLogger("chaioz.uber")

UBER_CLIENT_ID = os.environ.get("UBER_CLIENT_ID", "")
UBER_CLIENT_SECRET = os.environ.get("UBER_CLIENT_SECRET", "")
UBER_CUSTOMER_ID = os.environ.get("UBER_CUSTOMER_ID", "")
UBER_WEBHOOK_SIGNING_KEY = os.environ.get("UBER_WEBHOOK_SIGNING_KEY", "")
UBER_API_BASE_URL = os.environ.get("UBER_API_BASE_URL", "https://api.uber.com")

STORE_NAME = os.environ.get("STORE_NAME", "Chaioz")
STORE_PHONE = os.environ.get("STORE_PHONE", "+61870060222")
STORE_ADDR = {
    "street_address": [os.environ.get("STORE_ADDRESS_STREET", "Unit 2, 132 O'Connell St")],
    "city": os.environ.get("STORE_ADDRESS_CITY", "North Adelaide"),
    "state": os.environ.get("STORE_ADDRESS_STATE", "SA"),
    "zip_code": os.environ.get("STORE_ADDRESS_ZIP", "5006"),
    "country": os.environ.get("STORE_ADDRESS_COUNTRY", "AU"),
}


def is_live() -> bool:
    return bool(UBER_CLIENT_ID and UBER_CLIENT_SECRET and UBER_CUSTOMER_ID)


_cached_token = {"value": None, "exp": 0}


def _get_token() -> str:
    now = time.time()
    if _cached_token["value"] and _cached_token["exp"] - 60 > now:
        return _cached_token["value"]
    resp = requests.post(
        "https://auth.uber.com/oauth/v2/token",
        data={
            "client_id": UBER_CLIENT_ID,
            "client_secret": UBER_CLIENT_SECRET,
            "grant_type": "client_credentials",
            "scope": "eats.deliveries",
        },
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()
    _cached_token["value"] = data["access_token"]
    _cached_token["exp"] = now + int(data.get("expires_in", 2592000))
    return _cached_token["value"]


def _mock_quote(dropoff_street: str) -> dict:
    """Mocked quote — returns $8.99 + 35 min ETA."""
    return {
        "id": f"mock-quote-{int(time.time())}",
        "fee": 899,  # cents
        "currency": "AUD",
        "pickup_duration": 10,
        "dropoff_eta": (datetime.now(timezone.utc) + timedelta(minutes=35)).isoformat(),
        "mock": True,
        "dropoff_summary": dropoff_street,
    }


def create_quote(dropoff_address: dict) -> dict:
    if not is_live():
        return _mock_quote(dropoff_address.get("street_address", [""])[0])
    try:
        token = _get_token()
        resp = requests.post(
            f"{UBER_API_BASE_URL}/v1/customers/{UBER_CUSTOMER_ID}/delivery_quotes",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json={"pickup_address": STORE_ADDR, "dropoff_address": dropoff_address},
            timeout=30,
        )
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        logger.error("Uber quote failed, falling back to mock: %s", e)
        return _mock_quote(dropoff_address.get("street_address", [""])[0])


def create_delivery(
    quote_id: str,
    dropoff_address: dict,
    dropoff_name: str,
    dropoff_phone: str,
    dropoff_notes: str,
    external_order_id: str,
    items: list,
) -> dict:
    if not is_live() or quote_id.startswith("mock-"):
        return {
            "id": f"mock-delivery-{int(time.time())}",
            "tracking_url": f"https://example.com/mock-track/{external_order_id}",
            "status": "pending",
            "mock": True,
        }
    try:
        token = _get_token()
        body = {
            "quote_id": quote_id,
            "pickup_name": STORE_NAME,
            "pickup_phone_number": STORE_PHONE,
            "pickup_address": STORE_ADDR,
            "dropoff_name": dropoff_name,
            "dropoff_phone_number": dropoff_phone,
            "dropoff_address": dropoff_address,
            "dropoff_notes": dropoff_notes or "",
            "manifest_items": [
                {"name": i["name"], "quantity": int(i.get("qty", 1)), "size": "small"}
                for i in items
            ],
            "external_store_id": "chaioz-north-adelaide",
            "external_id": external_order_id,
        }
        resp = requests.post(
            f"{UBER_API_BASE_URL}/v1/customers/{UBER_CUSTOMER_ID}/deliveries",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json=body,
            timeout=30,
        )
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        logger.error("Uber create delivery failed: %s", e)
        raise


def verify_webhook_signature(raw_body: bytes, signature: str) -> bool:
    if not UBER_WEBHOOK_SIGNING_KEY:
        return True  # dev mode — accept
    expected = hmac.new(
        UBER_WEBHOOK_SIGNING_KEY.encode("utf-8"),
        raw_body,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature or "")
