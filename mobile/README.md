# Chaioz Mobile — React Native (Expo)

Phase 2 kickoff. Shares the existing backend (`https://late-night-chai-1.preview.emergentagent.com/api`) with the website.

## Run locally

```bash
cd /app/mobile
yarn
npx expo start
```

Scan the QR code in **Expo Go** on your phone (iOS App Store / Google Play).

Or run in simulators:
```bash
yarn ios        # macOS + Xcode required
yarn android    # Android Studio required
yarn web        # browser preview
```

## Architecture
- `src/screens` — one file per screen, matches website pages
- `src/components` — shared UI (buttons, cards, chips)
- `src/contexts` — Auth + Cart state (mirrors website contexts)
- `src/lib/api.js` — axios instance with cookie-based auth via `expo-secure-store`
- `src/theme.js` — design tokens (cream/teal/saffron — matches website)

## What's wired
✅ Auth (register / login / logout / me)
✅ Menu browsing with category tabs + filter chips
✅ Cart (in-memory, persisted to SecureStore)
✅ Checkout — pickup flow, pushes to Square via shared backend
✅ Order confirmation with short_code + pickup time
✅ Account screen (loyalty points, past orders, 1-click reorder)

## What's still TODO (P2 — not in this kickoff)
- [ ] Push notifications (Expo push + server integration)
- [ ] Delivery address autocomplete (Google Places)
- [ ] Apple Pay / Google Pay (Square In-App SDK)
- [ ] Combos strip + time-based hero on home screen
- [ ] Deep-linking for order SMS tracking links
- [ ] CI / EAS Build for store submission

## API base URL
Configured in `app.json` → `extra.apiBaseUrl`. Override at build time via EAS or `app.config.js` if needed.
