"""Bulk-import menu photos from a local folder into the website.

For each image file in `SOURCE_DIR`:
  1. Fuzzy-match its filename to a menu item by name (case + punctuation insensitive)
  2. Copy the file into `frontend/public/menu/<slug>.<ext>` so Vercel serves
     it as a static asset (no external storage needed)
  3. Update the matching item's `image` field in MongoDB to `/menu/<slug>.<ext>`

After this runs, commit `frontend/public/menu/*` and push — Vercel will
deploy and the images go live on https://chaioz.com.au/.

Usage:

    MONGO_URL='...' DB_NAME='chaioz' python scripts/bulk_import_menu_images.py
"""
import os
import re
import sys
import shutil
import asyncio
import logging
import difflib
from pathlib import Path

import certifi
from motor.motor_asyncio import AsyncIOMotorClient

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("import-imgs")

REPO_ROOT = Path(__file__).resolve().parents[2]  # …/Chaioz Website Claude
SOURCE_DIR = Path("/Users/nikhilbhalla/Downloads/Chaioz Website/drive-download-20260421T080646Z-3-001")
DEST_DIR = REPO_ROOT / "frontend" / "public" / "menu"
PUBLIC_URL_PREFIX = "/menu"  # Vercel serves frontend/public/ at the root

# A few aliases for files whose names don't quite match menu item names.
# Filename stem (lowercase, alphanumerics only) → DB item name (canonical).
ALIASES = {
    "americandryfruit": "American Dry Fruit Ice Cream",
    "butterchicken": "Butter Chicken Bowl",
    "classicmango": "Classic Mango Ice Cream",
    "channamasala": "Channa Masala Bowl",
    "paneermakhani": "Paneer Makhani Bowl",
    "vegmomos": "Veg Momos (5pcs)",
    "samosa": "Samosa (2pcs)",
    "alootikkisliders": "Aloo Tikki Sliders (2pcs)",
    "jalapenocheesebites": "Jalapeño Cheese Bites (6pcs)",
    "vegtwister": "Veg Twister Wrap",
    "lemonlime": "Lemon Lime Cooler",
    "tahitianlime": "Tahitian Lime Mocktail",
    "tandorichickenwrap": "Tandoori Chicken Wrap",
}


def normalise(s: str) -> str:
    """Lowercase, strip extension, drop non-alphanumerics."""
    s = Path(s).stem.lower()
    return re.sub(r"[^a-z0-9]", "", s)


def slugify(name: str) -> str:
    """Make a URL-safe slug from a menu item name."""
    s = re.sub(r"[^\w\s-]", "", name.lower())
    return re.sub(r"[\s_]+", "-", s).strip("-")


async def main():
    mongo_url = os.environ.get("MONGO_URL")
    db_name = os.environ.get("DB_NAME", "chaioz")
    if not mongo_url:
        log.error("MONGO_URL is required")
        sys.exit(1)

    if not SOURCE_DIR.exists():
        log.error("Source folder not found: %s", SOURCE_DIR)
        sys.exit(1)
    DEST_DIR.mkdir(parents=True, exist_ok=True)

    client = AsyncIOMotorClient(mongo_url, tlsCAFile=certifi.where())
    db = client[db_name]

    items = await db.menu_items.find({}, {"_id": 1, "name": 1}).to_list(None)
    by_norm = {normalise(it["name"]): it for it in items}
    canonical_names = list(by_norm.keys())
    log.info("Loaded %d menu items from DB", len(items))

    image_files = [
        p for p in SOURCE_DIR.iterdir()
        if p.is_file() and p.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"}
    ]
    log.info("Found %d image files in %s", len(image_files), SOURCE_DIR)

    matched, unmatched, copied = 0, [], 0
    matches_made = set()  # to detect duplicate matches

    for img in sorted(image_files):
        key = normalise(img.name)

        # 1. Try alias table
        if key in ALIASES:
            target_item = by_norm.get(normalise(ALIASES[key]))
        else:
            # 2. Direct lookup by normalised name
            target_item = by_norm.get(key)
            if not target_item:
                # 3. Fuzzy match — pick the closest menu item name by ratio
                close = difflib.get_close_matches(key, canonical_names, n=1, cutoff=0.55)
                if close:
                    target_item = by_norm[close[0]]

        if not target_item:
            unmatched.append(img.name)
            log.warning("  ✗ no match for '%s'", img.name)
            continue

        if target_item["_id"] in matches_made:
            log.warning("  ⚠ duplicate match: '%s' → '%s' already used", img.name, target_item["name"])
            unmatched.append(f"{img.name} (dup of {target_item['name']})")
            continue
        matches_made.add(target_item["_id"])

        # Copy with slug name
        slug = slugify(target_item["name"])
        dest = DEST_DIR / f"{slug}{img.suffix.lower()}"
        shutil.copy2(img, dest)
        copied += 1

        # Update DB to point at /menu/<slug>.<ext>
        public_url = f"{PUBLIC_URL_PREFIX}/{dest.name}"
        await db.menu_items.update_one(
            {"_id": target_item["_id"]},
            {"$set": {"image": public_url}}
        )
        log.info("  ↻ '%s' → %s", img.name, target_item["name"])
        matched += 1

    log.info("")
    log.info("=== Summary ===")
    log.info("Matched + DB updated : %d", matched)
    log.info("Files copied to repo : %d", copied)
    log.info("Unmatched filenames  : %d", len(unmatched))
    if unmatched:
        for u in unmatched:
            log.info("  - %s", u)

    # Show DB items that still have stale/missing images
    log.info("")
    log.info("=== DB items not given a new image ===")
    leftover = await db.menu_items.find({"_id": {"$nin": list(matches_made)}}, {"name": 1, "image": 1, "_id": 0}).to_list(None)
    for it in leftover:
        log.info("  - %s : %s", it["name"], it.get("image", "")[:60])


if __name__ == "__main__":
    asyncio.run(main())
