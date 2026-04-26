# Chaioz Mobile — React Native (Expo)

Shares the same FastAPI backend as the website. Push, deep-linking and EAS build profiles live here.

## Run locally

```bash
cd /app/mobile
yarn
npx expo start
```

Scan the QR code with **Expo Go** on a physical device — push notifications and deep links **only work on a real device** (or a custom dev client / TestFlight build), not in the iOS simulator.

```bash
yarn ios        # macOS + Xcode required
yarn android    # Android Studio required
yarn web        # browser preview (no push / deep links)
```

## EAS Build (for TestFlight / Play Store)

One-time setup:
```bash
yarn global add eas-cli
eas login                       # sign in with the @chaioz Expo account
cd /app/mobile
eas init                        # creates the project, fills app.json → extra.eas.projectId
```

Then any time you want a build:
```bash
eas build --profile preview --platform ios       # internal TestFlight
eas build --profile preview --platform android   # APK for sideload / internal testing
eas build --profile production --platform all    # store-ready
```

After the **first Android build**, EAS prints the SHA-256 cert fingerprint — paste it into:
- `/app/mobile/app.json` (auto-handled by EAS in most cases)
- `/app/frontend/public/.well-known/assetlinks.json` → `sha256_cert_fingerprints`
so universal links open the app directly instead of Chrome.

After EAS gives you the **iOS Team ID**, paste it into:
- `/app/backend/.env` → `APPLE_TEAM_ID=...`
- `/app/frontend/public/.well-known/apple-app-site-association` → `appID` prefix

## Push notifications

Wired end-to-end via `src/lib/notifications.js`:
- Token registration on launch (`POST /api/devices/register`)
- Auto-promotion to logged-in user on `login()` in `AuthContext.js`
- Auto-detach on `logout()` (`POST /api/devices/unregister`)

Backend trigger sources (already shipped):
| Event | Title | Body |
|---|---|---|
| Order created | "Order #ABC confirmed" | "We're brewing — pickup at 10:30am." |
| Order ready (web admin or Square tablet) | "Your chai is ready 🫖" | "Order #ABC — come pick it up." |
| Abandoned cart (>30min) | "Your chai is getting cold 🫖" | "Tap to finish your order." |
| Loyalty milestone (100 / 200 pts) | "You hit 100 pts 🎉" | "Free chai unlocked." |
| Marketing broadcast | _(custom)_ | _(custom — `/admin/broadcast/push`)_ |

To send a test push manually:
```bash
curl -X POST https://exp.host/--/api/v2/push/send \
  -H 'Content-Type: application/json' \
  -d '[{"to":"ExponentPushToken[xxx]","title":"Test","body":"From curl"}]'
```

## Deep-linking

Custom URI scheme: `chaioz://` (works in Expo Go).
Universal links: `https://chaioz.com.au/order/<id>`, `/menu`, `/account`, `/loyalty`.

For universal links to actually open the app (instead of Safari/Chrome) the AASA + `assetlinks.json` files **must be served from chaioz.com.au**:
- `https://chaioz.com.au/.well-known/apple-app-site-association` (no extension, JSON content-type)
- `https://chaioz.com.au/.well-known/assetlinks.json`

These files are pre-generated at:
- `/app/frontend/public/.well-known/apple-app-site-association`
- `/app/frontend/public/.well-known/assetlinks.json`

Backend mirrors them at `/api/well-known/*` if you'd rather proxy from your DNS.

## What's wired
✅ Auth (register with phone validation / login / logout / me)
✅ Menu, Cart, Checkout (Square sandbox), Order confirm, Account
✅ Square Loyalty card + redemption (when sandbox program is configured)
✅ **Push notifications** (5 trigger types listed above)
✅ **Deep-linking** (URI scheme + universal links)
✅ **EAS build profiles** for TestFlight and Play Store
✅ **Marketing broadcast** admin UI on the website

## TODO (after store submission)
- [ ] Apple/Google Pay via Square In-App Payments SDK (deferred — needs custom dev client + Apple Developer)
- [ ] Combos strip + time-based hero on home screen (mirrors website Phase 2)
- [ ] Real Uber Direct integration (mock until keys provided)
