"""Uber Direct delivery endpoints."""
from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
from typing import List, Optional

from services.uber import create_quote, verify_webhook_signature, is_live

router = APIRouter(prefix="/api/delivery", tags=["delivery"])


class AddressIn(BaseModel):
    street_address: List[str]
    city: str
    state: str = "SA"
    zip_code: str
    country: str = "AU"


@router.post("/quote")
async def quote(address: AddressIn):
    q = create_quote(address.model_dump())
    return {
        "id": q.get("id"),
        "fee_aud": round(q.get("fee", 0) / 100, 2),
        "currency": q.get("currency", "AUD"),
        "pickup_duration_min": q.get("pickup_duration", 10),
        "dropoff_eta": q.get("dropoff_eta"),
        "mock": q.get("mock", not is_live()),
    }


@router.post("/webhook/status")
async def delivery_status_webhook(request: Request):
    raw = await request.body()
    sig = request.headers.get("x-uber-signature") or request.headers.get("x-postmates-signature") or ""
    if not verify_webhook_signature(raw, sig):
        raise HTTPException(status_code=401, detail="Invalid signature")
    import json
    payload = json.loads(raw or b"{}")
    from server import db
    delivery_id = payload.get("delivery_id") or payload.get("id")
    status = payload.get("status")
    external_id = payload.get("external_order_id") or payload.get("external_id")
    if external_id and status:
        await db.orders.update_one(
            {"id": external_id},
            {"$set": {
                "delivery_status": status,
                "uber_delivery_id": delivery_id,
            }},
        )
    return {"ok": True}
