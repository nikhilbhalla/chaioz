"""Expo push notification service. Uses Expo's free push API at
https://exp.host/--/api/v2/push/send (no SDK required, just HTTPS POST).

Trigger sources:
  • orders.create_order        → "Got your order #ABC — pickup at 10:30am"
  • admin.update_order_status  → "Your chai is ready"
  • webhooks.square            → "Your chai is ready" (when staff taps PREPARED on Square tablet)
  • cart_recovery.run_recovery → "Your cart is getting cold"
  • loyalty.sync_account       → "100 pts unlocked — free chai!"
  • admin.broadcast            → marketing campaigns

Tokens are stored on the user document under `expo_push_tokens` (a list — a
user might be signed in on iPhone + iPad). Anonymous tokens (logged-out
device) live on a separate `device_tokens` collection keyed by token, so
abandoned-cart pings still work.
"""
import os
import logging
import asyncio
from typing import Optional, Iterable

import httpx

logger = logging.getLogger("chaioz.push")

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"
EXPO_ACCESS_TOKEN = os.environ.get("EXPO_ACCESS_TOKEN", "")  # optional (only needed if your project has push security enabled)


def _is_expo_token(t: str) -> bool:
    return isinstance(t, str) and (t.startswith("ExponentPushToken[") or t.startswith("ExpoPushToken["))


async def _post_to_expo(messages: list) -> dict:
    """Send a batch (Expo's API accepts up to 100 per call)."""
    if not messages:
        return {"sent": 0}
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if EXPO_ACCESS_TOKEN:
        headers["Authorization"] = f"Bearer {EXPO_ACCESS_TOKEN}"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.post(EXPO_PUSH_URL, json=messages, headers=headers)
            r.raise_for_status()
            data = r.json()
        # Expo replies with `data: [...] ` per message — log delivery failures.
        receipts = data.get("data") or []
        for i, rec in enumerate(receipts):
            if rec.get("status") != "ok":
                logger.warning("Expo push failed for msg %d: %s", i, rec)
        return {"sent": len(messages), "receipts": receipts}
    except Exception as e:
        logger.exception("Expo push request failed: %s", e)
        return {"sent": 0, "error": str(e)[:300]}


def _make_message(token: str, title: str, body: str, data: Optional[dict] = None, channel_id: str = "default") -> dict:
    msg = {
        "to": token,
        "title": title[:240],
        "body": body[:1500],
        "sound": "default",
        "priority": "high",
        "channelId": channel_id,  # Android — created in mobile/lib/notifications.js
    }
    if data:
        msg["data"] = data
    return msg


async def send_to_tokens(tokens: Iterable[str], title: str, body: str, data: Optional[dict] = None) -> dict:
    valid = [t for t in tokens if _is_expo_token(t)]
    if not valid:
        return {"sent": 0, "reason": "no valid tokens"}
    # Chunk to 100/request as Expo recommends.
    sent = 0
    errors = 0
    for i in range(0, len(valid), 100):
        batch = [_make_message(t, title, body, data) for t in valid[i:i + 100]]
        res = await _post_to_expo(batch)
        sent += res.get("sent", 0)
        if res.get("error"):
            errors += 1
    return {"sent": sent, "errors": errors}


async def send_to_user(user_id: str, title: str, body: str, data: Optional[dict] = None) -> dict:
    """Look up the user's stored Expo tokens and push to all of them."""
    if not user_id:
        return {"sent": 0}
    from server import db
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "expo_push_tokens": 1})
    if not user:
        return {"sent": 0}
    return await send_to_tokens(user.get("expo_push_tokens") or [], title, body, data)


async def send_to_anon_token(token: str, title: str, body: str, data: Optional[dict] = None) -> dict:
    """Push to a single anonymous device token (e.g. abandoned-cart on a
    logged-out device)."""
    return await send_to_tokens([token], title, body, data)


async def broadcast(title: str, body: str, data: Optional[dict] = None, audience: str = "all") -> dict:
    """Marketing broadcast — pushes to either every device (`audience='all'`)
    or only customers who explicitly opted in (`audience='opted_in'`).
    De-duped by token."""
    from server import db
    tokens: set = set()
    user_filter = {"expo_push_tokens": {"$exists": True, "$ne": []}}
    if audience == "opted_in":
        user_filter["marketing_opt_in"] = True
    async for u in db.users.find(user_filter, {"_id": 0, "expo_push_tokens": 1}):
        for t in u.get("expo_push_tokens") or []:
            tokens.add(t)
    if audience == "all":
        # Anonymous device tokens are always treated as opted-out for marketing
        # (no consent capture before login) — so we only include them on
        # 'all' broadcasts, not on 'opted_in' which is the safer default.
        async for d in db.device_tokens.find({}, {"_id": 0, "token": 1}):
            if d.get("token"):
                tokens.add(d["token"])
    return await send_to_tokens(tokens, title, body, data)
