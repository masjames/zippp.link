# android-rollout-plan.md
# Zippp Android rollout (historical lanes)

**Override sequencing:** Factory `ROAD-001` + `DEC-003` / `DEC-004`.  
**Parent (historical):** [`SPEC-ANDROID-COMPANION.md`](./SPEC-ANDROID-COMPANION.md)  
**Status:** Companion spike built; **Space full-client path** is the live plan.

---

## 0. Current status

**Spike done (keep):**

- Mobile auth dark by default (`MOBILE_API_ENABLED=false`).
- Pairing, device registry, revoke, scan ids, sheet sanitization, append idempotency, Telegram link/webhook, web device panels.
- Android debug: pairing, CameraX, partial review, append client.

**Live plan (ROAD-001):** Orient ✓ → rewrite contracts ✓ → auth/Space → capture+notify → assets/goals → fair-use → device proof → prod enable.

Do not execute the lane checklist below as the product roadmap. It is a recovery map for already-built pieces.

---

## 1. Multi-Lane Rollout Matrix

| Lane | Focus Area | Deliverables | Verification Gate |
|---|---|---|---|
| **Step 1** | Specs & Contracts Freeze | `SPEC-ANDROID-COMPANION.md`, `android-rollout-plan.md` | Specs aligned with 10 review amendments |
| **Lane A** | Web Backend Core & Auth | Mobile JWT, Crockford pairing store, device registry & revocation, dual-auth resolver (`requestUser`), auth routes | Node tests for pairing, JWT, device revoke |
| **Lane B** | Sheet Append, Safety & Idempotency | `sheet-safe.ts` (formula escaping), `/api/extract` server `scanId` + Bearer auth, `/api/sheets/append` dual-auth + template ops + 24h caching | `data-boundary.test.ts` + append idempotency & formula tests |
| **Lane C** | Telegram Bot & User Alerts | Admin alerts preserved, user alert store, 32-char link token, update dedupe, webhook | Webhook secret check + link store tests |
| **Lane D** | Web Pairing & Device UI | `spec/wording.txt` keys, `PairDeviceModal.tsx` (8-char code + QR), `ConnectedDevices.tsx` (device list & revoke) | Web UI renders and calls endpoints correctly |
| **Lane E** | Android Scaffolding & Foundation | Gradle 8.9, Kotlin 2.0.x, AGP 8.7.x, targetSdk 35, Keystore AES-256-GCM + DataStore, `play` & `sideload` flavors, OTA engine | `./gradlew assembleDebug` clean build |
| **Lane F** | Android Capture & Review UI | 8-char OTP + QR pairing screen, CameraX with steady indicator, Review screen with hard-flag blocker, `Ubah` modal, neutral error mappings | End-to-end capture and append test |

---

## 2. Detailed Task Breakdown

### Lane A: Web Backend Core & Auth
- [ ] **Task A.1: Mobile JWT Signing & Verification** (`src/lib/auth/mobile-token.ts`)
  - Sign and verify HMAC-SHA256 JWTs using `MOBILE_JWT_SECRET`.
  - Claims: `{ sub, email, device_id, jti, aud: "zippp-mobile", scope: "mobile_scan", iat, exp: 30d }`.
- [ ] **Task A.2: Pairing Code Store** (`src/lib/auth/pairing-store.ts`)
  - 8-character Crockford Base32 (`XXXX-XXXX`, 40-bit entropy).
  - SHA-256 storage in Redis: `auth:pair:<SHA256(code)>` with 10-minute TTL.
  - Atomic consumption via `GETDEL` (or Lua fallback).
  - Rate limits: max 5 attempts per code, 10 attempts per IP per 10m.
- [ ] **Task A.3: Device Registry & Revocation Store** (`src/lib/auth/device-store.ts`)
  - Track devices at `auth:device:<device_id>`.
  - Methods: `registerDevice`, `getDevice`, `listUserDevices`, `revokeDevice`, `isDeviceRevoked`.
- [ ] **Task A.4: Request-Scoped User Resolver** (`src/lib/auth/request-user.ts`)
  - Resolves identity from `Authorization: Bearer <mobile_jwt>` or web session cookie `zippp_sid`.
  - Ensures revoked devices are blocked with `401 DEVICE_REVOKED`.
  - Strictly avoids any Google imports to protect the data boundary.
- [ ] **Task A.5: Auth Endpoints**
  - `POST /api/auth/pair/generate`: Session-authenticated, returns `{ code, expires_at, qr_payload }`.
  - `POST /api/auth/pair/claim`: Public rate-limited exchange, consumes code, registers device, returns JWT and user workspace summary.
  - `GET /api/auth/devices`: Web session auth, lists paired devices.
  - `POST /api/auth/device/revoke`: Dual-auth, revokes single device or all devices.
  - `POST /api/auth/logout`: Mobile logout, revokes calling device.

*Exit Gate:* Unit tests for Crockford generator, SHA-256 storage, rate limiter, and JWT signing/verification.

---

### Lane B: Sheet Append, Safety & Idempotency
- [ ] **Task B.1: Google Sheets Formula Sanitization** (`src/lib/google/sheet-safe.ts`)
  - `escapeSheetText()` prefixes `'` to strings starting with `=`, `+`, `-`, `@`, `\t`, `\r`.
  - Whitelist server-generated `=HYPERLINK(...)` for photo proof.
  - Unit tests verifying formula escape edge cases.
- [ ] **Task B.2: Extract Pipeline Server ScanId & Bearer Auth** (`src/app/api/extract/route.ts`)
  - Issue unique server `scanId` on every extract run.
  - Accept Bearer JWT or web session cookie.
  - Preserve strict data boundary: only accept `image` form field, zero Google imports.
- [ ] **Task B.3: Sheet Append Route Hardening** (`src/app/api/sheets/append/route.ts`)
  - Use `requestUser(req)` for dual-auth resolution.
  - Pass explicit `userId` to `loadTokensForUser` and `loadWorkspaceForUser`.
  - Apply `escapeSheetText` to all cell strings before writing.
  - Accept template ops (`staff`, `outlet`, `payment`, `purpose`, `customer`, `photoUrl`).
  - Idempotency keyed by `scan:${userId}:${scanId}`.
  - 24-hour result caching in `scan:result:${userId}:${scanId}`. Retries return cached success with `duplicate: true`.
  - Typed error codes: `NO_CREDITS` (402), `GOOGLE_RECONSENT` (401), `DEVICE_REVOKED` (401).

*Exit Gate:* Run `npm test` verifying `data-boundary.test.ts`, formula sanitization, and idempotency tests.

---

### Lane C: Telegram Bot & User Notifications
- [ ] **Task C.1: Admin Telegram Alerts Preservation** (`src/lib/telegram/admin.ts`)
  - Move/re-export `sendTelegram` to preserve all existing system alerts to `TELEGRAM_CHAT_ID`.
- [ ] **Task C.2: User Alert Engine & Store** (`src/lib/telegram/bot.ts`, `alerts.ts`, `store.ts`)
  - 32-character hex link token generator with 10-minute TTL (`telegram:link:<token>`).
  - User chat mappings: `telegram:user:<userId> -> chatId` and `telegram:chat:<chatId> -> userId`.
  - Deduplicate incoming `update_id` via `SET telegram:update:<id> 1 EX 86400 NX`.
  - Asynchronous low-credit notification post-spend (neutral copy, no purchase CTA).
  - New device pairing notification.
- [ ] **Task C.3: Inbound Webhook** (`src/app/api/telegram/webhook/route.ts`)
  - Verify secret token timing-safely via `x-telegram-bot-api-secret-token`.
  - Require private chat (`message.chat.type === "private"`).
  - Handle `/start link_<token>`, `/saldo` or `/balance`, `/bantuan` or `/help`.

*Exit Gate:* Webhook test handling `/start link_<token>` and secret verification.

---

### Lane D: Web Pairing & Device UI
- [ ] **Task D.1: Wording Expansion** (`spec/wording.txt`)
  - Add all `android.*`, `telegram.*`, and machine error code definitions (`error.no_credits.*`, etc.).
- [ ] **Task D.2: Pairing Modal Component** (`src/components/app/PairDeviceModal.tsx`)
  - 8-character Crockford code formatted as `XXXX-XXXX`.
  - 10-minute countdown indicator.
  - Clean QR code rendered for mobile camera scanning.
- [ ] **Task D.3: Connected Devices Management** (`src/components/app/ConnectedDevices.tsx`)
  - Render list of paired devices with platform, app version, last active timestamp.
  - One-tap "Cabut Akses" (Revoke) button.

*Exit Gate:* Visual check and component test of pairing modal and device list.

---

### Lane E: Android Scaffolding & Foundation
- [ ] **Task E.1: Android Project Scaffolding** (`android/`)
  - Gradle 8.9 wrapper setup, AGP 8.7.2, Kotlin 2.0.21.
  - `compileSdk = 35`, `targetSdk = 35`, `minSdk = 26`.
- [ ] **Task E.2: Flavor Configuration** (`android/app/build.gradle.kts`)
  - `play`: Play Store compliant, Google Play In-App Updates, no `REQUEST_INSTALL_PACKAGES`.
  - `sideload`: GitHub releases OTA engine, includes `REQUEST_INSTALL_PACKAGES`.
- [ ] **Task E.3: Secure Storage** (`EncryptedTokenStore.kt`)
  - Android Keystore AES-256-GCM + DataStore Preferences.
  - `android:allowBackup="false"` in manifest.
- [ ] **Task E.4: Sideload OTA Engine** (`OtaUpdateManager.kt`)
  - Check `GET /api/app-version`.
  - Verify SHA-256 checksum and APK signature continuity before prompting system install.

*Exit Gate:* Run `./gradlew assembleDebug` and verify both `playDebug` and `sideloadDebug` APK builds.

---

### Lane F: Android Capture & Review UI
- [ ] **Task F.1: Pairing Screen** (`PairingScreen.kt`)
  - 8-character input (`XXXX-XXXX`) with auto-uppercase and hyphenation.
  - ML Kit Barcode Scanner integration for QR code pairing.
  - Calls `POST /api/auth/pair/claim`.
- [ ] **Task F.2: CameraX Viewfinder** (`CameraScreen.kt`)
  - High-speed viewfinder with framing guide.
  - Steady indicator to prevent blurry receipt snaps.
  - Neutral scan counter: "Sisa scan: XX".
- [ ] **Task F.3: Review FSM & Grounding Guard** (`ReviewScreen.kt`)
  - Displays merchant, date, lines, subtotal, tax, total.
  - Hard-flag blocker: blocks `Terima` when missing/ungrounded/arithmetic flags exist until edited.
  - `Ubah` modal: marks field as "Diedit", clears flag, sends telemetry to `/api/corrections`.
  - Null date fills current capture date with "tanggal diasumsikan" chip.
  - Template ops: staff, outlet, payment, purpose, customer fields when present.
  - Anti-steering compliance: neutral zero-credit dialog with Refresh and Telegram support.

*Exit Gate:* End-to-end receipt capture, review check, and Google Sheet append.
