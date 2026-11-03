# Session Log - zippp Android Companion & Telegram Pivot

**Date:** 2026-10-22  
**Repository:** `/Users/mm/Dev/adit/zippp`  
**Last commit:** `b5a371e` (all work below is uncommitted)  
**Current state:** P0 backend, web, and Android debug build complete. Pairing verified. End-to-end capture/extract/append not yet verified.

---

## 1. What this session started with

The session began as a senior architecture and security review of the Android/Telegram pivot:

- Read `AGENTS.md`
- Read `spec/themes/01-mvp/SPEC.md`, `spec/themes/01-mvp/ARCHITECTURE.md`, `spec/themes/01-mvp/USER-FLOW.md`
- Read `src/lib/data-boundary.test.ts`
- Read `src/lib/verify-receipt.ts`
- Read `src/lib/billing/ledger.ts`
- Read the new `spec/themes/02-android-telegram-pivot/SPEC-ANDROID-COMPANION.md` and `spec/themes/02-android-telegram-pivot/android-rollout-plan.md`
- Audited Play compliance, pairing security, data boundaries, receipt grounding, OTA, Telegram, and Android toolchain

The review verdict was **GO WITH AMENDMENTS**. The review is saved at:

```text
spec/themes/02-android-telegram-pivot/reviews/deepseek-review.md
```

The parallel `grok-review.md` is in the same folder.

---

## 2. Architectural decisions locked

The following ten amendments were implemented:

1. **Pairing security:** 8-character Crockford Base32, `XXXX-XXXX`, 40-bit entropy, SHA-256 at rest, 10-minute TTL, `GETDEL` consumption, IP/generation limits.
2. **Device binding and revocation:** JWT includes `device_id`, `jti`, `aud`, `iss`, `ver`, and `scope`; devices are registered in Redis and can be revoked from the web.
3. **Dual distribution:** `play` and `sideload` Android flavors; Play has no GitHub APK install path and no `REQUEST_INSTALL_PACKAGES`; sideload keeps the install permission.
4. **Anti-steering:** mobile maps error codes to neutral copy; no purchase CTAs, no website purchase links, no “kredit”/“saldo” wording in Android.
5. **Request-scoped auth:** `requestUser(req)` resolves bearer token or web cookie; Google helpers receive an explicit `userId`.
6. **Sheet sanitization:** `escapeSheetText()` prefixes `'` to formula starters; no client-supplied `=HYPERLINK(...)` exception.
7. **Append idempotency:** server-issued `scanId`, user-namespaced spend key, 24-hour result cache, duplicate retry returns the original result.
8. **Review integrity:** hard flags block `Terima`; `Ubah` is user attestation; date assumptions and template ops are part of the contract.
9. **Telegram:** admin alerts preserved; user link tokens, private-chat-only linking, webhook secret, `update_id` dedupe, post-spend low-credit alerts.
10. **Android foundation:** SDK 35, Gradle 8.9, AGP 8.7.2, Kotlin 2.0.21, Keystore AES-256-GCM token storage, no backups.

---

## 3. Backend and auth work

### New auth modules

| File | Purpose |
|---|---|
| `src/lib/mobile/config.ts` | `MOBILE_API_ENABLED` gate and fail-closed `MOBILE_JWT_SECRET` policy |
| `src/lib/auth/mobile-token.ts` | HMAC-SHA256 JWT signing and verification, claims, device binding |
| `src/lib/auth/mobile-auth.ts` | Bearer-only resolver with no Google imports, safe for `/api/extract` |
| `src/lib/auth/request-user.ts` | Dual auth: bearer token or web cookie |
| `src/lib/auth/pairing-store.ts` | Crockford code generation, SHA-256 storage, `GETDEL`, rate limits |
| `src/lib/auth/device-store.ts` | Device registry, last-seen updates, revocation, conflict checks |
| `src/lib/mobile/scan-store.ts` | Server-issued scan ownership records |

### New auth routes

| Route | Purpose |
|---|---|
| `POST /api/auth/pair/generate` | Web-session pairing code generation |
| `POST /api/auth/pair/claim` | Public rate-limited code exchange and device registration |
| `GET /api/auth/devices` | Web-only device list |
| `POST /api/auth/device/revoke` | Web-only single or all-device revocation |
| `POST /api/auth/logout` | Mobile revokes its device; web clears session robustly |

### Auth fixes

- `MOBILE_API_ENABLED` is **false by default**.
- Production fails closed if `MOBILE_JWT_SECRET` is missing or shorter than 32 bytes.
- JWT verification checks `alg`, `aud`, `iss`, `ver`, `scope`, `exp`, `iat`, `jti`, `device_id`, and device-to-user ownership.
- Device IDs cannot be reused by another user.
- Revoked devices fail closed; Redis errors do not make a revoked device valid.
- `touchDevice` uses an atomic Lua update so a revoke cannot be overwritten.
- `currentUser()` remains web-only; mobile routes use `requestUser(req)`.

---

## 4. Extract and append work

### `/api/extract`

- Issues a server-side `scanId` for every successful extraction.
- Records scan ownership for mobile users.
- Accepts an optional mobile bearer token; web remains compatible.
- Enforces image size and image content-type limits.
- Keeps the photo path image-only. It imports `mobile-auth`, not the Google-aware `request-user`.
- Data-boundary test extended to cover the mobile auth modules.

### `/api/sheets/append`

- Uses `requestUser(req)` for bearer or cookie auth.
- Loads tokens and workspace with explicit `userId`.
- Validates template ops: staff, outlet, payment, purpose, customer.
- Rejects values outside the workspace staff/outlet lists.
- Applies `sanitizeRows()` before writing.
- Uses `scan:${userId}:${scanId}` idempotency.
- Caches successful results for 24 hours at `scan:result:${userId}:${scanId}`.
- Returns cached success with `duplicate: true` on retry.
- A duplicate spend with no cached result returns `409 SCAN_ALREADY_SENT` instead of false success.
- Mobile appends must use a server-issued scan ID.
- Refunds on append failure, but never refunds after a successful append because a later balance read failed.
- Sends a low-credit Telegram alert after a successful spend.

### Sheet formula safety

- New `src/lib/google/sheet-safe.ts` and `sheet-safe.test.ts`.
- Escapes cells starting with `=`, `+`, `-`, `@`, tab, or carriage return.
- Removed the old `=HYPERLINK(...)` pass-through, which was a client formula-injection bypass.
- Photo links must be constructed server-side after upload; the mobile append body cannot supply formulas.

### Billing and webhook safety

- `corrections` and `billing/balance` now use `requestUser`, so mobile can send correction telemetry and read its balance.
- Telegram top-up alerts added to Kasera QRIS, manual GoPay orders, and Paddle webhooks.
- Alert balance reads are best-effort and never break the payment path.
- Low-credit alerts are deduplicated.

---

## 5. Telegram work

### New modules

| File | Purpose |
|---|---|
| `src/lib/telegram/admin.ts` | Canonical admin alert sender |
| `src/lib/telegram/bot.ts` | Telegram Bot API client, HTML escaping, deep links |
| `src/lib/telegram/store.ts` | Hashed link tokens, chat/user mappings, update dedupe, low-credit dedupe |
| `src/lib/telegram/alerts.ts` | Low-credit, top-up, pairing alerts |
| `src/lib/telegram.ts` | Compatibility re-export for existing `sendTelegram` callers |

### New routes

- `POST /api/telegram/webhook`
- `GET /api/telegram/link`
- `POST /api/telegram/link`

### Telegram behavior

- Link tokens are 32 hex characters, 10-minute TTL, stored hashed.
- Linking is private-chat only.
- One Telegram chat maps to one Zippp user.
- `/start link_<token>`, `/saldo`, `/balance`, `/bantuan`, `/help`, `/unlink` handled.
- Webhook secret is checked with `timingSafeEqual`.
- `update_id` is deduplicated.
- Low-credit, top-up, and pairing alerts contain no purchase links.
- Telegram failures never block billing, append, or pairing.
- Web Settings has a Telegram link/unlink panel.
- Privacy copy now discloses optional Telegram data sharing.

---

## 6. Web UI work

### New components

- `src/components/app/PairDeviceModal.tsx`
  - 8-character code, countdown, real QR code via `qrcode.react`.
  - Wording keys, no hardcoded Indonesian copy.
- `src/components/app/ConnectedDevices.tsx`
  - Lists paired devices, platform, app version, paired/last-seen times.
  - Revoke one device or all devices.
- `src/components/app/TelegramLinkPanel.tsx`
  - Link/unlink Telegram from Settings.

### Settings integration

- Device pairing and connected devices are hidden unless `MOBILE_API_ENABLED=true`.
- Telegram panel is always available.
- `/api/auth/me` now returns `mobileApiEnabled`.
- `AppProvider` `AuthState` includes `mobileApiEnabled`.

### App version

- New `GET /api/app-version` with:
  - `version_code`, `version_name`
  - `min_supported_version_code`
  - `mandatory`
  - `download_url`, `sha256`, `size`
  - `channel` (`sideload` or `play`)
  - `release_notes`
- Play channel returns `play_store_url` and no APK URL.
- Cache-Control is set.

---

## 7. Android work

### Project

- `android/` Gradle project added.
- Gradle 8.9 wrapper, AGP 8.7.2, Kotlin 2.0.21.
- `compileSdk 35`, `targetSdk 35`, `minSdk 26`.
- `play` and `sideload` product flavors.
- `sideload` has `REQUEST_INSTALL_PACKAGES`; `play` does not.
- Java 17 bytecode, JDK 21 Gradle runtime.
- `android/gradle.properties` enables AndroidX.
- `android/README.md` added.
- Release signing scaffold via `keystore.properties.example`.
- Version code/name and API URL can be set with env vars.

### App code

| File | Purpose |
|---|---|
| `MainActivity.kt` | Compose root, token gate, credits |
| `data/Models.kt` | Pair, workspace, receipt, extract, append DTOs |
| `data/ApiClient.kt` | OkHttp client, claim/extract/append, Preview bypass header |
| `data/SecureTokenStore.kt` | Android Keystore AES-256-GCM token storage |
| `ui/pairing/PairingScreen.kt` | 8-character pairing |
| `ui/camera/CameraScreen.kt` | CameraX preview and capture |
| `ui/review/ReviewScreen.kt` | Review, edit merchant/total, hard-flag acknowledgement, Terima/Ubah/Buang |
| `ui/theme/Theme.kt` | Material 3 theme |

### Android resources

- `strings.xml` is generated from `spec/wording.txt` by `scripts/gen-android-strings.mjs`.
- `npm run android:strings` regenerates it.
- `allowBackup=false`.
- Cleartext traffic disabled via network security config.
- No custom scheme deep link (removed to avoid hijack risk while QR is not implemented).

### Current Android limitations

- No QR scanner yet.
- No steady detection or auto-snap yet.
- `Ubah` edits merchant/total only, not line items.
- Template ops are not yet collected on the review screen.
- Correction telemetry is not sent from Android yet.
- No assumed-date pill.
- No photo proof upload.
- No sideload OTA installer.
- No Play In-App Updates integration.
- No offline queue or EXIF stripping.

---

## 8. Docs, copy, and configuration

Updated:

- `AGENTS.md`
- `spec/themes/01-mvp/SPEC.md`
- `spec/themes/01-mvp/ARCHITECTURE.md`
- `spec/themes/02-android-telegram-pivot/SPEC-ANDROID-COMPANION.md` (Rev 3.1)
- `spec/themes/02-android-telegram-pivot/android-rollout-plan.md` (current status section)
- `spec/README.md`
- `spec/wording.txt` (Android, Telegram, device, pairing, privacy copy)
- `.env.example`
- `.gitignore`
- `.vercelignore`
- `package.json` / `package-lock.json` (`qrcode.react`, new test files, Android strings script)
- `android/README.md`
- `android/keystore.properties.example`

New review folder:

```text
spec/themes/02-android-telegram-pivot/reviews/
  deepseek-review.md
  grok-review.md
```

---

## 9. Verification

### Web

```text
npm test
43 tests passed, 0 failed
```

```text
npx tsc --noEmit
pass
```

```text
npm run build
pass
```

### Android

```text
cd android
./gradlew :app:assembleDebug
BUILD SUCCESSFUL
```

Both debug flavors build:

```text
android/app/build/outputs/apk/play/debug/app-play-debug.apk
android/app/build/outputs/apk/sideload/debug/app-sideload-debug.apk
```

A release build was smoke-tested earlier in the session and completed, but release signing was added afterward. Re-run `assembleRelease` before shipping.

### Runtime smoke tests

Local production build:

- `/api/app-version` → 200
- `/api/auth/pair/generate` with mobile disabled → 404
- `/api/extract` without image → 400
- `/api/sheets/append` without auth → 401
- `/api/telegram/webhook` without secret → 401
- `/api/telegram/link` without auth → 401

Preview:

- `/api/auth/me` → `mobileApiEnabled: true`
- Google OAuth redirect accepted after redirect URI was added
- Pairing succeeded on the test APK

---

## 10. Preview deployment

**URL:** `https://preview.zippp.link`

Preview-only environment:

```env
MOBILE_API_ENABLED=true
MOBILE_JWT_SECRET=<generated, not recorded here>
GOOGLE_REDIRECT_URI=https://preview.zippp.link/api/auth/callback
```

Google OAuth redirect URI added by the user:

```text
https://preview.zippp.link/api/auth/callback
```

Vercel SSO protection was restored after testing. The test APK contains a Preview-only automation bypass header so it can reach the protected Preview API. Do not distribute this APK.

Production remains untouched:

- No `MOBILE_API_ENABLED` in Production
- No `MOBILE_JWT_SECRET` in Production
- Mobile endpoints stay dark on `zippp.link`

---

## 11. Test APK

```text
/Users/mm/Dev/adit/zippp/android/app/build/outputs/apk/sideload/debug/app-sideload-debug.apk
```

Details:

- `34 MB`
- debug-signed
- `versionName 1.0.0-preview2-sideload`
- points to `https://preview.zippp.link`
- includes the Preview bypass header
- package: `link.zippp.app.debug`

Install:

```bash
$ANDROID_HOME/platform-tools/adb install -r \
  android/app/build/outputs/apk/sideload/debug/app-sideload-debug.apk
```

Pairing has been confirmed successful. Capture, review, and append have not yet been confirmed end-to-end.

---

## 12. Key bugs found and fixed during this session

1. **`getBalance` did not exist** in the billing ledger.
   - Fixed to use `balance()`.

2. **Bearer auth could not work.**
   - `currentUser()`, `hasTokens()`, and `loadWorkspace()` were cookie-only.
   - Added `requestUser(req)` and explicit `userId` propagation.

3. **Pairing code format was inconsistent and weak.**
   - `ZIP-842` was three digits.
   - Replaced with 8-character Crockford Base32.

4. **No device revocation.**
   - Added device registry, `jti`, revocation, web device list, and mobile logout.

5. **JWT default secret.**
   - Removed production fallback; production fails closed.

6. **Device-to-user binding missing.**
   - A valid device token could have been replayed with another `sub`.
   - Added `user_id` check.

7. **Formula injection through Sheets.**
   - `USER_ENTERED` plus raw OCR text.
   - Added `escapeSheetText()` and tests.

8. **Client `=HYPERLINK(...)` bypass.**
   - The sanitizer originally whitelisted any client string beginning with `=HYPERLINK(`.
   - Removed that exception.

9. **Append false success on duplicate.**
   - Duplicate spend with no cached result returned success.
   - Now returns `409 SCAN_ALREADY_SENT`.

10. **Refund after successful append.**
    - A post-write balance read failure could trigger a refund after the row was already written.
    - Balance reads are now best-effort after append.

11. **Logout could fail during a store outage.**
    - Web logout no longer depends on a token-store read before clearing the cookie.

12. **Telegram linking was underspecified.**
    - Added hashed link tokens, `GETDEL`, private-chat check, one-to-one mapping, and `update_id` dedupe.

13. **Android Preview requests were blocked by Vercel SSO.**
    - The bypass header was only added when the host contained `.vercel.app`.
    - The final APK points to `preview.zippp.link`.
    - Fixed to send the header whenever `VERCEL_BYPASS` is non-empty.

14. **Android strings were hardcoded.**
    - Added a generator from `spec/wording.txt`.

---

## 13. What is still open

### Product-critical

- End-to-end capture → extract → review → append test
- Template ops on the Android review screen
- Correction telemetry from Android
- Assumed-date handling
- Full `Ubah` line-item editing
- Photo proof upload and Drive link
- Month tabs and daily totals
- Offline capture queue
- EXIF stripping

### Release-critical

- Sideload OTA download, SHA-256, APK signer verification, installer
- Play In-App Updates
- QR scanner
- Steady detection / auto-snap
- Play Data Safety and privacy submission
- Release keystore creation and backup
- `assembleRelease` re-run with signing
- Commit the worktree
- Preview regression test with a real Google account and real sheet

### Spec/roadmap cleanup

The roadmap still has stale wording:

- Unchecked boxes for completed Lanes A/C/D
- Task A.2 says “max 5 attempts per code”
- Task B.1 says “whitelist `=HYPERLINK(...)`”
- Task B.3 says accept `photoUrl`
- Task E.3 says DataStore; implementation uses Keystore + private prefs
- Lane F lists QR, steady detection, ops, and telemetry as if complete

Update the roadmap before the next coding session.

---

## 14. Recommended next session

1. Test capture → extract → review → `Terima` → sheet append on the paired device.
2. Fix the Android review contract: template ops, assumed date, correction telemetry, full `Ubah`.
3. Implement photo proof and month-tab append, or explicitly defer them.
4. Add OTA, QR, and steady detection.
5. Update the spec and roadmap to match reality.
6. Commit the entire worktree on a branch.
7. Re-run all gates.
8. Only then enable `MOBILE_API_ENABLED=true` on Production.

---

## 15. Commands

```bash
# Web gates
npm test
npx tsc --noEmit
npm run build

# Android strings
npm run android:strings

# Android build
cd android
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export ANDROID_HOME="$HOME/Library/Android/sdk"
./gradlew :app:assembleDebug
```

---

## 16. Security notes

- Do not commit `.env`, `.env.local`, `android/local.properties`, `android/keystore.properties`, or keystores.
- The Preview test APK contains a Vercel Preview bypass secret. Do not share it.
- Production mobile auth is still disabled.
- The test APK is debug-signed and is not a release artifact.
- All work is currently uncommitted.
