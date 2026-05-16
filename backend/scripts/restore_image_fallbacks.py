"""Restore Unsplash placeholder image URLs for every menu item.

Why this exists: we previously migrated menu images to Emergent's CDN
(late-night-chai-1.emergent.host). After we moved off Emergent, the
deployment was taken down and every image URL now returns "Deployment
not found". This script re-applies the curated Unsplash placeholders
from seed_data.py so the menu page renders correctly while the café
re-uploads custom images via the admin panel.

Usage (locally, or as a one-off on Railway):

    cd backend
    MONGO_URL='...' DB_NAME='chaioz' python scripts/restore_image_fallbacks.py
"""
import os
import sys
import asyncio
import logging

import certifi
from motor.motor_asyncio import AsyncIOMotorClient

# We import seed_data to reuse the curated IMG_* constants and the same
# name → image mapping the original menu used.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("restore-imgs")


async def main():
    mongo_url = os.environ.get("MONGO_URL")
    db_name = os.environ.get("DB_NAME", "chaioz")
    if not mongo_url:
        log.error("MONGO_URL is required")
        sys.exit(1)

    # Import seed_data so we get the same name → image map as the original
    # database seed. `menu_items` is a factory function that returns the
    # list of seed dicts.
    from seed_data import menu_items  # noqa: E402

    seed_items = menu_items() if callable(menu_items) else menu_items
    seed_map = {}
    for it in seed_items:
        n = (it.get("name") or "").strip().lower()
        img = it.get("image")
        if n and img:
            seed_map[n] = img
    log.info("Loaded %d seed image mappings", len(seed_map))

    client = AsyncIOMotorClient(mongo_url, tlsCAFile=certifi.where())
    db = client[db_name]

    cursor = db.menu_items.find({}, {"_id": 1, "name": 1, "image": 1})
    items = await cursor.to_list(None)
    log.info("Found %d menu items in DB", len(items))

    updated = 0
    missing = 0
    skipped = 0
    for it in items:
        name = (it.get("name") or "").strip().lower()
        current = it.get("image") or ""
        # We rewrite if the image still points at Emergent's now-dead CDN.
        if "emergent" not in current and "emergentagent.com" not in current:
            skipped += 1
            continue
        new_img = seed_map.get(name)
        if not new_img:
            log.warning("  ✗ no seed image for '%s' — leaving as-is", name)
            missing += 1
            continue
        await db.menu_items.update_one({"_id": it["_id"]}, {"$set": {"image": new_img}})
        log.info("  ↻ %s -> Unsplash", it.get("name"))
        updated += 1

    log.info("Done. updated=%d  missing=%d  skipped=%d", updated, missing, skipped)


if __name__ == "__main__":
    asyncio.run(main())
