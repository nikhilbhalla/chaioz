from fastapi import APIRouter
from typing import Optional

router = APIRouter(prefix="/api/products", tags=["products"])


@router.get("")
async def list_products(category: Optional[str] = None):
    from server import db
    query = {}
    if category:
        query["category"] = category
    products = await db.products.find(query, {"_id": 0}).sort("sort_order", 1).to_list(200)
    return products


@router.get("/{product_id}")
async def get_product(product_id: str):
    from server import db
    return await db.products.find_one({"id": product_id}, {"_id": 0})
