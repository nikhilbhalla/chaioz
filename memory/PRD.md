# Chaioz — Product Requirements (Living Doc)

## Original problem statement
Premium, conversion-optimized website + mobile app for **Chaioz** — Adelaide's Indian chai café & late-night social spot.

## Tech decisions
- Website: React (CRA) + Tailwind + Shadcn UI + FastAPI + MongoDB
- Mobile (Phase 2 — kicked off 2026-04-23): React Native + Expo at `/app/mobile`
- Payments: Square (sandbox LIVE — Access Token, App ID, Location ID wired; `cnon:card-nonce-ok` test nonce)
- POS staff notifications: Square Orders API sync LIVE (sandbox) — new website orders push into Square POS → staff view on the existing tablet/KDS
- Delivery: Uber Direct (mock-mode until keys provided)
- Email: Resend (DEV-log mode until `RESEND_API_KEY` set)
- SMS: Twilio (DEV-log mode until keys set)
- Storage: Emergent Object Storage (LIVE)
- Auth: JWT HttpOnly cookie (web) + Bearer token via `/api/auth/token` (mobile)
- Brand: Warm cream + deep teal + saffron; Brioche display + Montserrat body

## What's been implemented

### 2026-04-20 — Phase 1 MVP
Auth, menu (71→73 items), 8 retail products, orders with loyalty, admin stats + chart + order queue, all core pages.

### 2026-04-20 — Iteration 2
Abandoned cart recovery (Resend + Twilio, DEV-log), Instagram oEmbed, admin menu CRUD with image upload, Uber Direct delivery (mock), order-ready SMS, per-item bestseller imagery.

### 2026-04-21 — Iteration 3 (branding re-alignment)
Flipped from dark-mode-primary to warm cream primary theme matching chaioz.com.au. Teal hero overlay, white cards, teal footer, saffron CTAs throughout.

### 2026-04-23 — Iteration 4 (Square POS sync)
- `services/square_pos.py` — Square SDK v44 with `push_order_to_square` + `create_sandbox_payment` + `sync_order_async`
- Wired into `/api/orders` — every new order auto-pushes to Square POS
- Stores `square_order_id` + `square_payment_id` + `square_sync_error` on the order doc
- Staff see website orders on their existing Square tablet/KDS (see README/chat for Sandbox Dashboard login steps)

### 2026-04-23 — Iteration 5 (Phase 1 UX enhancements)
- Time-based DayMode context (Morning/Evening)
- Smart combos strip with "Save $X" badges
- App download banner + exit intent
- Quick reorder + /orders/usual endpoint
- Menu tag filters (quick_breakfast, ready_in_5, under_10, late_night, vegan, sweet, savoury)
- Admin dashboard upgrades: Morning/Evening pie + hourly bar chart

### 2026-04-23 — Iteration 6 & 7 (hardening + mobile kickoff)
- **Square POS bug fix**: `pickup_time='ASAP'` literal was causing `INVALID_TIME` 400s at Square and a 500 on the API (email formatter ValueError). Fixed by coercing to RFC3339 at the top of `create_order` via `_ensure_rfc3339`. Delivery orders now include `schedule_type` + `deliver_at`. Error capture widened (body, not headers; 500→2000 char).
- **Silenced cosmetic 401**: `/api/auth/me` now returns `200 + null` for anonymous visitors (no more console noise).
- **DST-aware Adelaide**: Admin stats `morning_revenue`/`evening_revenue`/`hourly_revenue_today` use `zoneinfo('Australia/Adelaide')` instead of the fixed `+9.5` offset.
- **Admin pie empty state**: shows `No orders yet…` or a hint label when one bucket is $0.
- **MenuItem tags field**: admin-stored tags override name-regex-derived tags; derived tags used as fallback.
- **DB-backed combos**: `db.combos` collection seeded on startup; admin CRUD at `/api/admin/combos`. Partial combos (unresolved referenced items) are now skipped.
- **Reorder hardening**: try/except with `.get()` fallbacks for legacy orders missing fields.
- **`/orders/usual` normalisation**: now strips all size suffix patterns (`(Regular)`, ` - Large`, `: Iced`, `— Small`, etc.).
- **Mobile app kickoff**: `/app/mobile` Expo scaffold with Auth, Menu, Cart, Checkout, Order confirm, Account (see `/app/mobile/README.md`). New `/api/auth/token` endpoint returns JWT in body for mobile Bearer auth.
- **Test coverage**: 75/75 pytest pass (iter1 api + iter2 + iter5 + iter6 + iter7).

## Required environment variables
```
EMERGENT_LLM_KEY=            # set
SQUARE_ACCESS_TOKEN=         # sandbox set
SQUARE_APPLICATION_ID=       # sandbox set
SQUARE_LOCATION_ID=          # sandbox set (LC007H03ZNGT0)
SQUARE_ENVIRONMENT=sandbox   # → 'production' when ready
JWT_SECRET=                  # set

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

### P1 — next
- **Mobile app** — complete Phase 2 work (push notifications via Expo, store submission via EAS Build, Apple/Google Pay via Square In-App SDK, deep-linking).
- **Go-live prep**: wire real Resend + Twilio + Uber credentials; flip Square to Production.
- **Admin Combo CRUD UI**: backend endpoints exist — frontend editor pending.
- **Square webhook** handler for order state sync (Square → our DB) for tablet-side updates.

### P2
- Subscription products via Stripe (monthly chai packs)
- Starter chai kit bundles on Store page
- Loyalty QR codes for in-store scanning
- Referral system
- Apple/Google Pay on web checkout

## Test credentials
- Admin: `admin@chaioz.com.au` / `Chaioz@2026`
- Mobile-flow test account: registers dynamically per test run

## Key file paths
**Backend**
- `backend/{server.py, models.py, seed_data.py, auth_utils.py}`
- `backend/routers/{auth, menu, orders, products, admin, uploads, cart_recovery, delivery}.py`
- `backend/services/{storage, notifications, uber, square_pos}.py`
- `backend/tests/test_chaioz_phase1_iter{1..7}.py` — 75 tests

**Frontend (web)**
- `frontend/src/pages/*`
- `frontend/src/components/{layout/*, admin/*, CartDrawer, MenuItemCard, CombosStrip, DayModeToggle, AppDownloadBanner, ExitIntentModal, WelcomeBack}.jsx`
- `frontend/src/contexts/{AuthContext, CartContext, DayModeContext}.jsx`

**Mobile**
- `/app/mobile/App.js` + `/app/mobile/src/{screens,components,contexts,lib,theme.js}/`
- `/app/mobile/README.md` — run instructions
