# Chaioz — Product Requirements (Living Doc)

## Original problem statement
Premium, conversion-optimized website + mobile app for **Chaioz** — Adelaide's Indian chai café & late-night social spot. Weekday revenue target $1,200/day; grow repeat customers via loyalty; sell retail; seamless pickup + delivery ordering; strong emotional brand.

## Tech decisions
- **Website**: React (CRA) + Tailwind + Shadcn UI + FastAPI + MongoDB
- **Mobile (Phase 2)**: React Native
- **Payments**: Square POS (MOCKED — `square_mock`)
- **Delivery**: Uber Direct (MOCK-mode until keys provided — real OAuth2 flow scaffolded)
- **Email**: Resend (DEV-log mode until `RESEND_API_KEY` set)
- **SMS**: Twilio (DEV-log mode until `TWILIO_*` keys set)
- **Storage**: Emergent Object Storage (LIVE)
- **Auth**: Custom JWT in HttpOnly cookie (7d)
- **Assets**: Official brand kit — Brioche display + Montserrat body, teal + saffron palette

## User personas
1. Late-night regular — 1-click reorder, fast pickup
2. Weekday professional — lunch/brekie combo, loyalty tier progression
3. Gift buyer — retail chai blends/gift boxes
4. Delivery customer — Uber Direct door-to-door
5. Owner/admin — live stats, order queue, menu CRUD

## What's been implemented
### 2026-04-20 — Phase 1 MVP
- Auth, menu (71 items from PDF), 8 retail products, orders w/ loyalty (10 pts per $), admin stats + 14d chart + order status queue + menu visibility toggle
- Landing, Menu, Cart drawer, Checkout (pickup + square_mock), Store, Loyalty (tier progress), Community, Account, Admin
- Brioche + Montserrat, deep teal / saffron / cream palette, grain textures, dark-first theme
- 20/20 backend pytest pass

### 2026-04-20 — Iteration 2 (Phase 1 enhancements)
- **Abandoned cart recovery**: `POST /api/cart/snapshot` tracks carts w/ email/phone. Background loop every 5 min sends Resend email + Twilio SMS for carts inactive 30+ min. DEV-mode logs when keys unset.
- **Instagram feed**: oEmbed `blockquote.instagram-media` + embed.js on `/community` (placeholder post URLs — owner can swap)
- **Admin menu CRUD UI**: `MenuItemEditor.jsx` with image upload to Emergent Object Storage, full create/edit/delete via `/api/admin/menu` POST/PUT/DELETE
- **Uber Direct delivery**: `/checkout` fulfillment toggle → address form → `POST /api/delivery/quote` → placement via real Uber SDK flow (falls back to mock when creds missing). `POST /api/orders` now handles `fulfillment='delivery'` + delivery_fee. Delivery status webhook at `/api/delivery/webhook/status` with HMAC verification.
- **Order confirmation email** (Resend) on successful order
- **Order-ready SMS** (Twilio) when admin marks order "ready"
- **Per-item bestseller imagery** — 16 menu items now have distinct Unsplash photos
- 41/41 backend pytest pass (20 iter1 + 21 new)

## Required environment variables (to go LIVE)
```
RESEND_API_KEY=            # https://resend.com/api-keys
SENDER_EMAIL=              # e.g. orders@chaioz.com.au (after DNS verification)
TWILIO_ACCOUNT_SID=        # https://www.twilio.com/console
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=       # E.164, e.g. +61...
UBER_CLIENT_ID=            # https://developer.uber.com/dashboard
UBER_CLIENT_SECRET=
UBER_CUSTOMER_ID=
UBER_WEBHOOK_SIGNING_KEY=
# + Square keys when ready
```

## Prioritized backlog
### P0 — next up
- Live Square Web Payments SDK (swap `square_mock` → real)
- Phase 2: React Native mobile app (1-click reorder, push notifications, referral, hidden menu)

### P1
- Admin UI for retail products CRUD (currently view-only)
- Subscription product flow (Stripe recurring for "Monthly Chai Pack")
- Admin notifications dashboard for dispatch failures
- i18n (Hindi)

### P2
- Gift card purchase flow
- Event reservations
- Sentry + PostHog observability
- Referral system ("Invite a friend, $5 credit")

## Test credentials
- Admin: `admin@chaioz.com.au` / `Chaioz@2026`

## Key file paths
Backend: `/app/backend/{server.py, models.py, seed_data.py, auth_utils.py}`, `/app/backend/routers/{auth, menu, orders, products, admin, uploads, cart_recovery, delivery}.py`, `/app/backend/services/{storage, notifications, uber}.py`
Frontend: `/app/frontend/src/pages/*`, `/app/frontend/src/components/{layout/*, admin/*, CartDrawer, MenuItemCard, ItemCustomizeDialog, InstagramFeed, ChaiozLogo}`, `/app/frontend/src/contexts/{AuthContext, CartContext}.jsx`
