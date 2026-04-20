from fastapi import APIRouter, Query
from typing import Optional, List

router = APIRouter(prefix="/api/menu", tags=["menu"])

CATEGORY_ORDER = ["Hot Drinks", "Cold Drinks", "Breakfast", "All Day Eats", "Street Food", "Desserts"]


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
async def get_items(category: Optional[str] = None, q: Optional[str] = None):
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
    return items


@router.get("/bestsellers")
async def get_bestsellers():
    from server import db
    items = await db.menu_items.find({"is_bestseller": True, "is_available": True}, {"_id": 0}).sort("sort_order", 1).to_list(20)
    return items


@router.get("/items/{item_id}")
async def get_item(item_id: str):
    from server import db
    item = await db.menu_items.find_one({"id": item_id}, {"_id": 0})
    return item
