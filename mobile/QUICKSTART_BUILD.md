# 🏗️ Run on your laptop (4 commands)

The agent has prepped everything in this repo for EAS. **You** need to run these from your local machine because EAS needs to authenticate against your Expo + Apple Developer accounts in a browser (the agent can't open browsers).

```bash
# 0. Make sure you have Node 20+ and yarn installed
node -v   # should print v20.x or v22.x
yarn -v

# 1. Pull this repo to your machine (skip if already cloned)
git clone <your-emergent-repo-url> chaioz
cd chaioz/mobile

# 2. Install eas-cli + login to your Expo account
yarn global add eas-cli
eas login                  # opens https://expo.dev/login in your browser

# 3. Initialise the project (writes the projectId into app.json)
eas init --id auto

# 4. Kick off the first iOS build (also handles Apple credentials interactively)
eas build --profile preview --platform ios
```

That's it for iOS. Step 4 will take 20–30 minutes in the EAS cloud, then you'll get an `.ipa` URL you can install on your iPhone via the Expo Go app or directly via Apple Configurator.

To submit to TestFlight afterwards:
```bash
eas submit --profile production --platform ios --latest
```

For Android:
```bash
eas build --profile preview --platform android
eas submit --profile production --platform android --latest
```

## What you need before step 2

| For | What |
|---|---|
| `eas login` | Free Expo account (sign up at https://expo.dev) |
| `eas build --platform ios` | Apple Developer account (AU$149/yr — sign up at https://developer.apple.com) |
| `eas submit --platform ios` | Active Apple Developer membership + an App Store Connect "Chaioz" app record (EAS can create one for you on first run) |
| `eas build --platform android` | Nothing — EAS auto-generates an upload key |
| `eas submit --platform android` | Google Play Console account (AU$38 one-time) + a Play Console "Chaioz" app record + a service-account JSON (EAS guides you through this) |

## After the first build

EAS will print:
- **Apple Team ID** (looks like `XYZ123ABCD`) — paste into:
  - `/app/backend/.env` → `APPLE_TEAM_ID=XYZ123ABCD` then `sudo supervisorctl restart backend`
  - `/app/frontend/public/.well-known/apple-app-site-association` → replace `TEAMIDXXXX` in the `appID` field
- **Android SHA-256 cert fingerprint** (looks like `AB:CD:EF:01:23:...`) — paste into:
  - `/app/backend/.env` → `ANDROID_SHA256_FINGERPRINTS=AB:CD:EF:01:23:...`
  - `/app/frontend/public/.well-known/assetlinks.json` → `sha256_cert_fingerprints`

Then deploy `frontend/public/.well-known/*` to `https://chaioz.com.au/.well-known/*` so Apple/Google can verify your app owns the domain (universal links require this).

---

For the full guide including TestFlight invite flow, OTA updates, and troubleshooting → see [TESTFLIGHT_RUNBOOK.md](./TESTFLIGHT_RUNBOOK.md).
