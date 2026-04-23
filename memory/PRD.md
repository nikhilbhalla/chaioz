# Chaioz — Product Requirements (Living Doc)

## Original problem statement
Premium, conversion-optimized website + mobile app for **Chaioz** — Adelaide's Indian chai café & late-night social spot.

## Tech decisions
- Website: React (CRA) + Tailwind + Shadcn UI + FastAPI + MongoDB
- Mobile (Phase 2): React Native
- Payments: Square (sandbox LIVE — Access Token, App ID, Location ID wired; `cnon:card-nonce-ok` test nonce for payments)
- POS staff notifications: Square Orders API sync LIVE (sandbox) — new website orders push into Square POS so staff see them on the existing tablet/KDS
- Delivery: Uber Direct (mock-mode until keys provided)
- Email: Resend (DEV-log mode until `RESEND_API_KEY` set)
- SMS: Twilio (DEV-log mode until keys set)
- Storage: Emergent Object Storage (LIVE)
- Auth: JWT HttpOnly cookie
- Brand: Warm cream background + deep teal + saffron; Brioche display + Montserrat body — aligned with chaioz.com.au

## What's been implemented

### 2026-04-20 — Phase 1 MVP
Auth, menu (71 items), 8 retail products, orders with loyalty, admin stats + chart + order queue, all core pages.

### 2026-04-20 — Iteration 2
Abandoned cart recovery (Resend + Twilio, DEV-log), Instagram oEmbed, admin menu CRUD with image upload, Uber Direct delivery (mock), order-ready SMS, per-item bestseller imagery.

### 2026-04-21 — Iteration 3 (branding re-alignment)
Flipped from dark-mode-primary to **warm cream primary theme** matching chaioz.com.au. Teal hero overlay, white cards, teal footer, saffron CTAs throughout.

### 2026-04-23 — Iteration 4 (Square POS sync)
- `services/square_pos.py` — Square SDK v44 (`Square` class + `SquareEnvironment`) with `push_order_to_square` + `create_sandbox_payment` + `sync_order_async` background task + retry
- Wired into `routers/orders.py` — every new order auto-pushes to Square POS
- Stores `square_order_id` + `square_payment_id` + `square_sync_error` on the order doc
- Verified end-to-end: local order `0970F5` created Square order `ZmMuibzB9op2NPgWTxkGywQht3RZY` with payment `COMPLETED` in sandbox
- Result: **staff see website orders on their existing Square tablet/KDS with zero behaviour change**

## Required environment variables
```
# Live
EMERGENT_LLM_KEY=            # already set
SQUARE_ACCESS_TOKEN=         # sandbox set
SQUARE_APPLICATION_ID=       # sandbox set
SQUARE_LOCATION_ID=          # sandbox set (LC007H03ZNGT0)
SQUARE_ENVIRONMENT=sandbox   # switch to 'production' when ready

# To enable
RESEND_API_KEY=
SENDER_EMAIL=                # e.g. orders@chaioz.com.au
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
UBER_CLIENT_ID=
UBER_CLIENT_SECRET=
UBER_CUSTOMER_ID=
UBER_WEBHOOK_SIGNING_KEY=
```

## Prioritized backlog

### P0 — next up (user's 10-point enhancement list)
Phase 1 (user-approved scope TBD):
1. Time-based UX — ☀️ Morning / 🌙 Evening mode
2. Smart upsell + bundle engine with "Save $X" badges
3. App download conversion — sticky banner + exit-intent + post-order prompt
4. Quick Order / 1-click reorder + personalisation "Welcome back, [name]"
5. Menu tags + filters (Quick Breakfast, Late Night Fav, Under $10, Ready in 5, Sweet/Savoury)
6. Admin analytics upgrade — morning vs evening split, AOV by hour

### P1
- Automated image library upload (user to share a directory/zip)
- Visual polish pass (once real photography is in)
- Phase 2 — React Native mobile app

### P2
- Square webhook handler for order state sync (Square → our DB)
- Go-live Square production switch
- Subscription products via Stripe
- Referral system

## Test credentials
- Admin: admin@chaioz.com.au / Chaioz@2026

## Key file paths
Backend: `/app/backend/{server.py, models.py, seed_data.py, auth_utils.py}`, `/app/backend/routers/{auth, menu, orders, products, admin, uploads, cart_recovery, delivery}.py`, `/app/backend/services/{storage, notifications, uber, square_pos}.py`
Frontend: `/app/frontend/src/pages/*`, `/app/frontend/src/components/{layout/*, admin/*, CartDrawer, MenuItemCard, ItemCustomizeDialog, InstagramFeed, ChaiozLogo}.jsx`, `/app/frontend/src/contexts/{AuthContext, CartContext}.jsx`
