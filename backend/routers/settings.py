"""Public-facing operational settings — read-only mirror of `/api/admin/settings`.
Frontend reads from here on every page load to drive the soft-launch banner,
pickup-only mode, and similar live toggles."""

from fastapi import APIRouter

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("")
async def public_settings():
    from server import db
    doc = await db.settings.find_one({"key": "global"}, {"_id": 0}) or {}
    return {
        "pickup_only": bool(doc.get("pickup_only", False)),
        "soft_launch_banner": doc.get("soft_launch_banner", "") or "",
    }
