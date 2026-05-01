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

### 2026-04-26 — Iteration 10 (defects + Square Loyalty)
- **Stricter signup validation** (anti-spam):
  - Name: 2–60 letters/spaces/hyphen/apostrophe (international-friendly via Unicode ranges)
  - Password: 8+ chars, must include at least one letter AND one digit
  - Phone: optional AU mobile/landline (E.164 `+61…` or local `0…` accepted)
  - Disposable email domains blocked (mailinator, guerrillamail, yopmail, etc.)
  - Web `/signup` shows live rule indicators (green tick / red cross). Mobile `RegisterScreen` mirrors the same rules.
- **Square POS → website 2-way sync**:
  - New `services/square_catalog.py` — fetches Square `catalog.list(types='ITEM')` and reflects each item's per-location availability into `menu_items.is_available` (best-effort name match).
  - New admin endpoint `POST /api/admin/sync/square-menu` + "Sync from Square" button on the Admin → Menu tab.
  - Webhook handler now reacts to `catalog.version.updated` and `inventory.count.updated` by triggering the same sync as a background task.
- **Square Loyalty integration** (rules: 1pt/$1, 100pts = free chai, 200pts = $5 off):
  - New `services/loyalty.py` wrapper around `client.loyalty.{programs,accounts,rewards}`.
  - New `routers/loyalty.py` exposes `/api/loyalty/{program,me,calculate,redeem,redeem/{id}/finalize}`.
  - Order pipeline now chains `sync_account_for_order` after each Square order push so the customer's Square balance + tier accrue automatically when they have a phone.
  - `/api/loyalty/me` and `/api/loyalty/program` **degrade gracefully** when the Square merchant has not yet created a Loyalty program in their Dashboard — returns local fallback tiers (`100 pts = free chai`, `200 pts = $5 off`) and `needs_setup:true` so the UI keeps rendering.
  - Account page renders a new "Chaioz Loyalty" card with Redeem buttons (disabled until balance ≥ tier).
- **Test coverage**: 119/119 pytest pass (105 regression + 14 new iter10 tests).

## How to enable Square Loyalty (manual step for the operator)
1. Go to https://squareupsandbox.com → Dashboard → **Loyalty** → **Create a program**.
2. Set the program name (e.g. "Chaioz Rewards"), accrual rule (1 point per AU$1), and create two reward tiers:
   - 100 points → "Free chai" (free-item reward → pick the Karak Classic SKU)
   - 200 points → "$5 off" (fixed discount → AU$5.00)
3. Hit **Save**. No code change needed — `/api/loyalty/program` and `/api/loyalty/me` automatically pick it up.
4. (Optional) Switch `SQUARE_ENVIRONMENT` to `production` in `backend/.env` and re-do steps 1-3 in the production dashboard before launch.

### 2026-04-26 — Iteration 12 (Rewards page fix + opt-in + EAS runbook)
- **🔧 Bug fix — Square Loyalty wasn't showing on the Rewards page (`/loyalty`)**. The page was hardcoded to membership tiers (Bronze/Silver/Gold) only. Rewrote it to fetch `/api/loyalty/program` + `/api/loyalty/me`, render real reward tiers (100pt Free chai, 200pt $5 off) with Redeem buttons (signed-in) or Sign-up CTAs (anon), and **initialise with local fallback tiers** so the section always renders even if the API is slow / fails.
- **"Notify me when a new combo drops" opt-in** — three-touchpoint rollout:
  - User-side toggle on web Account page + mobile AccountScreen (Bell icon row with descriptive subtext "Marketing pushes only — order alerts always come through").
  - New endpoint `PATCH /api/auth/me/preferences` (currently accepts `marketing_opt_in`; designed to extend with email/SMS toggles later).
  - Admin Broadcast tab now has an **audience selector**: "Opted-in customers" (recommended default, safer for sender reputation) vs "Everyone" (service alerts only). Confirmation dialog spells out the audience explicitly to prevent fat-finger sends.
  - `services/push.py` `broadcast()` now filters by `audience='opted_in'` (only `users.marketing_opt_in:true`) or `'all'` (users + anonymous `device_tokens`).
  - `UserPublic` now exposes `phone` and `marketing_opt_in`.
- **EAS / TestFlight runbook** — `/app/mobile/TESTFLIGHT_RUNBOOK.md`. Step-by-step guide covering: one-time `eas init`, first iOS + Android builds + submit, universal-link wiring (Apple Team ID + Android SHA-256 → backend `.env` + `public/.well-known/*`), inviting beta testers, OTA updates via `eas update`, and a Troubleshooting matrix. Cannot run `eas build` from the agent (needs operator's Expo + Apple credentials) — runbook is the deliverable.
- **Test coverage**: 124/124 pytest pass (105 regression + 11 iter11 + 8 new iter12 tests).

### 2026-04-26 — Iteration 11 (mobile deepening — push, deep-links, EAS)
- **Push notifications via Expo Push Service** (free, no SDK):
  - New `services/push.py` (HTTPS POST to https://exp.host/--/api/v2/push/send) + `routers/devices.py` (`/api/devices/{register,unregister}`).
  - 5 trigger sources wired across the codebase: order_confirmed (orders.create_order), order_ready (admin status update + Square `PREPARED` webhook), abandoned_cart (cart_recovery loop), loyalty_milestone (loyalty.sync_account_for_order — fires only on first crossing of 100 / 200 pts), marketing_broadcast (admin-triggered).
  - Anonymous device tokens are stored in a separate `device_tokens` collection so abandoned-cart pings still reach logged-out devices; on login the token is promoted onto the user via `$addToSet` (de-duping idempotently).
- **Deep-linking** (URI scheme `chaioz://` + universal links `https://chaioz.com.au/{order/:id, menu, account, loyalty}`):
  - `mobile/src/lib/linking.js` — React Navigation linking config.
  - `mobile/src/lib/notifications.js` — push tap routes through `pathForPush()` to the right screen.
  - AASA + Android `assetlinks.json` generated at `frontend/public/.well-known/*` for static hosting at chaioz.com.au, and mirrored at `GET /api/well-known/{apple-app-site-association,assetlinks.json}` on the backend (proxy-friendly).
- **Marketing broadcast UI** — new "Broadcast" tab on `/admin` with title (≤80) + body (≤200) inputs + character counters. Hits `POST /api/admin/broadcast/push` which fan-outs to every registered device.
- **EAS build profiles** — `mobile/eas.json` with development / preview / production targets. README rewritten with full TestFlight + Play Store flow.
- **Apple/Google Pay deferred** — kept Square sandbox `square_mock` for mobile day-1 to avoid native module requirements.
- **Test coverage**: 116/116 pytest pass (105 regression + 11 new iter11 tests).

## How to enable push notifications + deep links (manual steps)
1. **Create the Expo project** (one-time): `cd /app/mobile && yarn global add eas-cli && eas login && eas init` — this fills `app.json → extra.eas.projectId` automatically.
2. **First EAS build** of either platform: `eas build --profile preview --platform ios|android` — for iOS this also registers the Apple Team ID with EAS; copy that ID into `backend/.env → APPLE_TEAM_ID=...` and into `frontend/public/.well-known/apple-app-site-association` (replace `TEAMIDXXXX`). For Android, copy the SHA-256 fingerprint EAS prints into `frontend/public/.well-known/assetlinks.json`.
3. **Host `.well-known/*` on chaioz.com.au** — Apple/Google fetch these from the production domain only. Either:
   - Deploy `frontend/public/.well-known/*` as part of the website's static build, or
   - Proxy `chaioz.com.au/.well-known/*` to `https://api.chaioz.com.au/api/well-known/*`.
4. **Push: no extra keys required** for Expo's default service. If you ever switch to FCM or APNs directly you'll need a `google-services.json` (Android) and Apple Push key (iOS).

### 2026-04-23 — Iteration 8 (webhooks + admin combo UI)
- **Square webhook handler**: `POST /api/webhooks/square` receives `order.updated` / `payment.updated` events from Square POS, verifies HMAC-SHA256 signature (`SQUARE_WEBHOOK_SIGNATURE_KEY`), maps fulfillment state (PROPOSED→confirmed, RESERVED→preparing, PREPARED→ready, COMPLETED→completed, CANCELED→cancelled) back onto our local order doc, and auto-fires the "order is ready" SMS when staff taps PREPARED on the Square tablet. Health check at `GET /api/webhooks/square/health`. NOTE: `SQUARE_WEBHOOK_SIGNATURE_KEY` is intentionally empty until the user creates the subscription in Square Developer Dashboard → paste the generated key into `backend/.env` → `sudo supervisorctl restart backend` to enable signature verification.
- **Admin Combo CRUD UI**: new "Combos" tab on `/admin` page. `ComboEditor` dialog with multi-select item search + live "save $X" calculation. Create / edit / delete wired to existing `/api/admin/combos` endpoints.
- **PUT /admin/combos/{id}** now returns the updated combo doc (was `{ok:true}`) for API shape consistency.
- **Test coverage**: 85/85 pytest pass (10 new iter8 tests including signed-webhook verification + admin combo CRUD).

## How to enable the Square webhook subscription (manual step)
1. Go to https://developer.squareup.com/apps → your Chaioz sandbox app.
2. Left sidebar → **Webhooks** → **Subscriptions** → **Add Subscription**.
3. Notification URL: `https://late-night-chai-1.preview.emergentagent.com/api/webhooks/square`
4. API Version: latest (e.g. `2026-01-22`).
5. Event types: `order.updated`, `payment.updated`.
6. Copy the generated **Signature Key** → paste into `/app/backend/.env` as `SQUARE_WEBHOOK_SIGNATURE_KEY=...` → `sudo supervisorctl restart backend`.
7. Test with the Square "Send Test Event" button — you should see `matched:true` in the response.

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
- **Go-live prep**: wire real Resend + Twilio + Uber credentials; flip Square to Production; create the Square webhook subscription (see "How to enable" section above).
- **Square webhook**: ✅ done. Awaiting user to paste `SQUARE_WEBHOOK_SIGNATURE_KEY` from Square Developer Dashboard.
- **Admin Combo CRUD UI**: ✅ done.

### P2
- Subscription products via Stripe (monthly chai packs)
- Starter chai kit bundles on Store page
- Loyalty QR codes for in-store scanning
- Referral system
- Apple/Google Pay on web checkout

## Test credentials
- Admin: `chaiozadl@gmail.com` / `Chaioz@2026` (rotated 2026-04-30 — old `admin@chaioz.com.au` deleted)
- Mobile-flow test account: registers dynamically per test run

### 2026-04-30 — Iteration 16 (Square POS diagnostics + production-safe payment flow)
- **Production-safe Square payment flow**: `create_sandbox_payment()` now short-circuits with `{skipped: true}` whenever `SQUARE_ENVIRONMENT != "sandbox"`. The sandbox test nonce `cnon:card-nonce-ok` is rejected by Square production and was blowing up the sync pipeline. In production the order still gets pushed to Square (staff can see it on the tablet/KDS); the order doc records `square_payment_status: "awaiting_pos"` so the Admin UI can show "Pay on tablet".
- **Square diagnostics endpoint**: `GET /api/admin/square/status` returns the active environment, location ID+name (from a live `locations.get` call), access-token presence, and detects env/app-ID mismatches (e.g. `SQUARE_ENVIRONMENT=production` with a sandbox App ID). Clear "Running in sandbox" / "Env mismatch" banners in the UI.
- **Square resync endpoint**: `POST /api/admin/square/resync/{order_id}` — manually re-push an order that failed. Used by a small Retry button on any failed row in the `/admin → Orders` table.
- **Orders table UI**: new `Square` column showing Synced / Pending / Sync-failed with a one-click Retry. Paid/Pay-on-tablet indicator shown on synced rows.
- **Admin Settings**: Square status card now sits above the Email delivery card in the Settings tab.

### 2026-04-30 — Iteration 15 (admin user CRUD + email diagnostics)
- **Admin User Management** (`/admin → Users` tab):
  - Backend: `GET /api/admin/users?q=&role=&limit=&skip=` (search + paginate), `POST /api/admin/users` (create without OTP), `PATCH /api/admin/users/{id}` (name/phone/role/loyalty_points/marketing), `POST /api/admin/users/{id}/reset-password` (force-set), `DELETE /api/admin/users/{id}`. Self-demote and self-delete are blocked server-side.
  - Frontend: `UsersTab.jsx` with search, role filter, paginated table, Create/Edit/Reset-password/Delete dialogs. Generate-password helper produces a 12-char alpha+numeric mix.
- **Email delivery diagnostics** (Settings tab):
  - `GET /api/admin/email/status` returns `{has_resend_key, sender_email, using_sandbox_sender, delivers_to_anyone, fix_steps}`.
  - `POST /api/admin/email/test` sends a one-off test through the same Resend wiring as customer OTPs.
  - `EmailDeliveryCard.jsx` surfaces the status with traffic-light colors + step-by-step fix instructions when stuck on the Resend sandbox sender.
- **Hardened admin seed defaults**: `seed_admin()` defaults `ADMIN_EMAIL=chaiozadl@gmail.com` and `OLD_ADMIN_EMAIL=admin@chaioz.com.au` so a production deploy whose env-var config wasn't updated still rotates the admin correctly.

### 2026-04-30 — Iteration 14 (admin rotation, OTP signup gate, settings backfill, change password)
- **Admin email rotation**: `seed_admin()` now reads `OLD_ADMIN_EMAIL` (comma-separated) and deletes those users on boot. Default admin switched to `chaiozadl@gmail.com`. Idempotent — survives restarts.
- **Operational settings auto-seeded on boot**: `seed_settings()` backfills `pickup_only` + `soft_launch_banner` if missing. Default = pickup-only ON + soft-launch banner. Operator changes via `/admin → Settings` are NOT overwritten.
- **Soft-launch banner now visible site-wide**: moved inside `<Header>` so it sits above the fixed nav (was hidden behind it).
- **Checkout pickup-only enforcement**: `/checkout` reads `/api/settings.pickup_only` and replaces the fulfillment toggle with a "Pickup only during soft launch" notice; the delivery toggle is not rendered.
- **OTP signup gate** (anti-spam — user picks email or SMS):
  - `services/otp.py` — bcrypt-hashed 6-digit codes, 10 min TTL, max 5 verify attempts, max 3 sends/hour per identifier, masked target in responses.
  - `routers/auth.py` — `POST /api/auth/signup/{start,verify,resend}`. Legacy `/register` kept for the unshipped mobile RN app.
  - When delivery fails (Resend dev key, missing Twilio creds), the OTP is logged at WARN with `target=` + `code=` so the operator can complete the flow in non-prod. `dev_mode:true` is also returned to the client UI.
  - `Signup.jsx` rewritten as a 2-step form → verify flow with channel selector, masked target display, auto-submit on 6 digits, resend, and "Edit details" back button.
- **SEO + branding fixes**: `index.html` now sets `<title>` to "Chaioz — Authentic Indian Chai Café · North Adelaide", canonical URL `https://chaioz.com.au/`, OG/Twitter meta tags, and an `en_AU` locale.
- **Change password (admin self-serve)**: new `POST /api/auth/change-password` (auth required). Verifies current password, blocks reuse, enforces 8+ chars/letter/digit rule, rotates the JWT cookie. New "Account" tab on `/admin` exposes the form.
- **Test coverage**: 140/140 pytest pass (132 regression + 8 iter14). Old admin email constants in tests updated to the new email.

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
