"""Square Loyalty integration — wraps `client.loyalty.{programs,accounts,rewards}`
behind a small async interface our routers and order pipeline can call.

Falls back gracefully when Square is not configured — every public function
returns a `{"success": False, ...}` shape instead of raising, so loyalty
features stay non-blocking for the order checkout path.

Program rules (configured in Square Dashboard, mirrored as a hint here):
  • Accrual: 1 point per AU$1 spent
  • Reward tiers: 100 pts = free chai, 200 pts = $5 off
"""

import os
import uuid
import asyncio
import logging
from typing import Optional

logger = logging.getLogger("chaioz.loyalty")

# Re-use the already-initialised Square client + config
from services.square_pos import (
    _get_client,
    is_configured as square_configured,
    SQUARE_LOCATION_ID,
    SQUARE_CURRENCY,
    _format_phone_e164,
    _cents,
    _serialize_square_error,
)

# Cached program ID so we don't re-fetch on every request.
_program_cache: dict = {"id": None, "tiers": None}


def _resp_to_dict(obj):
    """Square v44 returns pydantic-like model objects. Convert to dict for JSON."""
    if obj is None:
        return None
    if isinstance(obj, dict):
        return obj
    if hasattr(obj, "dict"):
        try:
            return obj.dict()
        except Exception:
            pass
    if hasattr(obj, "model_dump"):
        try:
            return obj.model_dump()
        except Exception:
            pass
    # Fallback: walk public attributes
    return {k: getattr(obj, k) for k in dir(obj) if not k.startswith("_") and not callable(getattr(obj, k))}


async def get_program() -> dict:
    """Fetch the seller's loyalty program. Result cached per-process."""
    if not square_configured():
        return {"success": False, "error": "Square not configured"}
    client = _get_client()
    if not client:
        return {"success": False, "error": "Square client init failed"}

    if _program_cache["id"]:
        return {"success": True, "program_id": _program_cache["id"], "tiers": _program_cache["tiers"]}

    def _call():
        return client.loyalty.programs.get(program_id="main")

    try:
        resp = await asyncio.to_thread(_call)
        program = getattr(resp, "program", None) or resp
        program_d = _resp_to_dict(program)
        program_id = program_d.get("id") if isinstance(program_d, dict) else None
        tiers = program_d.get("reward_tiers", []) if isinstance(program_d, dict) else []
        _program_cache["id"] = program_id
        _program_cache["tiers"] = tiers
        return {"success": True, "program_id": program_id, "tiers": tiers, "program": program_d}
    except Exception as e:
        return {"success": False, "error": _serialize_square_error(e)}


async def search_account_by_phone(phone: str) -> dict:
    """Find an existing loyalty account by phone (E.164)."""
    if not square_configured() or not phone:
        return {"success": False, "error": "no client / phone"}
    client = _get_client()
    e164 = _format_phone_e164(phone)

    def _call():
        return client.loyalty.accounts.search(
            query={"mappings": [{"phone_number": e164}]},
            limit=1,
        )

    try:
        resp = await asyncio.to_thread(_call)
        accounts = getattr(resp, "loyalty_accounts", None) or []
        if accounts:
            return {"success": True, "found": True, "account": _resp_to_dict(accounts[0])}
        return {"success": True, "found": False}
    except Exception as e:
        return {"success": False, "error": _serialize_square_error(e)}


async def create_account(phone: str) -> dict:
    """Create a Square loyalty account for the given phone."""
    if not square_configured() or not phone:
        return {"success": False, "error": "no client / phone"}
    client = _get_client()
    program = await get_program()
    if not program.get("success") or not program.get("program_id"):
        return {"success": False, "error": program.get("error", "no program")}

    e164 = _format_phone_e164(phone)

    def _call():
        return client.loyalty.accounts.create(
            loyalty_account={
                "program_id": program["program_id"],
                "mapping": {"phone_number": e164},
            },
            idempotency_key=str(uuid.uuid4()),
        )

    try:
        resp = await asyncio.to_thread(_call)
        account = getattr(resp, "loyalty_account", None) or resp
        return {"success": True, "account": _resp_to_dict(account)}
    except Exception as e:
        return {"success": False, "error": _serialize_square_error(e)}


async def get_or_create_account(phone: str) -> dict:
    """Idempotent — returns the existing or freshly-created loyalty account."""
    found = await search_account_by_phone(phone)
    if found.get("found"):
        return {"success": True, "account": found["account"], "created": False}
    if not found.get("success"):
        return found
    created = await create_account(phone)
    if created.get("success"):
        return {"success": True, "account": created["account"], "created": True}
    return created


async def get_account(account_id: str) -> dict:
    if not square_configured() or not account_id:
        return {"success": False, "error": "no client / account_id"}
    client = _get_client()

    def _call():
        return client.loyalty.accounts.get(account_id=account_id)

    try:
        resp = await asyncio.to_thread(_call)
        account = getattr(resp, "loyalty_account", None) or resp
        return {"success": True, "account": _resp_to_dict(account)}
    except Exception as e:
        return {"success": False, "error": _serialize_square_error(e)}


async def accumulate_points(account_id: str, square_order_id: str) -> dict:
    """Tell Square to apply the program's accrual rules to the order. Square
    derives points from the order amount (so AU$12 order → 12 points)."""
    if not square_configured() or not account_id or not square_order_id:
        return {"success": False, "error": "missing inputs"}
    client = _get_client()

    def _call():
        return client.loyalty.accounts.accumulate_points(
            account_id=account_id,
            accumulate_points={"order_id": square_order_id},
            location_id=SQUARE_LOCATION_ID,
            idempotency_key=str(uuid.uuid4()),
        )

    try:
        resp = await asyncio.to_thread(_call)
        events = getattr(resp, "events", None) or []
        return {
            "success": True,
            "events": [_resp_to_dict(e) for e in events],
        }
    except Exception as e:
        return {"success": False, "error": _serialize_square_error(e)}


async def adjust_points(account_id: str, points: int, reason: str) -> dict:
    """Manually add (positive) or deduct (negative) points — used for the
    signup bonus and one-off corrections."""
    if not square_configured() or not account_id:
        return {"success": False, "error": "no client / account_id"}
    client = _get_client()

    def _call():
        return client.loyalty.accounts.adjust(
            account_id=account_id,
            adjust_points={"points": int(points), "reason": reason[:100]},
            idempotency_key=str(uuid.uuid4()),
        )

    try:
        resp = await asyncio.to_thread(_call)
        return {"success": True, "event": _resp_to_dict(getattr(resp, "event", None))}
    except Exception as e:
        return {"success": False, "error": _serialize_square_error(e)}


async def calculate_points_for_amount(amount_aud: float) -> dict:
    """Preview how many points an order would earn (used in checkout UI)."""
    if not square_configured():
        return {"success": False, "error": "Square not configured"}
    client = _get_client()
    program = await get_program()
    if not program.get("success") or not program.get("program_id"):
        return {"success": False, "error": program.get("error", "no program")}

    def _call():
        return client.loyalty.programs.calculate(
            program_id=program["program_id"],
            transaction_amount_money={
                "amount": _cents(amount_aud),
                "currency": SQUARE_CURRENCY,
            },
        )

    try:
        resp = await asyncio.to_thread(_call)
        return {
            "success": True,
            "points": getattr(resp, "points", 0) or 0,
        }
    except Exception as e:
        return {"success": False, "error": _serialize_square_error(e)}


async def create_reward(account_id: str, reward_tier_id: str, square_order_id: Optional[str] = None) -> dict:
    """Lock points + create a reward. If `square_order_id` is supplied, Square
    will auto-apply the discount to that order on payment."""
    if not square_configured() or not account_id or not reward_tier_id:
        return {"success": False, "error": "missing inputs"}
    client = _get_client()
    payload = {"loyalty_account_id": account_id, "reward_tier_id": reward_tier_id}
    if square_order_id:
        payload["order_id"] = square_order_id

    def _call():
        return client.loyalty.rewards.create(
            reward=payload,
            idempotency_key=str(uuid.uuid4()),
        )

    try:
        resp = await asyncio.to_thread(_call)
        reward = getattr(resp, "reward", None) or resp
        return {"success": True, "reward": _resp_to_dict(reward)}
    except Exception as e:
        return {"success": False, "error": _serialize_square_error(e)}


async def redeem_reward(reward_id: str) -> dict:
    if not square_configured() or not reward_id:
        return {"success": False, "error": "missing inputs"}
    client = _get_client()

    def _call():
        return client.loyalty.rewards.redeem(
            reward_id=reward_id,
            location_id=SQUARE_LOCATION_ID,
            idempotency_key=str(uuid.uuid4()),
        )

    try:
        resp = await asyncio.to_thread(_call)
        return {"success": True, "event": _resp_to_dict(getattr(resp, "event", None))}
    except Exception as e:
        return {"success": False, "error": _serialize_square_error(e)}


async def sync_account_for_order(user_doc: dict, order_doc: dict) -> Optional[dict]:
    """Background helper called from orders router after a Square order is created.

    Steps:
      1. Get-or-create the customer's Square loyalty account using their phone.
      2. Accumulate points against the Square order.
      3. Pull the latest balance and update the local cache (`user.loyalty_points`).
      4. Fire a push when the user's new balance crosses a reward threshold
         (100 = free chai, 200 = $5 off).
    """
    if not square_configured():
        return None
    phone = order_doc.get("customer_phone") or user_doc.get("phone") or ""
    if not phone:
        return None

    sq_order_id = order_doc.get("square_order_id")
    if not sq_order_id:
        # Fetch from DB in case the sync has just landed.
        from server import db
        latest = await db.orders.find_one({"id": order_doc.get("id")}, {"_id": 0, "square_order_id": 1})
        sq_order_id = (latest or {}).get("square_order_id")
        if not sq_order_id:
            logger.info("No Square order id yet for %s — skipping loyalty accrual", order_doc.get("id"))
            return None

    acc = await get_or_create_account(phone)
    if not acc.get("success"):
        logger.info("Loyalty get_or_create failed: %s", acc.get("error"))
        return None
    account = acc["account"]
    account_id = (account or {}).get("id")
    if not account_id:
        return None

    accumulate = await accumulate_points(account_id, sq_order_id)
    # Re-fetch account for fresh balance (accumulate doesn't always return one)
    fresh = await get_account(account_id)
    balance = ((fresh.get("account") or {}).get("balance")) if fresh.get("success") else None

    from server import db
    update = {"square_loyalty_account_id": account_id}
    if balance is not None:
        update["loyalty_points"] = int(balance)
    if user_doc.get("id"):
        await db.users.update_one({"id": user_doc["id"]}, {"$set": update})
    await db.orders.update_one(
        {"id": order_doc.get("id")},
        {"$set": {
            "square_loyalty_account_id": account_id,
            "square_loyalty_accrued": bool(accumulate.get("success")),
        }},
    )

    # Milestone push — only fire when the user crosses the threshold from
    # below (so we don't spam them on subsequent orders past 100/200).
    if user_doc.get("id") and balance is not None:
        prev_balance = int(user_doc.get("loyalty_points") or 0)
        for threshold, copy in ((100, "free chai unlocked"), (200, "$5 off unlocked")):
            if prev_balance < threshold <= int(balance):
                try:
                    from services.push import send_to_user as _push
                    await _push(
                        user_doc["id"],
                        f"You hit {threshold} pts 🎉",
                        f"{copy.capitalize()} — redeem on your next order.",
                        {"type": "loyalty_milestone", "points": int(balance), "threshold": threshold},
                    )
                except Exception:
                    pass

    return {
        "account_id": account_id,
        "balance": balance,
        "accrued": accumulate.get("success", False),
    }
