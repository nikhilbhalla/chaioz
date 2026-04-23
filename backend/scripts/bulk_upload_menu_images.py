"""One-shot utility: fuzzy-match local image files → menu items, upload to
Emergent Object Storage, update MongoDB. Idempotent — safe to re-run."""
import os, sys, re, asyncio, mimetypes
from pathlib import Path
from dotenv import load_dotenv

load_dotenv("/app/backend/.env")
sys.path.insert(0, "/app/backend")

from motor.motor_asyncio import AsyncIOMotorClient
from services.storage import put_object, build_path, init_storage, MIME_FROM_EXT

IMAGES_DIR = Path("/tmp/menu_images")
FRONTEND_BASE = "/api/uploads/public/"  # public access route for the stored objects


def norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]", "", s.lower())


def tokens(s: str) -> set:
    return set(re.findall(r"[a-z0-9]+", s.lower()))


# Manual overrides where the file name differs significantly from the menu item name
ALIASES = {
    "tandoorichickenwrap": "tandoori chicken wrap",
    "tandorichickenwrap": "tandoori chicken wrap",
    "butterchicken": "butter chicken bowl",
    "channamasala": "channa masala bowl",
    "panermakhani": "paneer makhani bowl",
    "paneermakhani": "paneer makhani bowl",
    "vegtwister": "veg twister wrap",
    "veg twister": "veg twister wrap",
    "blueberry&whitechocolatematcha": "blueberry & white chocolate matcha",
    "pistachiosaffron": "kesar chai",  # Pistachio Saffron chai = Kesar Chai
    "kashmirikahwa": "kashmiri kahwa",
    "minttea": "mint tea",
    "karakcoffee": "karak coffee",
    "pinkchai": "pink chai",
    "nutellawrap": "nutella wrap",
    "tahitianlime": "tahitian lime mocktail",
    "lemonlime": "lemon lime cooler",
    "vegmomos": "veg momos (5pcs)",
    "samosa": "samosa (2pcs)",
    "alootikkisliders": "aloo tikki sliders (2pcs)",
    "jalapeñocheesebites": "jalapeño cheese bites (6pcs)",
    "addfries": None,          # not a menu item
    "classicmango": None,      # no clear match; skip
    "americandryfruit": None,  # no clear match; skip
}


def score(file_stem: str, item_name: str) -> float:
    f = tokens(file_stem)
    i = tokens(item_name)
    if not f or not i:
        return 0
    inter = len(f & i)
    union = len(f | i)
    return inter / union  # Jaccard


async def main():
    init_storage()
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]
    menu = await db.menu_items.find({}, {"_id": 0, "id": 1, "name": 1}).to_list(2000)
    print(f"[info] loaded {len(menu)} menu items, scanning /tmp/menu_images")

    files = sorted([p for p in IMAGES_DIR.iterdir() if p.suffix.lower().lstrip(".") in MIME_FROM_EXT])
    print(f"[info] {len(files)} image files found")

    matches = []  # (file, item, score)
    skipped = []
    unmatched_items = set(it["name"] for it in menu)

    for f in files:
        stem = f.stem.strip()
        key = norm(stem)

        # Try alias override first
        if key in ALIASES:
            override = ALIASES[key]
            if override is None:
                skipped.append((f.name, "alias=SKIP"))
                continue
            # find item by name (case-insensitive)
            m = next((it for it in menu if it["name"].lower() == override.lower()), None)
            if m:
                matches.append((f, m, 1.0))
                unmatched_items.discard(m["name"])
                continue

        # Fuzzy match across all items
        scored = [(it, score(stem, it["name"])) for it in menu]
        scored.sort(key=lambda x: -x[1])
        best, best_s = scored[0]
        # Require non-trivial overlap
        if best_s >= 0.4:
            matches.append((f, best, best_s))
            unmatched_items.discard(best["name"])
        else:
            skipped.append((f.name, f"no match (top={best['name']} {best_s:.2f})"))

    # Guard: if the same menu item is matched by multiple files, keep the highest score
    by_item = {}
    for f, it, s in matches:
        cur = by_item.get(it["id"])
        if cur is None or s > cur[2]:
            by_item[it["id"]] = (f, it, s)
    final_matches = list(by_item.values())
    # Items that lost the tie go to skipped
    won_files = {f.name for f, _, _ in final_matches}
    for f, it, s in matches:
        if f.name not in won_files:
            skipped.append((f.name, f"lost to another match for '{it['name']}'"))

    print(f"\n=== MATCH REPORT ({len(final_matches)} uploads queued) ===")
    for f, it, s in sorted(final_matches, key=lambda x: x[1]["name"]):
        print(f"  ✓ {f.name:50s} → {it['name']:40s} (score {s:.2f})")

    if skipped:
        print(f"\n=== SKIPPED ({len(skipped)}) ===")
        for name, reason in skipped:
            print(f"  ⚠️  {name}: {reason}")

    if unmatched_items:
        print(f"\n=== MENU ITEMS WITHOUT A FILE ({len(unmatched_items)}) ===")
        for name in sorted(unmatched_items):
            print(f"  ❌ {name}")

    print(f"\n=== UPLOADING ===")
    ok, fail = 0, 0
    for f, it, s in final_matches:
        ext = f.suffix.lower().lstrip(".")
        ct = MIME_FROM_EXT.get(ext, "image/png")
        path = build_path(ext)
        try:
            data = f.read_bytes()
            result = put_object(path, data, ct)
            import uuid
            from datetime import datetime, timezone
            file_id = str(uuid.uuid4())
            await db.files.insert_one({
                "id": file_id,
                "storage_path": result["path"],
                "original_filename": f.name,
                "content_type": ct,
                "size": result.get("size", len(data)),
                "is_deleted": False,
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
            public_url = f"{FRONTEND_BASE}{result['path']}"
            await db.menu_items.update_one({"id": it["id"]}, {"$set": {"image": public_url}})
            ok += 1
            print(f"  ✅ {it['name']}")
        except Exception as e:
            fail += 1
            print(f"  ❌ {it['name']}: {e}")

    print(f"\n=== DONE: {ok} uploaded, {fail} failed ===")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
