# Chaioz — Product Requirements (Living Doc)

## Original problem statement
Build a premium, conversion-optimized website + (Phase 2) mobile app for **Chaioz** — Adelaide's first authentic Indian chai café & late-night social spot. Goals: increase weekday revenue ($1200/day target), drive mobile app downloads, grow repeat customers via loyalty, sell retail products, enable seamless online ordering (pickup), build emotional brand.

## Tech decisions (user confirmed)
- **Website**: React (CRA) + Tailwind + Shadcn UI + FastAPI + MongoDB (Phase 1 focus)
- **Mobile (Phase 2)**: React Native
- **Payments**: Square POS (MOCKED in Phase 1 until live keys provided)
- **Auth**: Custom JWT (HttpOnly cookie, 7d, SameSite=None+Secure)
- **Assets**: Official brand kit — Brioche (display) + Montserrat (body), teal + saffron palette

## User personas
1. **Late-night regular** — comes in after 9pm, wants 1-click reorder and fast pickup
2. **Weekday professional** — lunch/brekie combo via app, loyalty tier progression
3. **Gift buyer** — discovers retail chai blends/gift boxes on the website
4. **Owner/admin** — needs live stats (today's revenue, AOV, repeat rate) + order queue management

## Core requirements (static)
- Landing page with strong hero, bestsellers, combos, social proof, app-promo CTA
- Full ordering: menu → customise → cart drawer → checkout (pickup scheduling) → confirmation
- E-commerce store (retail chai blends, gift boxes, merch, subscription)
- Loyalty system (Bronze/Silver/Gold tiers, 10 pts per $ spent)
- Customer auth + account (order history, points)
- Admin dashboard (stats, 14-day revenue chart, order status management, menu visibility)
- Dark-mode-first premium brand aesthetic (Brioche display, saffron accents)

## What's been implemented (2026-04-20 — Phase 1 MVP)
- Backend (FastAPI + MongoDB, lifespan auto-seed): auth, menu (71 items from official PDF), 8 retail products, orders with loyalty point accrual, admin stats & management
- Frontend: Landing, Menu (category sidebar + search + customise dialog), Cart drawer, Checkout with pickup slots + mock Square payment, Store, Loyalty (tier progress), Community & Events + IG grid, Login/Signup, Account, Admin dashboard with recharts
- Design: Brioche + Montserrat, deep teal / saffron / cream palette, dark primary theme, grain textures, Indian-café micro-moments
- Testing: 20/20 backend pytest pass; frontend critical flows verified by testing subagent

## Prioritized backlog

### P0 — next up
- Live Square Web Payments SDK integration (swap `square_mock` → real when keys provided)
- Phase 2: React Native mobile app (1-click reorder, push notifications, referral, hidden menu)

### P1
- Abandoned cart recovery (email via Resend) + SMS order-ready (Twilio)
- Instagram Graph API real feed (currently placeholder tiles)
- Subscription product flow (Stripe-backed recurring)
- Delivery (Uber Direct / DoorDash Drive) — currently pickup only
- Admin: menu item CRUD UI (create/edit), not just visibility

### P2
- i18n (Hindi)
- Gift card purchase flow
- Reservations for events
- Sentry + PostHog observability

## Test credentials
- Admin: admin@chaioz.com.au / Chaioz@2026

## Key file paths
Backend: `/app/backend/server.py`, `/app/backend/routers/*`, `/app/backend/seed_data.py`
Frontend: `/app/frontend/src/pages/*`, `/app/frontend/src/components/*`, `/app/frontend/src/contexts/*`
