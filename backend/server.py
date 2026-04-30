from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import logging
import uuid
from datetime import datetime, timezone
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient

from auth_utils import hash_password, verify_password
from seed_data import menu_items, retail_products
from services.storage import init_storage
from routers.cart_recovery import recovery_loop

# MongoDB
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("chaioz")


async def seed_admin():
    email = os.environ.get("ADMIN_EMAIL", "admin@chaioz.com.au").lower()
    password = os.environ.get("ADMIN_PASSWORD", "Chaioz@2026")
    existing = await db.users.find_one({"email": email})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "name": "Chaioz Admin",
            "email": email,
            "password_hash": hash_password(password),
            "role": "admin",
            "loyalty_points": 0,
            "loyalty_tier": "Bronze",
            "favorites": [],
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info("Seeded admin user: %s", email)
    elif not verify_password(password, existing["password_hash"]):
        await db.users.update_one(
            {"email": email},
            {"$set": {"password_hash": hash_password(password), "role": "admin"}},
        )
        logger.info("Updated admin password")


async def seed_menu():
    count = await db.menu_items.count_documents({})
    if count == 0:
        docs = []
        for it in menu_items():
            docs.append({
                "id": str(uuid.uuid4()),
                "is_available": True,
                **it,
            })
        await db.menu_items.insert_many(docs)
        logger.info("Seeded %d menu items", len(docs))
    else:
        # Re-sync images only when existing items haven't been manually edited
        updated = 0
        for it in menu_items():
            res = await db.menu_items.update_one(
                {"name": it["name"], "image": {"$in": [None, "", "https://static.prod-images.emergentagent.com/jobs/7ffc6ec8-b182-4519-9a18-5bb47b9cfc96/images/0541d98d204de4f369b3369b8537f36258ac67b686df88d760a0cbf6cee08ece.png", "https://static.prod-images.emergentagent.com/jobs/7ffc6ec8-b182-4519-9a18-5bb47b9cfc96/images/af3bbb81ecdd9f6da2491746b5bcca7b748689b891de11b8d2d3618b4bd6cc5e.png"]}},
                {"$set": {"image": it["image"]}}
            )
            updated += res.modified_count
        if updated:
            logger.info("Refreshed image for %d menu items", updated)


async def seed_products():
    count = await db.products.count_documents({})
    if count == 0:
        docs = []
        for p in retail_products():
            docs.append({"id": str(uuid.uuid4()), **p})
        await db.products.insert_many(docs)
        logger.info("Seeded %d retail products", len(docs))


async def seed_combos():
    """Seed default smart combos — skip if admin has already customised them."""
    count = await db.combos.count_documents({})
    if count > 0:
        return
    defaults = [
        {
            "id": "brekie-combo",
            "name": "Brekie Combo",
            "tagline": "Wrap + hashbrown + chai",
            "items": ["Bun Maska", "Karak Classic"],
            "bundle_price": 8.50,
            "badge": "Most popular",
            "icon": "sunrise",
            "is_active": True,
            "sort_order": 1,
        },
        {
            "id": "late-night-combo",
            "name": "Late Night Ritual",
            "tagline": "Masala chai + pistachio milkcake",
            "items": ["Masala Chai", "Pistachio Milkcake"],
            "bundle_price": 12.90,
            "badge": "Best value",
            "icon": "moon",
            "is_active": True,
            "sort_order": 2,
        },
        {
            "id": "chaat-combo",
            "name": "Chai + Chaat",
            "tagline": "Karak chai + samosa chaat",
            "items": ["Karak Classic", "Samosa Chaat"],
            "bundle_price": 14.50,
            "badge": "Crowd favourite",
            "icon": "sparkles",
            "is_active": True,
            "sort_order": 3,
        },
    ]
    await db.combos.insert_many(defaults)
    logger.info("Seeded %d combos", len(defaults))


async def create_indexes():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.menu_items.create_index("id", unique=True)
    await db.products.create_index("id", unique=True)
    await db.orders.create_index("id", unique=True)
    await db.orders.create_index("user_id")
    await db.combos.create_index("id", unique=True)


@asynccontextmanager
async def lifespan(_: FastAPI):
    await create_indexes()
    await seed_admin()
    await seed_menu()
    await seed_products()
    await seed_combos()
    init_storage()
    # Start cart recovery background loop
    import asyncio as _asyncio
    task = _asyncio.create_task(recovery_loop())
    yield
    task.cancel()
    client.close()


app = FastAPI(title="Chaioz API", lifespan=lifespan)

# CORS — allow all + credentials handled via regex (browsers reject "*" + credentials)
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health
@app.get("/api/")
async def root():
    return {"app": "Chaioz API", "status": "ok"}


# Mount routers (after db is defined so that `from server import db` works in routers)
from routers.auth import router as auth_router  # noqa: E402
from routers.menu import router as menu_router  # noqa: E402
from routers.orders import router as orders_router  # noqa: E402
from routers.products import router as products_router  # noqa: E402
from routers.admin import router as admin_router  # noqa: E402
from routers.uploads import router as uploads_router  # noqa: E402
from routers.cart_recovery import router as cart_router  # noqa: E402
from routers.delivery import router as delivery_router  # noqa: E402
from routers.webhooks import router as webhooks_router  # noqa: E402
from routers.loyalty import router as loyalty_router  # noqa: E402
from routers.devices import router as devices_router  # noqa: E402
from routers.settings import router as settings_router  # noqa: E402

app.include_router(auth_router)
app.include_router(menu_router)
app.include_router(orders_router)
app.include_router(products_router)
app.include_router(admin_router)
app.include_router(uploads_router)
app.include_router(cart_router)
app.include_router(delivery_router)
app.include_router(webhooks_router)
app.include_router(loyalty_router)
app.include_router(devices_router)
app.include_router(settings_router)


# ---------- Universal links: AASA (iOS) + assetlinks.json (Android) ----------
# Apple/Google fetch these from the *production domain* (chaioz.com.au) before
# any deep link resolves into the app. We host them from the API so the user
# can either:
#   (a) Point chaioz.com.au/.well-known/* at this backend via a CDN/proxy, or
#   (b) Copy these JSON blobs to their own static host.
APPLE_TEAM_ID = os.environ.get("APPLE_TEAM_ID", "TEAMIDXXXX")
ANDROID_CERT_FINGERPRINTS = [
    s for s in (os.environ.get("ANDROID_SHA256_FINGERPRINTS", "").split(",")) if s.strip()
]


@app.get("/.well-known/apple-app-site-association")
async def aasa():
    """Served as application/json at the root path so Apple accepts it."""
    return JSONResponse(
        content={
            "applinks": {
                "apps": [],
                "details": [{
                    "appID": f"{APPLE_TEAM_ID}.com.chaioz.app",
                    "paths": ["/order/*", "/menu", "/menu/*", "/account", "/loyalty"],
                }],
            }
        },
        media_type="application/json",
    )


@app.get("/.well-known/assetlinks.json")
async def assetlinks():
    return JSONResponse(
        content=[{
            "relation": ["delegate_permission/common.handle_all_urls"],
            "target": {
                "namespace": "android_app",
                "package_name": "com.chaioz.app",
                "sha256_cert_fingerprints": ANDROID_CERT_FINGERPRINTS or ["FILL_AFTER_FIRST_EAS_BUILD"],
            },
        }],
        media_type="application/json",
    )
