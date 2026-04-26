"""Square Catalog → MongoDB sync. Lets staff toggle "out of stock" on the
physical Square POS tablet and have that reflect on the website.

Strategy:
  • Fetch all ITEM_VARIATION objects from Square's catalog (paginated).
  • For each variation, derive availability:
      - present_at_all_locations + (this location not in absent_at_location_ids)
      - or present_at_location_ids includes our SQUARE_LOCATION_ID.
  • Match Square items to our local `menu_items` by **name** (best-effort).
    Operators can keep names aligned via the "Square name → menu name" guide
    in PRD.md.
  • Update `menu_items.is_available` accordingly.

We don't (yet) sync price or images — Square is treated as the inventory
source-of-truth, the website remains the source-of-truth for content.
"""

import asyncio
import logging
from typing import Optional

from services.square_pos import (
    _get_client,
    is_configured as square_configured,
    SQUARE_LOCATION_ID,
    _serialize_square_error,
)

logger = logging.getLogger("chaioz.square.catalog")


def _iter_catalog_objects(client, types: str = "ITEM"):
    """Yield Square catalog objects of the given type(s) handling pagination."""
    cursor = None
    while True:
        kwargs = {"types": types}
        if cursor:
            kwargs["cursor"] = cursor
        resp = client.catalog.list(**kwargs)
        objects = getattr(resp, "objects", None) or []
        for o in objects:
            yield o
        cursor = getattr(resp, "cursor", None)
        if not cursor:
            break


def _is_present_at_location(obj, location_id: str) -> bool:
    """Square location-presence semantics."""
    present_all = getattr(obj, "present_at_all_locations", False)
    present_ids = getattr(obj, "present_at_location_ids", None) or []
    absent_ids = getattr(obj, "absent_at_location_ids", None) or []
    if present_all:
        return location_id not in absent_ids
    return location_id in present_ids


async def sync_menu_availability() -> dict:
    """Pull the catalog from Square and update `menu_items.is_available` on
    items whose name matches. Returns a small report for the admin UI."""
    if not square_configured():
        return {"success": False, "error": "Square not configured"}
    client = _get_client()
    if not client:
        return {"success": False, "error": "Square client init failed"}

    def _fetch():
        out = []
        for obj in _iter_catalog_objects(client, types="ITEM"):
            item = getattr(obj, "item_data", None)
            if not item:
                continue
            name = getattr(item, "name", None) or ""
            present = _is_present_at_location(obj, SQUARE_LOCATION_ID)
            # Item is unavailable if either:
            #   - the item itself isn't present at this location, OR
            #   - all its variations are flagged sold_out / unavailable
            variations = getattr(item, "variations", None) or []
            any_available = False
            for v in variations:
                v_data = getattr(v, "item_variation_data", None)
                if not v_data:
                    continue
                v_present = _is_present_at_location(v, SQUARE_LOCATION_ID)
                v_available_at_loc = getattr(v_data, "available_for_pickup", True)
                v_sellable = getattr(v_data, "sellable", True)
                if v_present and v_available_at_loc and v_sellable:
                    any_available = True
                    break
            if not variations:
                any_available = True  # parent-only items
            out.append({
                "name": name,
                "available": present and any_available,
                "square_id": getattr(obj, "id", None),
            })
        return out

    try:
        items = await asyncio.to_thread(_fetch)
    except Exception as e:
        logger.exception("Square catalog fetch failed: %s", e)
        return {"success": False, "error": _serialize_square_error(e)}

    from server import db
    matched = 0
    flipped = 0
    unmatched = []
    for it in items:
        if not it["name"]:
            continue
        # Case-insensitive name match against our local menu.
        local = await db.menu_items.find_one(
            {"name": {"$regex": f"^{_escape_regex(it['name'])}$", "$options": "i"}},
            {"_id": 0, "id": 1, "is_available": 1},
        )
        if not local:
            unmatched.append(it["name"])
            continue
        matched += 1
        if local.get("is_available") != it["available"]:
            await db.menu_items.update_one(
                {"id": local["id"]},
                {"$set": {"is_available": it["available"], "square_catalog_id": it["square_id"]}},
            )
            flipped += 1

    logger.info("Square catalog sync: matched=%d flipped=%d unmatched=%d", matched, flipped, len(unmatched))
    return {
        "success": True,
        "scanned": len(items),
        "matched": matched,
        "flipped": flipped,
        "unmatched": unmatched[:20],
    }


def _escape_regex(s: str) -> str:
    import re as _re
    return _re.escape(s)
