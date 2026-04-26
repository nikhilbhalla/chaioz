"""Loyalty endpoints — thin layer that surfaces the Square Loyalty service to
the website + mobile app. Everything is scoped to `current_user` so customers
only see their own balance."""

from fastapi import APIRouter, Depends, HTTPException

from auth_utils import get_current_user
from services.loyalty import (
    get_program,
    get_or_create_account,
    get_account,
    create_reward,
    redeem_reward,
    calculate_points_for_amount,
    square_configured,
)

router = APIRouter(prefix="/api/loyalty", tags=["loyalty"])


@router.get("/program")
async def loyalty_program():
    """Public endpoint — used by the web/mobile UI to render reward tiers and
    the "earn 1 pt per $1" copy."""
    if not square_configured():
        return {
            "configured": False,
            "tiers": [
                {"id": "local-100", "name": "Free chai", "points": 100},
                {"id": "local-200", "name": "$5 off", "points": 200},
            ],
            "accrual": "1 pt per $1",
        }
    res = await get_program()
    if not res.get("success"):
        # Likely the merchant hasn't created a Loyalty program in the Square
        # Dashboard yet (sandbox or pre-launch). Surface the local fallback
        # tiers so the UI can still render the rewards section.
        return {
            "configured": False,
            "needs_setup": True,
            "error": res.get("error"),
            "tiers": [
                {"id": "local-100", "name": "Free chai", "points": 100},
                {"id": "local-200", "name": "$5 off", "points": 200},
            ],
            "accrual": "1 pt per $1",
        }
    return {
        "configured": True,
        "program_id": res.get("program_id"),
        "tiers": res.get("tiers") or [],
        "accrual": "1 pt per $1",
    }


@router.get("/me")
async def my_loyalty(user: dict = Depends(get_current_user)):
    """Returns the user's Square loyalty balance + tier list. Falls back to
    the locally-cached `loyalty_points` if Square isn't reachable."""
    fallback = {
        "configured": False,
        "balance": user.get("loyalty_points", 0),
        "lifetime_points": user.get("loyalty_points", 0),
        "tiers": [],
        "account_id": None,
    }
    if not square_configured():
        return fallback

    phone = user.get("phone") or ""
    if not phone:
        return {**fallback, "needs_phone": True}

    acc = await get_or_create_account(phone)
    if not acc.get("success"):
        # Surface the Square error softly — the rest of the page should still
        # render. The most common error here is "no program in Square Dashboard"
        # (404 NOT_FOUND) — once the merchant creates one, this works.
        return {
            **fallback,
            "needs_setup": "no program" in (acc.get("error", "") or "").lower() or "404" in (acc.get("error", "") or ""),
            "error": acc.get("error"),
            "tiers": [
                {"id": "local-100", "name": "Free chai", "points": 100},
                {"id": "local-200", "name": "$5 off", "points": 200},
            ],
        }

    account = acc.get("account") or {}
    account_id = account.get("id")
    program = await get_program()
    tiers = program.get("tiers") if program.get("success") else []

    # Persist mapping locally for fast subsequent calls.
    if account_id and user.get("square_loyalty_account_id") != account_id:
        from server import db
        await db.users.update_one(
            {"id": user["id"]},
            {"$set": {"square_loyalty_account_id": account_id}},
        )

    return {
        "configured": True,
        "account_id": account_id,
        "balance": int(account.get("balance") or 0),
        "lifetime_points": int(account.get("lifetime_points") or 0),
        "tiers": tiers or [],
        "created": acc.get("created", False),
    }


@router.post("/calculate")
async def calculate_points(payload: dict, _: dict = Depends(get_current_user)):
    """Preview-only — returns 'you'd earn N points if you spent $X'."""
    amount = float(payload.get("amount") or 0)
    if amount <= 0:
        raise HTTPException(status_code=400, detail="amount must be > 0")
    res = await calculate_points_for_amount(amount)
    if not res.get("success"):
        # Local fallback (mirrors Square's 1pt/$1 rule).
        return {"points": int(amount), "configured": False}
    return {"points": int(res.get("points") or 0), "configured": True}


@router.post("/redeem")
async def redeem(payload: dict, user: dict = Depends(get_current_user)):
    """Customer-initiated redemption. We create the reward (which holds the
    points) and return the reward_id. The actual redemption fires when staff
    apply it to the matching order in Square."""
    reward_tier_id = payload.get("reward_tier_id") or ""
    order_id = payload.get("square_order_id") or None
    if not reward_tier_id:
        raise HTTPException(status_code=400, detail="reward_tier_id required")

    account_id = user.get("square_loyalty_account_id")
    if not account_id:
        # Lazily fetch via phone
        phone = user.get("phone") or ""
        if not phone:
            raise HTTPException(status_code=400, detail="Add a phone number to your account first")
        acc = await get_or_create_account(phone)
        if not acc.get("success"):
            raise HTTPException(status_code=502, detail=acc.get("error", "Square error"))
        account_id = (acc.get("account") or {}).get("id")
        if not account_id:
            raise HTTPException(status_code=502, detail="Could not find loyalty account")

    res = await create_reward(account_id, reward_tier_id, order_id)
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("error", "Could not create reward"))
    return res


@router.post("/redeem/{reward_id}/finalize")
async def finalize(reward_id: str, _: dict = Depends(get_current_user)):
    """Admin/manual redemption finalize — only needed when the order isn't
    coming from the Orders API integration."""
    res = await redeem_reward(reward_id)
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("error", "Redeem failed"))
    return res
