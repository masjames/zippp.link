# SPEC-ANDROID-COMPANION.md
# Zippp Android (historical companion) & Telegram

**Status:** HISTORICAL / PARTIAL IMPLEMENTATION — **not the north star**  
**Override:** Factory `DIR-001`, `DEC-003`, `DEC-004`, `ROAD-001`  
**Last product pivot:** 2026-11-01 (Zippp Space full client; web-only pay)

Keep using this file for: JWT pairing details, device revoke, CameraX review FSM,
Telegram webhook rules, play vs sideload flavors. Ignore “companion-only” and
“credits” as product destiny.

---

## 1. Executive Summary (updated)

Zippp Android is a **first-class Zippp Space client**. Web owns checkout.
Notification Listener (opt-in) drives proactive record prompts. Pairing remains
for device bind/revoke. Telegram remains alerts/support.

Historical companion framing below describes what was built in Oct 2026:

1. **Zippp Web (`src/app`)**: portal, OAuth, sheets, devices, billing.
2. **Zippp Android (`android/`)**: pairing + capture spike (expand under ROAD).
3. **Telegram**: alerts and support linking.

```
+-------------------------------------------------------------------------------+
|                               WEB PORTAL (Desktop/Mobile Web)                 |
|  - Google OAuth & Sheet Link                                                  |
|  - Top-up & Payments (100% of Billing)                                        |
|  - Device Pairing QR / 8-Char Crockford Base32 Code Generator                 |
|  - Connected Devices Management & Immediate Revocation                        |
+-------------------------------------------------------------------------------+
                                      |
                         Issues Ephemeral Pairing Code
                                      v
+-------------------------------------------------------------------------------+
|                       ZIPPP ANDROID COMPANION (Native App)                    |
|  - Pure Reader / Input Companion (0% Play Store Fee Model)                    |
|  - Dual Flavor: `play` (Play Store compliant) & `sideload` (GitHub OTA)       |
|  - Pairing Login Screen (8-Char Code or QR Scan) -> Stores Scoped JWT         |
|  - CameraX Viewfinder + Real-time Steady Detection                            |
|  - Review FSM: [Terima] (Accept) | [Ubah] (Edit) | [Buang] (Discard)          |
|  - Hard-Flag Grounding Guard: Blocks Terima on ungrounded/missing values      |
|  - Android Keystore AES-256-GCM + DataStore (allowBackup="false")             |
+-------------------------------------------------------------------------------+
                                      |
                     POST /api/extract  |  POST /api/sheets/append
                                      v
+-------------------------------------------------------------------------------+
|                               ZIPPP BACKEND (Next.js)                         |
|  - Dual-Auth Resolver (`requestUser`): Bearer JWT or Web Session Cookie       |
|  - Pairing Store: SHA-256 Hash, 10m TTL, Atomic GETDEL, Strict Rate Limits   |
|  - Device Registry & JTI Revocation Store (`auth:device:<id>`)                |
|  - Google Sheets Formula Sanitization (`escapeSheetText`)                     |
|  - Append Idempotency (`scan:${userId}:${scanId}`) + 24h Result Caching       |
|  - Direct Google Sheets API v4 Append (Sole System of Record)                |
|  - Asynchronous Telegram Bot Alerts & Private Chat Linking                    |
+-------------------------------------------------------------------------------+
```

---

## 2. Unbreakable Product Laws

1. **Google Sheet is the Sole System of Record (SoR):** Zippp never stores receipts or financial ledger data in a database. Data flows directly from the user's camera to OCR to the user's Google Sheet.
2. **Check Before Accept:** Receipts are never auto-appended. The user must explicitly inspect and confirm the receipt on the mobile Review screen (`Terima`).
3. **Anti-Hallucination Grounding Guard:**
   - Hard flags (`missing`, `not_in_ocr`, `ungrounded`, `arithmetic`) block `Terima` until edited via `Ubah` or explicitly confirmed.
   - If the extraction pipeline cannot ground a value in OCR tokens, the field is flagged or nulled. No hallucinated values are silently passed.
4. **Credit Logic:** 
   - 1 successful `Terima` (Accept) = 1 Credit spent.
   - Failed scans, unreadable receipts, or discards (`Buang`) cost **0 credits**.
   - Balance verification and credit deduction happen server-side atomically in Redis before appending to the Google Sheet.
   - If sheet append fails after credit spend, the credit is immediately refunded.
5. **Data Boundary Isolation:** The photo path (`/api/extract`) never touches Google user credentials or tokens. The sheet path (`/api/sheets/append`) never calls AI providers.

---

## 3. Play Store "Reader / Companion" Compliance & Anti-Steering

To qualify for a 0%-fee listing on Google Play Store without triggering Google Play Billing (IAP 15%-30% tax), the Android app must strictly follow the "reader/multi-platform companion" rule (the Inkdrop model):

### Strict Mobile Constraints:
- **Zero Registration / Sign-Up Flows:** The app does NOT contain "Daftar", "Sign Up", or account creation forms.
- **Zero In-App Purchasing (IAP):** No pricing screens, subscription lists, credit top-up buttons, or checkout sheets.
- **Zero Anti-Steering Violations:** Strictly **NO** buttons, text, banners, or links stating:
  - *"Beli credit di website zippp.link"*
  - *"Go to website to upgrade"*
  - *"Klik di sini untuk langganan"*
- **Neutral Terminology:** Android UI resources use *"kuota scan"* or *"sisa scan"*. Never use *"kredit"*, *"saldo"*, or currency symbols (`Rp`, `$`).
- **Never Render Raw Server Error Strings:** The mobile client maps typed machine error codes (`NO_CREDITS`, `GOOGLE_RECONSENT`, etc.) to neutral wording in `spec/wording.txt`.
- **Zero-Credit State Handling:** If a user's scan quota reaches `0`, the app displays a neutral informational status:
  - Copy: *"Sisa kuota scan Anda telah habis. Pemindaian baru belum tersedia."*
  - Action: `Muat Ulang` (Refresh) and `Bantuan` (Support) only. No purchase CTA, no web purchase link, and no "hubungi admin untuk membeli".
- **Telegram Low-Credit Alert Compliance:** Low-credit warnings sent via Telegram must be purely informational and must contain no purchase URLs or payment CTAs.

---

## 4. Mobile Authentication, Pairing & Device Revocation (Option B)

### 4.1. Pairing Code Contract
1. **Entropy & Format:** Exactly 8 characters from Crockford Base32 alphabet (`0123456789ABCDEFGHJKMNPQRSTVWXYZ`, excluding `I`, `L`, `O`, `U`).
   - Grouped as `XXXX-XXXX` for display (40-bit entropy).
   - Case-insensitive, hyphens and whitespace ignored on input.
2. **Storage at Rest:** Only `SHA-256(code)` is stored in Redis: `auth:pair:<SHA256(code)>`.
3. **TTL:** 10 minutes.
4. **Atomic Consumption:** Consumed via `GETDEL` (single-use).
5. **Rate Limiting:**
   - A code is single-use and is consumed atomically; a second claim always fails.
   - Maximum 10 claim attempts per IP per 10 minutes. Failed claims return the same generic error, so the response does not reveal whether a code existed.
   - Rate limit generation: max 5 codes per user per hour. Generating a new code invalidates the previous unused code.
6. **Endpoints:**
   - `POST /api/auth/pair/generate` (Web session cookie required)
   - `POST /api/auth/pair/claim` (Public, IP-rate-limited, renamed from login to avoid OAuth route collisions)
7. **Rollout Gate:** `MOBILE_API_ENABLED` is `false` by default. Pairing and bearer auth return 404/401 until it is explicitly enabled in Preview and Production.

### 4.2. JWT Claims & Device Registry
1. **JWT Specification:**
   - Signed with HMAC-SHA256 using `MOBILE_JWT_SECRET`. The secret must be at least 32 bytes and production fails closed if it is missing.
   - Claims:
     ```json
     {
       "sub": "<google_user_id>",
       "email": "user@example.com",
       "device_id": "uuid-or-android-id",
       "jti": "<unique-jwt-id>",
       "aud": "zippp-mobile",
       "iss": "zippp.link",
       "ver": 1,
       "scope": "mobile_scan",
       "iat": 1792684800,
       "exp": 1795276800
     }
     ```
   - Lifetime: 30 days. The device record must belong to the same `sub`; a valid device token cannot be replayed as another user.
2. **Device Store:**
   - Key: `auth:device:<device_id>`.
   - Value: `{ device_id, user_id, device_name, app_version, platform, paired_at, last_seen_at, revoked: false, jti }`.
   - Index: `auth:user_devices:<user_id>` set of device IDs.
3. **Revocation & Lost Phone Flow:**
   - Web Settings has `GET /api/auth/devices` and `POST /api/auth/device/revoke`.
   - Mobile logout calls `POST /api/auth/device/revoke` before clearing local storage.
   - Requests with a revoked device ID or invalid `jti` immediately fail with `401 DEVICE_REVOKED`.

---

## 5. Dual Distribution Channels & OTA Engine

The Android codebase is structured into two Gradle flavors:

### 5.1. `play` Flavor (Google Play Store)
- `compileSdk = 35`, `targetSdk = 35`, `minSdk = 26`.
- Distributed via Google Play Console.
- Uses Google Play In-App Updates library.
- Zero GitHub APK downloads or update popups.
- Does **NOT** declare `REQUEST_INSTALL_PACKAGES` permission in `AndroidManifest.xml`.

### 5.2. `sideload` Flavor (Direct APK / GitHub Releases)
- Direct distribution via GitHub Releases.
- Declares `REQUEST_INSTALL_PACKAGES` permission.
- Queries `GET /api/app-version`:
  ```json
  {
    "version_code": 2,
    "version_name": "1.0.1",
    "download_url": "https://zippp.link/downloads/zippp-v1.0.1-sideload.apk",
    "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "size": 12345678,
    "min_supported_version_code": 1,
    "release_notes": "Perbaikan deteksi struk minimarket dan peningkatan kecepatan kamera.",
    "mandatory": false,
    "channel": "sideload"
  }
  ```
- OTA Engine verifies SHA-256 and APK signer continuity before prompting system install. The Play flavor ignores `download_url` and uses Play In-App Updates.
- `mandatory` is computed from `min_supported_version_code`, not trusted as a standalone editorial flag. A signed manifest is required before mandatory updates are enabled.

---

## 6. Request-Scoped Dual-Auth & Server Data Integrity

### 6.1. `requestUser(req: Request)`
All routes handling authenticated actions (`/api/sheets/append`, `/api/billing/balance`, `/api/corrections`) resolve user identity via `src/lib/auth/request-user.ts`. Device management (`/api/auth/devices`, `/api/auth/device/revoke`) stays web-session only:
1. Check `Authorization: Bearer <mobile_jwt>`. If present:
   - Verify JWT signature with `MOBILE_JWT_SECRET`.
   - Ensure `aud === "zippp-mobile"` and `scope === "mobile_scan"`.
   - Verify `device_id` is registered, not revoked, and its `user_id` matches `sub`.
   - Return `{ userId: sub, email, admin: false, source: "mobile", deviceId, jti }`.
2. If no Bearer header, fall back to `currentUser()` (web session cookie `zippp_sid`).
3. Explicitly pass `userId` to `loadTokensForUser(userId)` and `loadWorkspaceForUser(userId)`. Never rely on implicit cookie resolution.

### 6.2. Google Sheets Formula Sanitization (`sheet-safe.ts`)
To prevent formula injection via OCR results or mobile input:
- All string values written to Google Sheets are sanitized via `escapeSheetText()`:
  - If a string begins with `=`, `+`, `-`, `@`, `\t`, or `\r`, prefix it with `'` (single quote apostrophe).
  - There is no client-supplied formula exception. A photo hyperlink must be constructed server-side after the image is uploaded; the mobile append body cannot pass a formula.

### 6.3. Append Idempotency & Result Caching
- Every scan is assigned a server-issued `scanId` during `POST /api/extract`, and the owner is recorded at `scan:owner:${userId}:${scanId}`. Mobile appends must present a scan id issued to that user.
- Credit spend and sheet append are idempotent on `scan:${userId}:${scanId}`.
- Upon successful append, the response is cached in Redis at `scan:result:${userId}:${scanId}` for 24 hours.
- If network drops and the mobile client retries `POST /api/sheets/append` with the same `scanId`, the server returns the cached result with `duplicate: true`, preventing duplicate sheet rows and duplicate charges.

---

## 7. Review FSM & Anti-Hallucination Flow

```
CameraX Viewfinder (Auto-Steady)
       |
       | Shutter Tap / Steady Check
       v
POST /api/extract (Server returns receipt + flags + scanId)
       |
       v
Review Screen FSM
 ├── Has Hard Flags (missing, not_in_ocr, ungrounded, arithmetic)?
 │    ├── YES -> [Terima] button DISABLED / BLOCKED
 │    │           User must tap [Ubah] to correct or explicitly acknowledge
 │    └── NO  -> [Terima] button ENABLED
 ├── [Ubah] Tap -> Modal editor
 │    - User edits field
 │    - Field marked "Diedit" (user override)
 │    - Clears blocking flag for that field
 │    - Telemetry sent to POST /api/corrections
 ├── Date Missing?
 │    - Auto-filled with current capture date
 │    - Marked with visual pill "tanggal diasumsikan"
 ├── Template Ops Support:
 │    - Displays staff, outlet, payment, purpose, customer fields when configured
 ├── [Buang] -> Discards receipt, 0 credits spent, returns to Viewfinder
 └── [Terima] -> POST /api/sheets/append (1 credit spent)
```

---

## 8. Telegram System Integration

1. **Admin Alerts (`src/lib/telegram/admin.ts`):** Preserved existing system notifications to `TELEGRAM_CHAT_ID`.
2. **User Notifications (`src/lib/telegram/alerts.ts`):**
   - Outbound notifications to user's linked Telegram chat.
   - Low-credit warning (< 10 scans): Triggered asynchronously post-spend (never inside Lua). Copy is informational only without purchase links.
   - Pairing notification when a new device connects.
   - Top-up confirmation alerts.
3. **Account Linking Flow:**
   - Web generates a 32-character hex link token (128 bits) with a 10-minute TTL. Only `SHA-256(token)` is stored, as `telegram:link:<hash>`.
   - Deep link: `https://t.me/zippp_bot?start=link_<token>`. The payload stays under Telegram's 64-character `start` limit.
   - Webhook validates `message.chat.type === "private"` before binding. One Telegram chat maps to one Zippp user, and one Zippp user maps to one chat. Groups are rejected.
4. **Webhook Security (`src/app/api/telegram/webhook/route.ts`):**
   - Timing-safe validation of `x-telegram-bot-api-secret-token`.
   - Deduplication of incoming `update_id` via `SET telegram:update:<id> 1 EX 86400 NX`.

---

## 9. Android Toolchain & Architecture

- **Toolchain:**
  - `JAVA_HOME`: `/Applications/Android Studio.app/Contents/jbr/Contents/Home` (OpenJDK 21).
  - `ANDROID_HOME`: `/Users/mm/Library/Android/sdk`.
  - Gradle 8.9, Kotlin 2.0.x, AGP 8.7.x.
  - Compile SDK: 35, Target SDK: 35, Min SDK: 26.
- **Security & Storage:**
  - Android Keystore AES-256-GCM encryption for the bearer token, stored as a ciphertext blob in private preferences.
  - `android:allowBackup="false"` in `AndroidManifest.xml`; no token is written to logs.
  - The app has `sideload` and `play` flavors. The Play flavor has no GitHub APK install path and no `REQUEST_INSTALL_PACKAGES`.
- **UI Stack:**
  - Jetpack Compose + Material 3.
  - CameraX (`camera-core`, `camera-camera2`, `camera-lifecycle`, `camera-view`).
  - ML Kit Barcode Scanning for QR pairing.
  - Retrofit / OkHttp with Kotlinx Serialization.
