"""One-shot migration: pull the canonical menu item list from the live
chaioz.com.au API (still served by Emergent) and copy the correct image
URLs into the new MongoDB. Also copies a few other fields the seed data
doesn't fully populate (description, calories, addons, etc.).

Usage (locally):

    cd backend
    MONGO_URL='mongodb+srv://...' DB_NAME='chaioz' \\
      python scripts/migrate_menu_images.py

Or run it as a one-off command on Railway. Idempotent — safe to re-run.
"""
import os
import sys
import asyncio
import logging
from urllib.parse import urljoin

import httpx
from motor.motor_asyncio import AsyncIOMotorClient

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("migrate")

LIVE_API = "https://chaioz.com.au/api"
# Absolute Emergent CDN host — used to make relative /api/uploads/... paths absolute
EMERGENT_HOST = "https://late-night-chai-1.emergent.host"

# Fields we'll copy from the live record onto the new record (if present)
COPY_FIELDS = [
    "image", "description", "calories", "addons", "sizes",
    "is_bestseller", "is_vegan", "sort_order", "tags",
    "category", "subcategory", "price",
]


def absolutize(url: str) -> str:
    """Turn /api/uploads/... into https://late-night-chai-1.emergent.host/api/uploads/..."""
    if not url:
        return url
    if url.startswith("http://") or url.startswith("https://"):
        return url
    if url.startswith("/"):
        return EMERGENT_HOST + url
    return url


async def main():
    mongo_url = os.environ.get("MONGO_URL")
    db_name = os.environ.get("DB_NAME", "chaioz")
    if not mongo_url:
        log.error("MONGO_URL env var is required")
        sys.exit(1)

    log.info("Fetching menu items from %s ...", LIVE_API)
    async with httpx.AsyncClient(timeout=30.0) as http:
        r = await http.get(f"{LIVE_API}/menu/items")
        r.raise_for_status()
        live_items = r.json()
    log.info("Got %d items from live API", len(live_items))

    log.info("Connecting to MongoDB (%s)…", db_name)
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    existing_count = await db.menu_items.count_documents({})
    log.info("Target DB currently has %d menu_items documents", existing_count)

    matched, updated, inserted, skipped = 0, 0, 0, 0
    for live in live_items:
        name = (live.get("name") or "").strip()
        if not name:
            skipped += 1
            continue

        # Match by name (case-insensitive). Names are unique in the seed data.
        existing = await db.menu_items.find_one({"name": {"$regex": f"^{name}$", "$options": "i"}})

        payload = {k: live[k] for k in COPY_FIELDS if k in live}
        if "image" in payload:
            payload["image"] = absolutize(payload["image"])

        if existing:
            matched += 1
            # Only set fields that actually differ — keeps the diff in mongo logs small
            diff = {k: v for k, v in payload.items() if existing.get(k) != v}
            if diff:
                await db.menu_items.update_one({"_id": existing["_id"]}, {"$set": diff})
                updated += 1
                log.info("  ↻ updated '%s' — %s", name, ", ".join(diff.keys()))
        else:
            # Item exists on live site but not in the new DB — insert it
            payload["name"] = name
            payload["id"] = live.get("id")
            payload["is_available"] = live.get("is_available", True)
            await db.menu_items.insert_one(payload)
            inserted += 1
            log.info("  + inserted '%s'", name)

    log.info("Done. matched=%d  updated=%d  inserted=%d  skipped=%d", matched, updated, inserted, skipped)


if __name__ == "__main__":
    asyncio.run(main())
