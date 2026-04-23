from fastapi import APIRouter, Query
from typing import Optional, List

router = APIRouter(prefix="/api/menu", tags=["menu"])

CATEGORY_ORDER = ["Hot Drinks", "Cold Drinks", "Breakfast", "All Day Eats", "Street Food", "Desserts"]


def _derive_tags(item: dict) -> list:
    """Compute filter tags for a menu item from its category/price/metadata."""
    tags = []
    cat = item.get("category", "")
    price = float(item.get("price", 0) or 0)
    sub = (item.get("subcategory") or "").lower()
    name = item.get("name", "").lower()

    if price < 10:
        tags.append("under_10")

    # Ready-in-5 — single-SKU drinks/pastries that don't need assembly
    if cat in ("Hot Drinks", "Cold Drinks"):
        tags.append("ready_in_5")
    if any(t in name for t in ("samosa", "bun maska", "puff patty", "pakode", "kulfi", "cheesy chips", "masala chips")):
        tags.append("ready_in_5")

    # Quick breakfast
    if cat == "Breakfast" or "bun" in name or name == "brekie deal":
        tags.append("quick_breakfast")

    # Late night favourites
    if cat in ("Desserts",) or "falooda" in name or "kulfi" in name or "milkcake" in name:
        tags.append("late_night")
    if cat == "Street Food":
        tags.append("late_night")

    # Sweet / savoury
    sweet_cats = {"Desserts"}
    sweet_hints = ("milkcake", "halwa", "cake", "ice cream", "churros", "jamun", "kulfi", "falooda", "nutella")
    if cat in sweet_cats or any(h in name for h in sweet_hints):
        tags.append("sweet")
    else:
        savoury_cats = {"Breakfast", "All Day Eats", "Street Food"}
        if cat in savoury_cats:
            tags.append("savoury")

    if item.get("is_vegan"):
        tags.append("vegan")
    if item.get("is_bestseller"):
        tags.append("bestseller")
    return sorted(set(tags))


def _with_tags(item: dict) -> dict:
    item["tags"] = _derive_tags(item)
    return item


@router.get("/categories")
async def get_categories():
    from server import db
    items = await db.menu_items.find({"is_available": True}, {"_id": 0, "category": 1, "subcategory": 1}).to_list(2000)
    grouped: dict = {}
    for it in items:
        cat = it["category"]
        sub = it.get("subcategory")
        grouped.setdefault(cat, set())
        if sub:
            grouped[cat].add(sub)
    out = []
    for c in CATEGORY_ORDER:
        if c in grouped:
            out.append({"name": c, "subcategories": sorted(list(grouped[c]))})
    return out


@router.get("/items")
async def get_items(
    category: Optional[str] = None,
    q: Optional[str] = None,
    tag: Optional[str] = None,  # filter by single tag
):
    from server import db
    query: dict = {"is_available": True}
    if category:
        query["category"] = category
    if q:
        query["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"description": {"$regex": q, "$options": "i"}},
        ]
    items = await db.menu_items.find(query, {"_id": 0}).sort("sort_order", 1).to_list(2000)
    items = [_with_tags(i) for i in items]
    if tag:
        items = [i for i in items if tag in i["tags"]]
    return items


@router.get("/bestsellers")
async def get_bestsellers():
    from server import db
    items = await db.menu_items.find({"is_bestseller": True, "is_available": True}, {"_id": 0}).sort("sort_order", 1).to_list(20)
    return [_with_tags(i) for i in items]


@router.get("/combos")
async def get_combos():
    """Smart curated combos with savings."""
    from server import db
    items_by_name = {i["name"]: i async for i in db.menu_items.find({"is_available": True}, {"_id": 0})}

    def total(names):
        return round(sum(items_by_name.get(n, {}).get("price", 0) for n in names), 2)

    combos = [
        {
            "id": "brekie-combo",
            "name": "Brekie Combo",
            "tagline": "Wrap + hashbrown + chai",
            "items": ["Bun Maska", "Karak Classic"],
            "bundle_price": 8.50,
            "badge": "Most popular",
            "icon": "sunrise",
        },
        {
            "id": "late-night-combo",
            "name": "Late Night Ritual",
            "tagline": "Masala chai + pistachio milkcake",
            "items": ["Masala Chai", "Pistachio Milkcake"],
            "bundle_price": 12.90,
            "badge": "Best value",
            "icon": "moon",
        },
        {
            "id": "chaat-combo",
            "name": "Chai + Chaat",
            "tagline": "Karak chai + samosa chaat",
            "items": ["Karak Classic", "Samosa Chaat"],
            "bundle_price": 14.50,
            "badge": "Crowd favourite",
            "icon": "sparkles",
        },
    ]
    out = []
    for c in combos:
        original = total(c["items"])
        savings = round(original - c["bundle_price"], 2)
        # Resolve full item details
        resolved = [items_by_name[n] for n in c["items"] if n in items_by_name]
        out.append({
            **c,
            "items_detail": resolved,
            "original_price": original,
            "save_aud": max(0, savings),
        })
    return out


@router.get("/items/{item_id}")
async def get_item(item_id: str):
    from server import db
    item = await db.menu_items.find_one({"id": item_id}, {"_id": 0})
    return _with_tags(item) if item else None
