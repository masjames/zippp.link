# zippp — Single-File Context for Claude and Pi

**Purpose:** the **only** document an agent needs to understand zippp and act.
Product laws, API contracts, Android/Play rules, Rev 2 sheet design, pricing,
factory as-built, backlog, risks, env names, and next work are all inlined below.

**Self-containment rule (binding for agents):**

- Do **not** open other markdown under `spec/` to understand the product.
  Theme specs, audits, reviews, Pi brief, master factory spec, and archives are
  human/history artifacts. This file supersedes them for agent understanding.
- You **may** read and edit **source code** under `src/`, `android/`,
  `tools/factory/` — code is the implementation truth for shapes already shipped.
- You **may** edit `spec/wording.txt` when changing user-visible copy (it is a
  string table, not a design doc). Format: `key = value` lines, EN/ID sections;
  Android strings are generated from it via `npm run android:strings`.
- You **may** flip `status:` on one entity file under
  `spec/themes/03-zippp-software-factory/entities/` when verifying a task.
  Entity bodies are checklist trackers; contracts live here.
- Do **not** invent API shapes, column maps, or Play behaviors that contradict
  this file. If code and this file disagree on a shipped path, trust the code
  and update this file in the same change.

**Snapshot:** 2026-11-03  
**Previous snapshot:** 2026-10-24 (superseded)  
**Repository:** `github.com/masjames/zippp.link`  
**Local path:** `/Users/mm/Dev/adit/zippp`  
**Production:** `https://www.zippp.link` and `https://www.zippp.link/id`  
**Preview:** `https://preview.zippp.link`

**What changed since 2026-10-24:**

1. **ROAD-001 Phase 2 done:** this file realigned to DIR-001 + DEC-001…005 +
   ROAD-001 (living-spec rewrite + backlog disposition per DEC-005).
2. **Product north star:** Zippp Space personal finance OS — monthly fair-use
   subscription (web checkout), Android full client, Notification Listener capture.
3. **Priority gate:** Production mobile waits on **STORY-102** (Space device proof),
   not companion **STORY-101**. Next build: finish **FEAT-113**; **FEAT-114**
   Space membership is built and in verify (Phase 3).
4. Legacy prepaid credits and pairing-only Android **still run in code** until
   ROAD Phases 4–6; do not treat them as destination UX.
5. Production mobile still dark; Space capture path not proven on device yet.
6. **2026-11-03:** Phase 3 code (FEAT-113 auth, FEAT-114 Space) plus the Android
   companion were uncommitted. Commit hygiene closed in four commits; worktree
   clean. Device proof is still the open gate.

---

## 0. How to use this file

1. Read this file end to end once per session.
2. Treat every law and contract below as binding.
3. Before claiming "shipped", re-check: `git status`, `npm test`, `npx tsc --noEmit`,
   and (if relevant) Preview / device behavior. Status sections are a snapshot.
4. Do one task at a time from §19.
5. Keep the worktree clean. Commit with explicit pathspecs. Never `git add -A`.
6. Never print `.env*`, tokens, Preview bypass values, or `tools/factory/.factory-key`.

---

## 1. One-sentence product

**Zippp Space** is a personal finance OS: capture spend (scan, manual, or
notification prompt), track assets and goals, share a Space with anyone you
trust. Web and Android are the same product; pay on the web (DEC-002).

Shipped spine today still lands confirmed spend rows in the user's Google Sheet
when connected — Sheet is a landing surface, not the whole product forever
(DIR-001).

---

## 2. Current strategic state

zippp pivoted away from WhatsApp because low-ticket receipt scanning could not
absorb Meta conversation fees and Twilio markups.

The active product shape is:

1. **Web** (`src/app`) is the master portal:
   - Google OAuth
   - Google Sheet setup and template selection
   - subscription / plan management (web checkout; legacy credit top-up in code)
   - device pairing and revocation
   - Telegram linking
2. **Android full client** (`android/`, DEC-003) — product parity with web except
   payment. **As-shipped today:** pairing + capture client:
   - pair with an 8-character code (FEAT-113 adds Google / magic-link auth)
   - CameraX receipt capture; Notification Listener proactive capture (ROAD Phase 4)
   - review with `Terima | Ubah | Buang`
   - append accepted rows
3. **Telegram bot** (`src/lib/telegram/`) handles:
   - account linking
   - `/saldo`
   - `/bantuan`
   - low-credit alerts
   - top-up confirmations
   - new-device alerts
4. **WhatsApp is archived.** Do not add WhatsApp features. Legacy `src/lib/wa/`
   code remains until a cleanup task removes it.
5. **Software Factory** (`tools/factory/`) is the local Product OS:
   - Go daemon + React command center
   - entity Kanban, Design/Gap views, grooming LLM, verifier
   - does **not** edit product code; indexes entity markdown only

**Current production posture:** mobile API is dark. `MOBILE_API_ENABLED` is not
set in Production. Preview is enabled for testing.

**Current milestone:**

- **DIR-001 Zippp Space** locked; ROAD-001 Phase 1–3 code done and committed.
- FEAT-113 auth and FEAT-114 Space are built; tests, typecheck, and build green.
  No device run yet. Pairing spike verified on Preview.
- Gate that matters: **STORY-102** (not companion STORY-101).
- Next build: **STORY-102** device proof (ROAD Phase 7). FEAT-102, FEAT-115,
  FEAT-116, and FEAT-117 are built and in Factory verify; all need a runtime pass.

---

## 3. Product laws (non-negotiable)

**Direction authority:** `entities/direction/DIR-001` + `DEC-*` + `ROAD-001`.
If this file conflicts with those cards, **the cards win**.

1. **Zippp Space is the product.** Personal finance OS; shared Space; not a
   multi-persona receipt mill.
2. **Check before Accept / confirm.**
   Nothing is trusted without explicit human confirmation.
3. **Never invent values.**
   If OCR/model output cannot be grounded in the image text, the value is nulled
   or flagged. Unknown stays empty.
4. **Money = monthly subscription + fair-use usage %; checkout web-only.**
   Legacy “1 credit = 1 Terima” may still run in code until ROAD Phase 6.
   Do not design new UX around credits. Failed reads / Buang still cost zero.
5. **Data boundary.**
   The photo path never touches Google OAuth tokens, sheet ids, sheet contents,
   or Drive files. The sheet path never calls an AI provider.
6. **Server decides money and admin.**
   Never trust the browser or mobile client for balance, entitlement, or admin.
7. **Every user-visible string lives in `spec/wording.txt`.**
   Android strings are generated from it. Do not hardcode UI copy.
8. **No receipt image store on zippp servers.**
   Optional photo proof goes to the user's Drive only.
9. **No em dashes or hype words** in user-facing copy.
10. **No secrets in git, logs, or `NEXT_PUBLIC_*`.**
11. **Android is a full client** (DEC-003). Payment stays web-only. Proactive
    capture via Notification Listener is in-scope (DEC-004); Accessibility is not.
12. **Google Sheet** remains a connected landing surface for spend rows while
    Space expands. Do not assume Sheet-only forever, and do not silently abandon
    connected sheets.

---

## 4. Personas, templates, sheet layout, pricing

**ICP now:** personal finance Member + Zippp Space mates (DEC-001).

**Parked as ICP:** Sonny / Fais / Bagas business mills.

**Not building yet (phased):** full bank sync, Accessibility scrape, Android IAP.
Assets + goals are in DIR scope via ROAD phases.

**Not building:** Accurate/Jurnal/Xero clone as the pitch, stock deduction,
inventory truth, payroll, tax periods.

### 4.1 Personas → templates

| Who | Template id | Status | Job |
|---|---|---|---|
| Member | `personal-expense` | **Active bridge** | Personal spend |
| Space | (future Space schema) | ROAD | Shared personal finance |
| Legacy | `resto-inventory` / `sales-recap` / `reimbursement` / `custom` | **Parked** | Do not market or expand |

### 4.2 Mill vs ops fields

Mill (from extract; never invent):

```text
merchant, date, currency, category,
line_items: description, qty, unit_price, amount,
subtotal, tax, total
```

Ops (human only; never from the model):

| Field | Templates |
|---|---|
| staff, outlet | `resto-inventory` |
| payment | `personal-expense`, `sales-recap` |
| customer | `sales-recap` |
| purpose | `reimbursement` |

Shared on every zippp-owned row: **Receipt ID** (scan id), **Captured at**
(server ISO), **Photo** (Drive hyperlink or empty). Photo default **on** for
`reimbursement`, **off** for others (Settings toggle).

### 4.3 Column maps

**T1 `resto-inventory`:** Date, Supplier←merchant, Item←line description, Qty,
Unit (blank/constant), Unit price, Line amount, Tax (last line only), Receipt
total (repeats), Staff (op), Outlet (op), Category (model, editable), Notes,
Photo, Receipt ID, Captured at.

**T2 `personal-expense`:** Date, Merchant, Description, Qty, Amount, Tax (last),
Total (repeat), Category, Payment (op: Cash, Debit, Credit, QRIS, E-wallet,
Transfer), Notes, Photo, Receipt ID, Captured at.

**T3 `sales-recap`:** Date, Item, Qty, Unit price, Amount, Discount (empty unless
later mapped), Nota total (repeat), Payment (op: Cash/QRIS/Transfer), Customer
(op, optional), Notes, Photo, Receipt ID, Captured at. **No Merchant column.**
Daily block is the product. Do not market until handwritten eval exists.

**T4 `reimbursement`:** Date, Merchant, Description, Qty, Amount, Tax, Total,
Category, Purpose (op, session-remembered), Photo **on by default**, Notes,
Receipt ID, Captured at. One month tab = one claim period. No status workflow.

**T5 `custom`:** Row 1 of user's tab is schema. Map mill fields to existing
headers only. No Summary, no daily block, no photo pipeline.

### 4.4 Dropdown lists (warning-only validation at tab create)

- Category T1 ID: Bahan baku, Minuman, Kemasan, Kebersihan, Peralatan, Lainnya
  (EN: Ingredients, Beverages, Packaging, Cleaning, Equipment, Other).
- Category T2/T4 ID: Makanan, Transport, Belanja, Tagihan, Kesehatan, Hiburan,
  Lainnya (EN: Food, Transport, Shopping, Bills, Health, Fun, Other).
- Payment T2 / T3: as above.
- Staff/Outlet T1: from workspace lists; `strict: false`.
- Model category is written even if not in the list.

### 4.5 Sheet layout (Rev 2 — designed; **not implemented** yet)

Target structure for zippp-owned templates:

```text
[zippp] <Template>
├── Summary          first tab: Month | Receipts | Total
├── 2026-10          YYYY-MM from receipt date (after assumed-date fill)
├── ...              12 most recent months visible
└── older tabs       hidden (not deleted) when age > 12 months
```

On Accept (target order): validate → spend → `ensureMonthTab` (headers,
formatting, validation, daily block) → optional Drive upload → append →
Summary row if new tab → hide old tabs. Concurrent create must tolerate
"sheet already exists".

**Daily block** (right of data, 2-col gap): one row per day of month at create;
Receipts = COUNTUNIQUEIFS on Receipt ID; Total = SUMIF Amount + SUMIF Tax;
Month footer = SUM of those.

**Photo proof (target):** folder `[zippp] Receipts/YYYY-MM/` via `drive.file`;
file `YYYY-MM-DD <merchant> <scanId8>.jpg`. Append fail → trash + refund.
Upload fail → append without link, soft notice. zippp keeps no server image copy.

**Modules to create:** `src/lib/google/sheet-layout.ts`,
`src/lib/google/sheet-style.ts` (constants), `src/lib/google/drive.ts`
(product proof; distinct from `drive-donation.ts`).

**As-shipped today:** single `sheet_tab`, no Summary, no daily block, no product
Drive proof upload.

### 4.6 Review card ops (web + Android target)

| Template | Extra card fields |
|---|---|
| T1 | Staff (dropdown, remembered), Outlet (default / dropdown) |
| T2 | Payment optional |
| T3 | Payment Cash/QRIS/Transfer, Customer optional |
| T4 | Purpose free text, session-remembered |

Common: merchant, date, line items, total, category. Hard flags block Accept /
Terima until edit or acknowledge. Null date → capture date + "tanggal
diasumsikan". Corrections POST `/api/corrections` with before/after/flags/run id.

### 4.7 Pricing and credits

**North star (DEC-002):** monthly subscription + fair-use usage %; checkout
web-only. Android shows plan status / usage only — never sells.

**Legacy in code until ROAD Phase 6 (FEAT-117):**

- 1 credit = 1 successful Accept / Terima. Failed read and Buang = 0.
- Lots expire **30 days**; spend earliest-expiring first.
- Block Snap/Send at zero credits. Low-credit warn under **10**.
- **Indonesia:** Rp **150**/credit; min **Rp 15.000 = 100** scans; presets
  15k / 30k / 50k / 100k → 100 / 200 / 333 / 666. Invite min Rp 10.000.
  Pay: Kasera QRIS primary; manual GoPay fallback. DOKU halted.
- **International:** Paddle **100 credits / $9** one-time.
- **Referral:** referrer 20% of referred top-ups (floor credits); referred +20
  once after first top-up. Only free-credit path. No trial tier.
- `billingConfigured()` requires Upstash REST. Without it, credits are not
  enforced (Production must use Upstash).

### 4.8 Rev 2 web UI targets (partially shipped)

- Header credit pill on `/app` (`⚡ N`); Accept label `Accept · 1 credit`.
- Top-up preview line; after paid → Back to camera.
- Wizard cards use persona wording + sample columns.
- Settings: staff/outlets (T1), photo-proof toggle (T1/T4).
- Landing: four persona cards; Worldwide/Indonesia region dropdown; ID pricing
  copy at Rp 15.000 entry.
- Audit Tasks 2 (presets/pill) marked done in audit; Tasks 3–7 (templates layout,
  sheet-layout, review ops UI, Drive, landing) still open in code.

---

## 5. Core user flows

### Web sign-in and sheet setup

```text
Landing
  -> Google OAuth
  -> connect or create a [zippp] Google Sheet
  -> choose template
  -> Snap / review / accept
  -> top up when credits are zero
```

Guard order:

1. loading
2. no session -> landing
3. no sheet -> sheet setup
4. zero credits -> top-up
5. ready -> `/app/snap`

### Web capture and review

```text
camera / upload
  -> extraction
  -> review card
  -> edit if needed
  -> Accept
  -> 1 credit spent
  -> append to Sheet
```

### Android capture (legacy pairing build; FEAT-113 replaces entry auth)

```text
first launch
  -> pairing screen
  -> enter 8-character code from web Settings
  -> receive mobile JWT
  -> camera
  -> capture
  -> POST /api/extract
  -> review
  -> Terima / Ubah / Buang
  -> POST /api/sheets/append
```

### Telegram

```text
web Settings -> Connect Telegram -> t.me/zippp_bot?start=link_<token>
  -> bot links private chat to Google user
  -> /saldo returns scan quota + sheet title
  -> low-credit, top-up, and new-device alerts
```

---

## 6. Architecture overview

```text
Web browser
  -> Next.js App Router on Vercel
     -> Google OAuth
     -> Google Sheets API
     -> Upstash Redis (sessions, credits, pairing, devices)
     -> Kasera QRIS / Paddle
     -> Telegram Bot API

Android APK
  -> POST /api/auth/pair/claim
  -> POST /api/extract
  -> POST /api/sheets/append
  -> all authenticated with a mobile bearer JWT

Telegram
  -> POST /api/telegram/webhook
  -> Redis link mappings
  -> balance / workspace lookups
```

### Stack

| Layer | Choice |
|---|---|
| Web | Next.js App Router, TypeScript, Tailwind, Vercel |
| Auth | Google OAuth, `spreadsheets`, `drive.file`, `userinfo.email` |
| Session store | Upstash Redis REST, then Vercel Blob, then filesystem |
| Credits | Upstash Redis, atomic Lua spend/grant |
| Payments | Kasera QRIS (ID), Paddle (intl), manual GoPay fallback |
| Extraction | PP-OCRv6 -> DeepSeek Flash -> verifier -> Gemini last resort |
| Android | Kotlin, Compose, Material 3, CameraX, OkHttp, Kotlinx Serialization |
| Telegram | Bot API, webhook, private-chat linking |
| Copy | `spec/wording.txt` through `src/lib/content.ts` |

### Data boundary

The photo path and the Google path must stay disjoint.

```text
photo path:
  /api/extract -> extract-pipeline -> PaddleOCR / DeepSeek / Gemini

sheet path:
  /api/sheets/append -> credit spend -> Google Sheets API
```

Enforced by `src/lib/data-boundary.test.ts`.

Rules:

- `/api/extract` accepts only the `image` form field.
- `/api/extract` imports `src/lib/auth/mobile-auth.ts`, never the
  Google-aware `src/lib/auth/request-user.ts`.
- The extraction pipeline receives only a `File`.
- `/api/sheets/append` imports no AI module.
- No Google token, sheet id, sheet contents, or Drive file reaches an AI
  provider.

---

## 7. Backend contracts

### 7.1 Web session

- Cookie: `zippp_sid`.
- Encrypted with `TOKEN_ENCRYPTION_KEY` (AES-256-GCM).
- Holds the Google user id.
- Token and workspace records are keyed by that id.
- Web sign-out deletes tokens and workspace and clears the cookie.
- Google access removal is at `myaccount.google.com/permissions`.

### 7.2 Mobile API gate

- `MOBILE_API_ENABLED` must be exactly `"true"` to enable mobile endpoints.
- Default is false.
- When false:
  - pairing endpoints return 404
  - bearer auth is rejected
  - the web device UI is hidden
- Production currently has no `MOBILE_API_ENABLED` and no `MOBILE_JWT_SECRET`.
- Preview has both enabled.

### 7.3 Pairing

**Code format**

- 8 characters from Crockford Base32:
  `0123456789ABCDEFGHJKMNPQRSTVWXYZ`
- Displayed `XXXX-XXXX`.
- 40 bits of entropy.
- Input is case-insensitive.
- Hyphens and whitespace are ignored.
- `O -> 0`, `I/L -> 1`, `U -> V`.

**Storage**

```text
auth:pair:<sha256(code)> -> { userId, email, createdAt, expiresAt }
TTL: 10 minutes
```

- Only the hash is stored.
- Generated with a CSPRNG using a `SET NX` loop.
- One active code per user.
- A new code invalidates the previous code.

**Consumption**

- `GETDEL`, single-use.
- Two concurrent claims cannot both succeed.
- Failed claims return the same generic error.

**Limits**

- 10 claim attempts per IP per 10 minutes.
- 5 generated codes per user per hour.
- Store failure fails closed in production.

**Endpoints**

`POST /api/auth/pair/generate` (web session)

```json
{
  "ok": true,
  "code": "ABCD-EFGH",
  "expires_at": 1792684800,
  "qr_payload": "zippp://pair?code=ABCDEFGH"
}
```

`POST /api/auth/pair/claim` (public, rate-limited)

```json
{
  "pairing_code": "ABCD-EFGH",
  "device_id": "uuid",
  "device_name": "Pixel 8",
  "app_version": "1.0.0",
  "platform": "android"
}
```

Success:

```json
{
  "ok": true,
  "token": "<jwt>",
  "expires_at": 1795276800,
  "user": {
    "email": "user@example.com",
    "credits": 85,
    "billing_configured": true
  },
  "workspace": {
    "ready": true,
    "spreadsheet_name": "Pengeluaran 2026",
    "template_id": "resto-inventory",
    "headers": ["Date", "Supplier", "Item"],
    "column_map": { "date": "Date", "merchant": "Supplier" },
    "staff_names": ["Sonny"],
    "outlets": ["Pusat", "Cabang"],
    "default_outlet": "Pusat",
    "photo_proof": false
  },
  "device": { "id": "uuid", "name": "Pixel 8" }
}
```

Errors:

```text
INVALID_PAIRING_CODE  401
RATE_LIMITED          429
DEVICE_CONFLICT       409
STORE_UNAVAILABLE     503
SERVER_MISCONFIGURED  503
```

### 7.4 Mobile JWT

Claims:

```json
{
  "sub": "<google_user_id>",
  "email": "user@example.com",
  "device_id": "uuid",
  "jti": "uuid",
  "aud": "zippp-mobile",
  "iss": "zippp.link",
  "ver": 1,
  "scope": "mobile_scan",
  "iat": 1792684800,
  "exp": 1795276800
}
```

- Algorithm: HS256 only.
- Secret: `MOBILE_JWT_SECRET`, at least 32 bytes.
- Missing secret in production fails closed.
- Lifetime: 30 days.
- Verification checks:
  - header algorithm
  - signature
  - `aud`
  - `iss`
  - `ver`
  - `scope`
  - `exp`
  - `iat`
  - `jti`
  - `device_id`
  - device `user_id` equals `sub`
- Revoked device or stale `jti` returns `401 DEVICE_REVOKED`.

### 7.5 Devices

Redis:

```text
auth:device:<device_id> -> {
  device_id, user_id, device_name, app_version, platform,
  paired_at, last_seen_at, revoked, revoked_at, jti
}
auth:user_devices:<user_id> -> set of device ids
```

Rules:

- A device id cannot belong to two users.
- Re-pairing the same device replaces its `jti`.
- `touchDevice` updates `last_seen_at` with an atomic Lua check so a revoke
  cannot be overwritten.
- Web lists devices and can revoke one or all.
- Mobile logout revokes the current device.
- A lost phone is revoked from web Settings.

Endpoints:

```text
GET  /api/auth/devices          web session only
POST /api/auth/device/revoke    web session only
POST /api/auth/logout           mobile bearer or web session
```

### 7.6 Request user resolver

`requestUser(req)`:

1. If an `Authorization: Bearer` header is present and mobile is enabled:
   - verify the JWT
   - verify the device and user binding
   - return `{ userId, email, admin:false, source:"mobile", deviceId }`
2. Otherwise fall back to the web cookie session.
3. Never accept a mobile token on admin, top-up, invite, or payment routes.
4. Pass an explicit `userId` to every store and Google helper:
   - `loadTokensForUser(userId)`
   - `loadWorkspaceForUser(userId)`
   - `appendRows(..., userId)`

Routes using it:

```text
/api/extract
/api/sheets/append
/api/billing/balance
/api/corrections
```

### 7.7 Extract

`POST /api/extract`

- Multipart form.
- Only `image` is accepted.
- JPEG, PNG, or WebP.
- Max 12 MB.
- Optional mobile bearer.
- Web requests remain compatible without a bearer.
- Returns receipt JSON plus a server-issued `scanId`.
- Records mobile scan ownership at `scan:owner:<userId>:<scanId>`.
- Does not store the image on zippp servers.
- The response includes an always-on debug trace.

Pipeline:

```text
PP-OCRv6
  -> indexed rows
  -> DeepSeek Flash
  -> verifier
  -> receipt JSON + flags

Fallbacks:
  PaddleOCR failure/timeout -> DeepSeek vision
  DeepSeek failure -> Gemini last resort
  Hedge: vision leg can start in parallel after PADDLEOCR_HEDGE_MS
```

### 7.8 Receipt verifier

`verifyReceipt()` is deterministic grounding:

- Amount, qty, total, date, and merchant must appear in OCR tokens.
- Ungrounded values become `null` and get a flag.
- Row mismatches and low OCR scores get flags.
- Arithmetic mismatches get flags.
- Without OCR text, every present value is flagged `ungrounded`, not silently
  trusted.
- A bad result can trigger one vision re-read.

Flag reasons:

```text
Hard: missing, not_in_ocr, ungrounded, arithmetic
Soft: low_confidence, row_mismatch
```

The Sheet is never written by the model.

### 7.9 Review FSM

```text
Camera
  -> Uploading
  -> Review
     -> hard flags? block Terima until edited or explicitly acknowledged
     -> Ubah: edit fields, mark Diedit, send correction telemetry
     -> Buang: discard, 0 credits
     -> Terima: append, 1 credit
```

Rules:

- `Terima` is disabled while appending.
- On `402 NO_CREDITS`, show a neutral zero-quota state, not a purchase link.
- On `409 SCAN_ALREADY_SENT`, check the stored result and treat it as success if
  the row exists.
- On `401 DEVICE_REVOKED`, clear the local token and return to pairing.
- On `401 GOOGLE_RECONSENT`, tell the user to sign in again on the web.
- If the receipt date is null, the client fills the capture date and marks it
  `tanggal diasumsikan`.

Current Android review is partial:

- merchant and total edit
- hard-flag acknowledgement
- no template ops
- no correction telemetry
- no line-item edit
- no assumed-date pill

### 7.10 Append

`POST /api/sheets/append`

Request:

```json
{
  "scanId": "server-issued-uuid",
  "receipt": {
    "merchant": "string|null",
    "date": "YYYY-MM-DD|null",
    "currency": "IDR|null",
    "category": "string|null",
    "line_items": [
      {
        "description": "string|null",
        "qty": 1,
        "unit_price": 15000,
        "amount": 15000
      }
    ],
    "subtotal": 15000,
    "tax": null,
    "total": 15000
  },
  "staff": "Sonny",
  "outlet": "Pusat",
  "payment": "QRIS",
  "purpose": null,
  "customer": null
}
```

Success:

```json
{
  "ok": true,
  "rows_written": 3,
  "spreadsheet_title": "Pengeluaran 2026",
  "sheet_tab": "Sheet1",
  "scanId": "uuid",
  "credits_remaining": 84
}
```

Rules:

- Auth: mobile bearer or web cookie.
- `userId` is explicit.
- Workspace must exist and have a column map.
- Staff must be in `staff_names` when that list is non-empty.
- Outlet must be in `outlets`; default outlet is used when omitted.
- Multiple outlets with no outlet returns `OUTLET_REQUIRED`.
- Payment is checked against the template's allowed values.
- Text lengths are capped.
- Max 200 line items.
- All text cells pass through `escapeSheetText()`.
- Credit spend: `scan:${userId}:${scanId}`.
- Result cache: `scan:result:${userId}:${scanId}` for 24h.
- A retry returns the cached result with `duplicate: true`.
- A duplicate spend with no cache returns `409 SCAN_ALREADY_SENT`.
- Append failure refunds.
- A successful append is never refunded because a later balance read failed.
- Mobile must present a server-issued scan id.
- Low-credit Telegram alert is sent after a successful spend.

Error codes:

```text
UNAUTHORIZED            401
DEVICE_REVOKED          401
GOOGLE_RECONSENT        401
NO_CREDITS              402
SCAN_ALREADY_SENT       409
RECEIPT_INVALID         400
RECEIPT_EMPTY           400
SCAN_ID_INVALID         400
SCAN_NOT_ISSUED         400
NO_WORKSPACE            400
STAFF_INVALID           400
OUTLET_INVALID          400
OUTLET_REQUIRED         400
PAYMENT_INVALID         400
ROWS_INVALID            400
APPEND_FAILED           4xx/5xx
SERVER_MISCONFIGURED    503
```

### 7.11 Google Sheets formula safety

`escapeSheetText()`:

- Prefixes `'` when a string starts with `=`, `+`, `-`, `@`, tab, or carriage
  return.
- Applied to every text cell from OCR or client input.
- No client-supplied `=HYPERLINK(...)` exception.
- A photo link must be constructed server-side after the image is uploaded.
- The current mobile append body cannot pass a formula.

`appendRows()` uses `USER_ENTERED`, so this sanitization is mandatory. Without
it, a receipt or client edit can inject a formula into the user's Sheet.

### 7.12 Credits and billing

- 1 credit = 1 successful `Terima`.
- Failed reads and `Buang` cost zero.
- Credits are lots with a 30-day expiry.
- Spend earliest-expiring lot first.
- Spend and grant are atomic Lua scripts.
- Every grant needs an idempotency key.
- `billingConfigured()` is true only with Upstash REST env vars.
- Without Upstash, the app runs unconfigured and does not enforce credits.
  Production must use Upstash.

Keys:

```text
bill:acct:<userId>
bill:ledger:<userId>
bill:user:<userId>
bill:idem:<key>
bill:ref:<code>
bill:email:<email>
bill:kasera:<orderId>
bill:kasera:tx:<txId>
bill:kasera:user:<userId>
```

Pricing:

| | Indonesia `/id` | International `/` |
|---|---|---|
| Unit | Rp 150 / credit | 100 credits / $9 |
| Entry | Rp 15.000 = 100 scans; invite may start at Rp 10.000 | one-time pack |
| Pay | Kasera QRIS; manual GoPay fallback | Paddle |
| Lots | 30-day expiry | same |
| Referral | 20% of referred top-ups; referred +20 once | same |
| Free tier | None; referral is the only free credit | none |

### 7.13 Telegram

Admin alerts:

- `src/lib/telegram/admin.ts`
- Sends to `TELEGRAM_CHAT_ID`.
- Existing callers use `sendTelegram`.
- A Telegram failure never blocks the caller.

User alerts:

- low credit
- top-up confirmed
- new device paired

Link tokens:

- 32 hex chars (128 bits).
- 10-minute TTL.
- Stored as `SHA-256(token)` at `telegram:link:<hash>`.
- Consumed with `GETDEL`.
- Private chat only.
- One chat per user and one user per chat.

Mappings:

```text
telegram:user:<userId> -> chatId
telegram:chat:<chatId> -> userId
telegram:update:<updateId> -> dedupe, 24h
telegram:low_credit:<userId> -> alert dedupe, 24h
```

Webhook:

```text
POST /api/telegram/webhook
Header: x-telegram-bot-api-secret-token
```

- Timing-safe secret comparison.
- `update_id` deduplication.
- Private chat required.
- Commands:
  - `/start link_<token>`
  - `/saldo`
  - `/balance`
  - `/bantuan`
  - `/help`
  - `/unlink`
- Groups are rejected.
- No receipt images through Telegram in this version.
- No purchase CTA in low-credit alerts.

### 7.14 App version / OTA manifest

`GET /api/app-version`

Query or header:

```text
channel=play|sideload
current_version_code=<int>
```

Response:

```json
{
  "ok": true,
  "version_code": 2,
  "version_name": "1.0.1",
  "min_supported_version_code": 1,
  "mandatory": false,
  "release_notes": "Plain text, max 500 chars",
  "channel": "sideload",
  "download_url": "https://.../zippp-v1.0.1-sideload.apk",
  "sha256": "64 hex chars",
  "size": 12345678
}
```

- `mandatory` is computed from `min_supported_version_code`.
- Play channel returns `play_store_url` and no APK URL.
- The Android sideload installer is not implemented yet.
- A Play build must not install GitHub APKs.

### 7.15 Zippp Space membership (FEAT-114)

Server: `src/lib/space/space-store.ts` and `invite-store.ts`. A `SpaceRecord`
carries `space_id`, `display_name`, `owner_user_id`, `members[]` (`user_id`,
`email`, `role`, `joined_at`), and `sheet_source_user_id`.

| Method | Path | Who |
|---|---|---|
| GET, POST | `/api/spaces` | any signed-in user; POST creates |
| GET, PATCH | `/api/spaces/[spaceId]` | members; PATCH owner only |
| POST | `/api/spaces/[spaceId]/invite` | owner only |
| DELETE | `/api/spaces/[spaceId]/members/[userId]` | owner only |
| POST | `/api/spaces/[spaceId]/leave` | members, never the owner |
| GET | `/api/spaces/join?code=` | public preview, no consume |
| POST | `/api/spaces/join` | signed-in invitee |

- Invites are single use, expire in 7 days, and store only a SHA-256 hash.
- An invite created with an email only joins that address; a mismatch leaves it usable.
- The owner cannot leave or be removed. Removing a member also clears their index.
- Web: `/app/settings/space` manages create, invite, remove, leave; `/join?code=`
  is the invite landing page. OAuth login accepts `?next=` (same-origin only).
- Android: `GET /api/spaces` returns each Space with role and member count; the
  camera screen lists Space names. Copy says Space, never family (DEC-001).

---

## 8. Android app

**Product (DEC-003):** first-class Zippp Space client — same capabilities as web
except payment (DEC-002). Auth target: Google + magic link (FEAT-113). Proactive
capture via **Notification Listener Service** (DEC-004); Accessibility scrape is out.

### Play billing constraints (DEC-002; binding on all flavors)

Goal: no Play Billing / IAP; checkout stays on the web (strategy, not a legal guarantee).

- **No** IAP, pricing screens, credit packs, or checkout on Android.
- **No** anti-steering CTAs ("buy on website", "upgrade at zippp.link", etc.).
- **Legacy pairing build:** no in-app registration until FEAT-113; entry is 8-char code only.
- Copy uses **"kuota scan" / "sisa scan"** (legacy credit meter) or fair-use **%**
  after FEAT-117 — never kredit, saldo, Rp, $ on Android.
- **Never** render raw server error strings. Map codes (`NO_CREDITS`,
  `GOOGLE_RECONSENT`, `DEVICE_REVOKED`, …) to wording keys.
- Zero quota UI: neutral status + **Muat Ulang** + **Bantuan** only.
  No purchase link, no "hubungi admin untuk membeli".
- Telegram low-credit alerts: informational only, no purchase URL.
- Do not add Android top-up or Play Billing — DEC-002 forbids it (FEAT-112 parked).

### Build

- Gradle 8.9, AGP 8.7.2, Kotlin 2.0.21
- `compileSdk 35`, `targetSdk 35`, `minSdk 26`
- JDK 21 for Gradle, Java 17 bytecode
- Flavors:
  - `play`: no GitHub APK install, no `REQUEST_INSTALL_PACKAGES`; future Play IAU
  - `sideload`: `REQUEST_INSTALL_PACKAGES`; future GitHub OTA via `/api/app-version`

### Current app flow (as shipped)

```text
MainActivity
  -> token in SecureTokenStore?
     no  -> PairingScreen (manual 8-char code; no QR yet)
     yes -> CameraScreen
              -> capture
              -> POST /api/extract
              -> ReviewScreen
                 -> Terima -> POST /api/sheets/append
                 -> Ubah   -> edit merchant/total only
                 -> Buang  -> discard
```

`ApiClient`: claim, extract, append. Preview builds may send a Vercel bypass
header — keep that APK private.

### Token storage

- Android Keystore AES-256-GCM; ciphertext in private prefs.
- `allowBackup=false`. No token in logs.

### Target Android capabilities (not all shipped)

| Capability | Status |
|---|---|
| Pairing code claim + JWT | Done (Preview verified) |
| CameraX capture | Done |
| Review Terima/Ubah/Buang | Partial (merchant/total only) |
| Hard-flag block + ack | Partial |
| Template ops + line-item Ubah + assumed date + corrections | FEAT-102 |
| QR pairing + steady / auto-snap | FEAT-107 |
| Photo proof upload | FEAT-103 |
| Offline queue + EXIF strip | FEAT-108 |
| Sideload OTA (SHA-256 + signer + PackageInstaller) | FEAT-105 |
| Play In-App Updates | FEAT-106 |
| Space device E2E proof (ROAD gate) | STORY-102 |
| Legacy companion E2E (parked) | STORY-101 |
| Production mobile enable | FEAT-110 (blocked on STORY-102) |

---

## 9. Web app

### Routes

```text
/                  English master landing
/id                Indonesian master landing
/for-*             Persona landings
/vs-*              Comparison pages
/pricing           Public pricing
/terms             Terms
/privacy           Privacy
/refund            Refund
/contact           Contact
/app               Guard -> /app/snap
/app/snap          Camera + batch review
/app/topup         Top-up (Kasera / Paddle / GoPay fallback)
/app/settings      Balance, language, sheet, devices, Telegram, sign out
/app/settings/sheet  Sheet setup / template wizard
/admin             Orders, grants, invitations (ADMIN_EMAILS only; else 404)
/app/wa-mock       Legacy WA mock (not strategic)
```

### Device UI

- `PairDeviceModal`: 8-char code, countdown, QR (`zippp://pair?code=`).
- `ConnectedDevices`: list + revoke.
- Hidden when `mobileApiEnabled` is false.
- `TelegramLinkPanel`: link/unlink.

### Copy system (runtime string table)

- Path: **`spec/wording.txt` only** (do not move; `content.ts` and
  `next.config.ts` hard-trace it).
- Server parses once via `src/lib/content.ts`; resolve with `src/lib/t.ts`.
- Android `res/values/strings.xml` generated:
  `npm run android:strings` → `scripts/gen-android-strings.mjs`.
- Rules: no em dashes; no hype words; never hardcode UI strings in TS/Kotlin.

### Env var names (values never in git or this doc)

Extraction: `EXTRACT_PROVIDER`, `PADDLEOCR_*`, `DEEPSEEK_*`, `GEMINI_*`,
`PADDLEOCR_HEDGE_MS`, `VISION_RETRY_HARD_MIN`.  
Google: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`,
`TOKEN_ENCRYPTION_KEY`, `DONATION_*`.  
Stores: `BLOB_READ_WRITE_TOKEN` or `UPSTASH_REDIS_REST_URL` +
`UPSTASH_REDIS_REST_TOKEN`, optional `ZIPPP_DATA_DIR`.  
Billing: `KASERA_*`, Paddle vars, optional DOKU (halted).  
Mobile: `MOBILE_API_ENABLED`, `MOBILE_JWT_SECRET` (≥32).  
Telegram: `TELEGRAM_*`, `TELEGRAM_WEBHOOK_SECRET`.  
Admin: `ADMIN_EMAILS`.  
App version / OTA: `APP_*` channel version fields.  
WA legacy: `WA_CHANNEL_ENABLED`, `WA_*`.  
Factory LLM (local only): `ZIPPP_FACTORY_LLM_API_KEY` or
`tools/factory/.factory-key`.

Never use `NEXT_PUBLIC_*` for secrets. PostHog public key is the exception.

---

## 10. Deployment and repo state

### Production

- `https://www.zippp.link`
- `https://www.zippp.link/id`
- Mobile API dark:
  - no `MOBILE_API_ENABLED`
  - no `MOBILE_JWT_SECRET`
- WhatsApp channel off.
- Do not promote mobile changes to Production until **STORY-102** passes (ROAD-001).

### Preview

- `https://preview.zippp.link`
- Preview-only environment:
  - `MOBILE_API_ENABLED=true`
  - generated `MOBILE_JWT_SECRET`
  - `GOOGLE_REDIRECT_URI=https://preview.zippp.link/api/auth/callback`
- Google OAuth redirect URI added.
- Vercel SSO protection is enabled.
- The test APK contains a Preview-only automation bypass header.
- Do not distribute that APK.

### Test APK

```text
/Users/mm/Dev/adit/zippp/android/app/build/outputs/apk/sideload/debug/app-sideload-debug.apk
```

- ~34 MB, debug-signed
- `versionName 1.0.0-preview2-sideload`
- package `link.zippp.app.debug`
- points to `https://preview.zippp.link`
- includes the Preview bypass header
- pairing confirmed on a real device
- capture / review / append **not** confirmed end to end

### Repo state (2026-10-24)

| Item | Value |
|---|---|
| Branch | `factory/software-factory` |
| HEAD | `d58f38a` — `factory: record FEAT-102 diagram and groom gate` |
| Factory commits | M0–M7 + post-M7 UI/grooming (summarized in §16) |
| Worktree | **Dirty** — ~81 short-status lines |
| Dirty includes | Theme reorg (`spec/themes/**` largely untracked), deletes of old `spec/*.md` paths, `AGENTS.md`, `README.md`, `.env.example`, product pivot files, wording |
| Factory code | Present under `tools/factory/` and largely committed on this branch |
| Rule | Commit with **explicit pathspecs**. Never `git add -A`. Do not mix factory-only commits with unrelated pivot noise unless intentional. |

---

## 11. Current implementation status

### Done and verified (product)

- Pairing code generation and claim (Preview, real APK).
- Device registry, revocation, and web device list.
- Mobile JWT, claims, device-user binding, revoked-device rejection.
- `resolveRequestUser` / `requestUser` bearer-or-cookie resolver.
- Server-issued scan ids and scan ownership.
- Extract image limits and mobile bearer path.
- Append dual auth, explicit `userId`, template ops validation,
  formula sanitization (`escapeSheetText`), result cache, spend on
  `scan:${userId}:${scanId}`.
- Telegram admin alerts, user link tokens, webhook, private-chat linking,
  `update_id` dedupe, `/saldo`, `/bantuan`, `/unlink`.
- Web pairing modal, connected devices, Telegram panel.
- App version endpoint (`GET /api/app-version`).
- Android Gradle project, `play` / `sideload` flavors, Keystore token storage,
  pairing screen, CameraX capture, partial review screen, append client.
- Android strings generated from wording (`npm run android:strings`).
- Data-boundary static tests.
- Root gates at this snapshot: `npm test` **43 passing**; `npx tsc --noEmit` **pass**.

### Done and verified (Software Factory)

- Go daemon: config, host guard, watcher (kqueue-safe full rescan), store,
  rewrite, hub WebSocket, verifier (static / model / test / prod).
- React UI: Tasks Kanban, Design, Gap, detail Spec/Diagram/Groom/Gap,
  Mermaid + local eraser/flow renderers, debug panel.
- Grooming assistant (DeepSeek-compatible LLM) with threads under
  `entities/threads/`.
- FEAT-111 verified to `done` by the factory verifier.
- DIAG-001, ERD-001, FLOW-001 status `done` (live vs planned diagrams).
- Factory web Vitest: **59** passing (last recorded gate).
- Factory check scripts: `tools/factory/scripts/check.sh`.

### Partial

- Android review: built with template ops, line-item edits, hard-flag blocking,
  assumed-date label, and correction telemetry. Device proof pending.
- Camera: capture works; no QR scanner, steady detection, or auto-snap.
- Web Rev 2 sheet product: audit Tasks 3–7 still open in code
  (`sheet-layout.ts` and product `drive.ts` do **not** exist; only
  `drive-donation.ts` for Google verification donation).
- Play compliance: no Data Safety submission; web-only pay posture is a strategy,
  not a guarantee.
- Release signing: scaffolded, no production keystore.
- **FEAT-113 / FEAT-114** code complete and committed: Android Google and magic
  link sign-in, device registry and revoke, Space create/invite/join/leave.
  Two-account and on-device sign-in proof pending.
- **FEAT-113 shipped without compiling:** `SignInScreen.kt` used two strings the
  generator never mapped. Fixed 2026-11-03; `:app:compileSideloadDebugKotlin`
  now passes.
- **FEAT-115** capture flow built: opt-in notification listener, local prompt
  with Camera and Manual actions, settings screen, manual entry through
  `POST /api/scan/manual`. Device run pending; Play declaration drafted in the card.
- **FEAT-116** assets and goals built: per-Space ledger with archive, web section
  on the Space page, Android Space screen, store tests. Browser and device runs
  pending.
- **FEAT-117** plan meter built: period and counter in Upstash, append blocks at
  the cap, Paddle checkout behind `PADDLE_PLAN_PRICE_ID`, web meter card, Android
  usage line. Prices stay outside the repo. Legacy credits still run.
- FEAT-112 parked per DEC-003; do not treat companion-only docs as north star.
- FEAT-102 flags: editing a flagged field or the acknowledge button clears the
  block. Correction telemetry posts per-field edited/flagged state; the
  acknowledge tap itself is not recorded.

### Not done

- **STORY-102** Space device proof (ROAD Phase 7 gate before FEAT-110).
- STORY-101 legacy companion E2E (parked; not the prod gate).
- FEAT-103 photo proof via Drive (product path).
- FEAT-104 month tabs and daily totals.
- FEAT-105 sideload OTA client (`OtaUpdateManager.kt` missing).
- FEAT-106 Play In-App Updates client.
- FEAT-107 QR pairing + steady detection.
- FEAT-108 offline queue + EXIF stripping.
- FEAT-109 rollout plan sync (checkboxes/stale contracts in plan).
- FEAT-110 Production mobile enablement (**blocked** on STORY-102).
- FEAT-112 Android umbrella — superseded by FEAT-113 + DEC-003; parked.

### Known code edge case (billing)

Append spends with idempotency key `scan:${userId}:${scanId}`, but
`refundScan()` deletes `bill:idem:scan:${scanId}` (no `userId`). After a failed
append, the credit grant refund may succeed while the spend idem key remains,
so a client retry can hit `409 SCAN_ALREADY_SENT` without a cached result.
Fix before trusting mobile retry under flaky networks.

---

## 12. Known risks

1. **Play compliance is not guaranteed.**
   Web-only checkout (DEC-002) is a review strategy, not a legal category.
   There is no in-app purchase and no purchase CTA, but Google may still treat
   externally purchased plan/credits as payment for an in-app service.
2. **OTA vs Play.**
   A Play-distributed app cannot install GitHub APKs. The `play` flavor must
   use Play In-App Updates and must not ship the sideload installer.
3. **Android review contract is incomplete (FEAT-102).**
   Ops, telemetry, assumed date, and line-item edit are not done.
4. **Month tabs / daily totals are not implemented (FEAT-104).**
   Append still writes to the existing single `sheet_tab`.
5. **Photo proof is not implemented (FEAT-103).**
   Reimbursement template is incomplete until Drive upload and linked photo.
6. **No Space end-to-end proof yet (STORY-102).**
   Pairing succeeded on Preview; Zippp Space capture path is unproven on device.
7. **Dirty worktree / mixed branch.**
   Factory is committed; theme reorg and much pivot surface remain uncommitted
   or half-migrated. Loss risk until committed with careful pathspecs.
8. **Preview bypass secret is in the test APK.**
   Keep the APK private. Never put the bypass into Production builds.
9. **Spec/roadmap drift (FEAT-109).**
   Rollout plan and some reviews still mention `photoUrl`, client `HYPERLINK`
   whitelist, DataStore, or "5 attempts per code". Code differs (Keystore +
   prefs, server-only hyperlinks, claim rate limits as implemented).
10. **Legacy docs vs DEC-003.**
    Old companion threads may still mention pairing-only or Android top-up.
    DEC-003 + DEC-002 win: full client auth on FEAT-113; no Android checkout.
11. **Refund / spend idempotency mismatch.**
    See §11. Can strand retries after append failure.
12. **Factory verification results are in-memory.**
    `.reports/*.json` exist on disk but are not reloaded into the UI on daemon
    restart; FEAT-111 can show "done without evidence" until re-verified.

---

## 13. Security invariants

- `MOBILE_API_ENABLED` is dark by default.
- Production fails closed if `MOBILE_JWT_SECRET` is missing.
- JWT verification checks algorithm, signature, audience, issuer, version,
  scope, expiry, issued-at, jti, device id, and device-user ownership.
- Pairing codes are hashed, single-use, and rate-limited.
- Device revocation is checked on every mobile request.
- `escapeSheetText()` blocks formula injection.
- Append spend is user-namespaced (`scan:${userId}:${scanId}`).
- The photo path imports `mobile-auth`, never the Google-aware `request-user`.
- The sheet path imports no AI module.
- Telegram webhook uses a timing-safe secret and private-chat-only linking.
- Factory daemon binds loopback only; Host and Origin are checked.
- Factory LLM key lives in `tools/factory/.factory-key` or
  `ZIPPP_FACTORY_LLM_API_KEY` — never commit the key file.
- No secrets in logs, git, `NEXT_PUBLIC_*`, or user-facing copy.

---

## 14. Important code map

### Product (Next.js)

```text
src/
├── app/
│   ├── api/
│   │   ├── app-version/route.ts
│   │   ├── auth/
│   │   │   ├── pair/generate/route.ts
│   │   │   ├── pair/claim/route.ts
│   │   │   ├── devices/route.ts
│   │   │   ├── device/revoke/route.ts
│   │   │   ├── login|callback|logout|me/...
│   │   ├── extract/route.ts          # photo path; mobile-auth only
│   │   ├── sheets/append/route.ts    # sheet path; no AI imports
│   │   ├── sheets/{connect,map,workspace}/
│   │   ├── telegram/{link,webhook}/
│   │   ├── billing/balance/
│   │   ├── corrections/
│   │   ├── topup/*, paddle/*, doku/*, kasera/*
│   │   ├── wa/*                      # legacy WhatsApp; do not extend
│   │   └── admin/*
│   └── app/{snap,settings,topup}/
├── components/app/
│   ├── PairDeviceModal.tsx
│   ├── ConnectedDevices.tsx
│   ├── TelegramLinkPanel.tsx
│   └── screens/SnapScreen.tsx
├── lib/
│   ├── auth/{mobile-token,mobile-auth,request-user,pairing-store,device-store}.ts
│   ├── mobile/{config,scan-store}.ts
│   ├── telegram/{admin,bot,store,alerts}.ts
│   ├── google/{sheets,templates,workspace-store,sheet-safe,oauth,token-store,kv,crypto,drive-donation}.ts
│   ├── billing/{ledger,redis,config,kasera,orders,paddle,doku,referral,invites}.ts
│   ├── extract-pipeline.ts
│   ├── verify-receipt.ts
│   ├── data-boundary.test.ts
│   ├── content.ts                    # parses spec/wording.txt
│   └── wa/*                          # archived channel
└── types/receipt.ts
```

**Missing product files called out by entities / audit:**

```text
src/lib/google/sheet-layout.ts   # FEAT-104 / Rev 2 — does not exist
src/lib/google/drive.ts          # FEAT-103 product proof — does not exist
android/.../OtaUpdateManager.kt  # FEAT-105 — does not exist
android/.../PlayUpdates.kt       # FEAT-106 — does not exist
android/.../OfflineQueue.kt      # FEAT-108 — does not exist
```

### Android

```text
android/app/src/main/java/link/zippp/app/
├── MainActivity.kt                 # token? PairingScreen : CameraScreen
├── data/{Models,ApiClient,SecureTokenStore}.kt
└── ui/{pairing/PairingScreen,camera/CameraScreen,review/ReviewScreen,theme/Theme}.kt
```

### Software Factory

```text
tools/factory/
├── factory.config.json
├── PROGRESS.md  NOTES.md  README.md
├── scripts/{check,check-daemon,check-web}.sh
├── testdata/selftest/{trace-target.ts,ok.js}
├── daemon/          # Go module zippp-factory, package main
│   ├── main.go app.go config.go server.go hub.go watcher.go
│   ├── spec.go store.go rewrite.go eraser.go verifier.go
│   ├── llm.go thread.go          # post-M7 grooming
│   └── *_test.go                 # includes e2e_test.go
└── web/             # Vite React DaisyUI
    └── src/{App,state,useFactorySocket,components/*,lib/*}
```

### Scripts

```text
scripts/gen-android-strings.mjs
scripts/eval.ts
scripts/grant.mjs
scripts/watch-logs.py
```

---

## 15. Repo doc layout (orientation only — not required reading)

Agents do not need these files for understanding. Listed so you do not recreate
them or move `wording.txt`.

```text
spec/
├── wording.txt                          # string table (edit when copy changes)
├── themes/03-zippp-software-factory/
│   ├── zippp-context-for-claude.md      <-- THIS FILE (agent source of truth)
│   └── entities/{features,bugs,stories,diagrams,threads}/
├── themes/01-mvp/ …                     # human theme docs (optional)
├── themes/02-android-telegram-pivot/ …  # human theme docs (optional)
└── archives/                            # history; ignore for new work
tools/factory/                           # factory implementation
src/  android/                           # product implementation
```

`wording.txt` must stay at `spec/wording.txt`. Theme reorg may still be
untracked in git; on-disk paths above are correct.

---

## 16. Zippp Software Factory (as built — complete for agents)

### Vision

Local-first Product OS: markdown entities → Kanban / Design / Gap → verifier
against real TypeScript/Kotlin/Go. Factory **reads** product code; never edits
`src/` or `android/`.

### Topology

- **State:** entity markdown on disk only. No factory DB.
- **Backend:** `tools/factory/daemon/` (Go module `zippp-factory`),
  `127.0.0.1:8080` only.
  - Index: `entities/{features,bugs,stories,diagrams}/**/*.md` only
    (not `threads/`, not prose specs, not `entities/README.md`)
  - Watcher: fsnotify/**kqueue** on macOS; add every dir; debounce ~150ms;
    **full rescan** each time (no incremental graph)
  - HTTP: `GET /healthz`, `GET /api/snapshot`, `GET /ws`
  - Host guard: only `127.0.0.1` / `localhost` / `::1`
  - Origin check on WS; empty Origin allowed (non-browser)
  - WS client→server: `resync`, `verify`, `groom_thread`, `groom_chat`
    (no `edit` — removed)
  - WS server→client: seq'd `snapshot`/`diff`/`verification*`; unseq'd
    `groom_*` / `error`
  - Verifier queue: size 32, dedupe, one worker; first scan never auto-verifies
  - LLM groom: DeepSeek-compatible chat; key from `.factory-key` or
    `ZIPPP_FACTORY_LLM_API_KEY`; threads at `entities/threads/<ID>.md`;
    lines starting with `DECISION:` become decision blocks
- **Frontend:** `tools/factory/web/` Vite + React 18 + Tailwind + DaisyUI + Mermaid
  - Tabs: Tasks | Design | Gap
  - Kanban: blocked band + `todo | groomed | in-progress | verify | done`
    (`groomed` = todo + required grooming checklist pass)
  - Detail: Spec / Diagram / Groom / Gap; starts collapsed; click-outside clears
  - Renderers: Mermaid, local eraser SVG ERD, simple `A -> B` flow, relation map
  - Debug panel
- **Removed:** Neovim bridge (`editor.go`, WS `edit`, config `editor`). Edit
  markdown in any editor; UI Spec tab is read-only.

### Binding factory decisions (do not reverse casually)

- On verify race (human changed status mid-run): keep status; store result with
  `wrote_status: false`; still broadcast so UI clears running.
- Omit `model` check when body has no eraser ERD entities.
- ERD field match is file-wide identifiers after entity name matches (`norm()`);
  fields are not scoped inside the declaration (known limit).
- Native `@eraserlabs/eraser-diagrams` packages 404'd; local SVG only.
- `test_command` runs as argv, no shell; deny `;|&<>$\`\n\r\\`; allowlist
  `npm npx node go ./gradlew ./android/gradlew`.
- Empty verification never passes.
- JSON arrays never null (always `[]`).
- Verification reports under `tools/factory/.reports/<ID>.json` (gitignored);
  not reloaded into UI memory on restart.

### Entity frontmatter

```yaml
---
id: FEAT-012
type: feature          # feature | bug | story | spec | diagram
title: Human title
status: todo           # todo | in-progress | blocked | verify | done
assignee: adit
relations:
  blocks: []
  implements: []
  depends_on: []
verification:
  target_files: []
  test_command: ""
  prod_endpoint: ""
---
```

### Verification engine (as built)

Trigger: entity **transitions into** `status: verify` (or appears already in
`verify` after the first scan). First startup scan never auto-verifies.
Manual Re-verify via WS only when status is already `verify`.

Checks in order:

1. **static** — if `target_files` non-empty: path safety, size ≤ 2 MiB, file
   contains `@implements <ID>` (comma lists allowed; exact id match).
2. **model** — if body has eraser ERD entities: every entity/field found via
   regex declarations in target files (`norm()` for plural/singular). Omitted
   entirely when there is no ERD (NOTES decision).
3. **test** — if `test_command` set: argv parse, allowlist first token, exit 0.
4. **prod** — if `prod_endpoint` set: HTTP(S) 200; if JSON has `ok`, require true.

`passed` = no failed check AND at least one passed check. Empty verification
never passes ("nothing to verify"). On pass, atomic status rewrite to `done`.
On fail, status stays `verify`; human fixes and clicks Re-verify.

### Run locally

```bash
cd tools/factory/daemon && go build -o ../bin/factory .
tools/factory/bin/factory -config tools/factory/factory.config.json
# other terminal
cd tools/factory/web && npm run dev
# open http://127.0.0.1:5173
tools/factory/scripts/check.sh
```

LLM key: `tools/factory/.factory-key` or env `ZIPPP_FACTORY_LLM_API_KEY`.
File is gitignored.

### Indexed entity backlog (2026-11-03)

| ID | Type | Status | Title |
|---|---|---|---|
| FEAT-111 | feature | **done** | Software Factory |
| DIAG-001 | diagram | **done** | System design map (live/planned) |
| ERD-001 | diagram | **done** | Logical ERD (live/planned) |
| FLOW-001 | diagram | **done** | User flow (live/planned) |
| FEAT-900 | feature | todo | Factory selftest fixture |
| FEAT-113 | feature | **done** | Android Google / magic-link auth (ROAD Phase 3) |
| FEAT-114 | feature | **done** | Zippp Space membership model (ROAD Phase 3) |
| STORY-102 | story | todo | Space device proof (ROAD Phase 7 gate) |
| STORY-101 | story | todo | Legacy companion E2E (parked) |
| FEAT-102 | feature | todo | Android review contract |
| FEAT-103 | feature | todo | Photo proof via Drive |
| FEAT-104 | feature | todo | Month tabs and daily totals |
| FEAT-105 | feature | todo | Sideload OTA |
| FEAT-106 | feature | todo | Play In-App Updates |
| FEAT-107 | feature | todo | QR pairing + steady detection |
| FEAT-108 | feature | todo | Offline queue + EXIF stripping |
| FEAT-109 | feature | todo | Update rollout plan to match code |
| FEAT-110 | feature | **blocked** | Enable mobile in Production (`depends_on: STORY-102`) |
| FEAT-112 | feature | todo | Parked umbrella — use FEAT-113 + DEC-003 |

Threads (not Kanban cards): `entities/threads/{FEAT-102,FEAT-111,FEAT-112}.md`.

---

## 17. Verification commands

```bash
# Product web
npm test
npx tsc --noEmit
npm run build

# Android strings
npm run android:strings

# Android debug
cd android
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export ANDROID_HOME="$HOME/Library/Android/sdk"
./gradlew :app:assembleDebug

# Software Factory
tools/factory/scripts/check.sh
# or separately:
# tools/factory/scripts/check-daemon.sh
# tools/factory/scripts/check-web.sh
```

Known results at this snapshot (2026-10-24):

```text
npm test: 43 passing, 0 failing
npx tsc --noEmit: pass
factory web tests (PROGRESS): 59 passing
factory daemon: go test -race used in check-daemon.sh
./gradlew :app:assembleDebug: previously pass for play and sideload; re-run before ship
```

Release build was smoke-tested earlier; release signing changed later.
Re-run `assembleRelease` before shipping.

---

## 18. How an agent should work

1. Read **only this file** for understanding (plus the code you will change).
2. Run `git status` and `git branch --show-current`. Do not assume clean.
3. Do not touch Production env. Keep `MOBILE_API_ENABLED` off in Production.
4. Do **one** task from §19. Optionally set the matching entity `status:` while
   working; do not treat other theme markdown as required reading.
5. Edit `spec/wording.txt` for any user-visible string; run
   `npm run android:strings` if Android copy changes.
6. If you change a contract, update **this file** in the same change.
7. Run the gates in §17 that the task touches. Report exact command tails.
8. Do not say "done" if a gate fails.
9. Commit with explicit pathspecs. Never `git add -A`.
10. Never print secrets, `.env`, tokens, Preview bypass, or `.factory-key`.

### Hard implementation rules

- Use `resolveRequestUser` / `requestUser` for dual auth where mobile is allowed.
- Pass explicit `userId` to Google helpers.
- `/api/extract` → `mobile-auth` only; never `request-user`.
- `/api/sheets/append` → no AI module imports.
- `escapeSheetText()` on every text cell; no client formulas.
- Spend idem: `scan:${userId}:${scanId}` (fix `refundScan` key mismatch if you
  touch billing — delete the same key you spend with).
- Android: map error codes; `kuota scan` / `sisa scan`; no purchase CTAs.
- No hardcoded UI copy outside `wording.txt`.
- Factory changes stay under `tools/factory/**` and entity markdown.
- No Android billing / IAP — DEC-002; FEAT-112 is parked (use FEAT-113 for auth).

---

## 19. Next tasks in priority order

Follow **ROAD-001**. Do not revive companion credit E2E as the main gate.

1. **Phase 3 verification** — FEAT-113 / FEAT-114 code is complete and committed.
   Prove Android sign-in and two-account Space on a device; reopen only if it fails.
2. **FEAT-102 / FEAT-115** — both built, in Factory verify, and both need a
   device run. Manual entry now gets a server-issued scan id, so credits and
   idempotency behave exactly like a camera scan.
3. **FEAT-117** — fair-use meter, Paddle checkout, Android usage built and in
   Factory verify. Open: Paddle cancel UI, legacy credit migration. Then STORY-102
   needs a real phone, so the rest of Phase 7 is yours.
4. **STORY-102** — Space device proof (Phase 7).
5. **FEAT-110** — Production mobile enable only after STORY-102.
6. Keep distribution hygiene as needed: FEAT-105/106/108; FEAT-107 after auth.
7. Commit with explicit pathspecs, never `git add -A`. Worktree is clean as of
   2026-11-03.

Parked: STORY-101, FEAT-109, FEAT-112 (blocked; decisions live in DEC-*).

---

## 20. What not to invent

- Do not open other `spec/**/*.md` files to "get more context." It is already here.
- Do not assume WhatsApp is live. Legacy `src/lib/wa/` only.
- Do not assume month tabs, Drive proof, staff UI, OTA, or E2E append are shipped.
- Do not scaffold a new Software Factory. It exists under `tools/factory/`.
- Do not restore the Neovim terminal bridge unless product asks.
- Do not propose a second ledger, full accounting, inventory truth, payroll, tax,
  BSP, or WA blast tool.
- Do not move extraction, credits, or append into the client.
- Do not hardcode UI copy outside `wording.txt`.
- Do not add Android purchase flows — DEC-002 forbids it.
- Do not put factory state in a database.
- Do not trust browser/mobile for entitlement or admin.
- Do not market resto/sales/reimbursement as ICP.
- Do not label Spaces or collaborators “family” (DEC-001).
- Do not expand ICP to restaurant / sales / reimbursement mills (DIR non-goals).
- Do not add Accessibility-service bank scraping (DEC-004 / DIR non-goals).
- Do not join photo path with Google code, or sheet path with AI code.

---

## 21. Glossary

| Term | Meaning |
|---|---|
| Zippp Space | Shared personal finance context (DEC-001). Collaborators are **mates**, never "family". |
| Fair-use % | Subscription usage meter (DEC-002). Shown on web and Android; checkout web-only. |
| NLS | Android **Notification Listener Service** for proactive spend capture (DEC-004). |
| DIR / DEC / ROAD | Direction, decision, and roadmap entity cards under `entities/`. Override this file if they conflict. |
| SoR | System of record. User's Google Sheet (connected landing surface; Space expands beyond Sheet-only). |
| `Terima` | Accept. Legacy code: spends 1 credit and appends. |
| `Ubah` | Edit. User attestation over extracted values. |
| `Buang` | Discard. Zero charge (legacy: zero credits). |
| Hard flag | Missing/ungrounded/arithmetic issue that blocks Accept. |
| Soft flag | Low-confidence or row-mismatch warning that does not block. |
| Scan id | Server-issued id for one extraction/append attempt. |
| Lot (legacy) | Prepaid credit grant with 30-day expiry; replaced by fair-use subscription (ROAD Phase 6). |
| Credit (legacy) | 1 credit = 1 Terima in current code; not the north-star monetization model. |
| Play billing posture | No IAP / no checkout on Android (DEC-002). Not a legal category label. |
| Sideload | Direct APK distribution from GitHub Releases. |
| Play flavor | Play-distributed build with no GitHub APK installer. |
| Factory entity | Markdown file with YAML frontmatter under indexed entity dirs. |
| Trace ID | `// @implements FEAT-012` marker for static verification. |
| Preview bypass | Vercel protection token used only by the test APK. |
| Groomed column | Kanban lane for `todo` cards that pass required grooming checks. |
| Groom thread | `entities/threads/<ID>.md` chat log; `DECISION:` lines are binding unless superseded by DEC cards. |
| Live vs planned | Design-view split in DIAG/ERD/FLOW entities. |
| Rev 2 | 2026-10 MVP audit: month tabs, daily block, Drive proof, ops UI. |

---

## 22. Final state summary

- **DIR-001 Zippp Space** is locked: personal finance OS, shared Space, web-only pay,
  Android full client, NLS proactive capture.
- **ROAD-001 Phases 1–3 code done:** Factory Direction tab, living spec, Phase 3
  auth + Space backend, web, and Android sign-in. Device proof pending.
- **Implemented (legacy companion spine):** pairing, extract/append contracts, Telegram,
  web device UI. Pairing verified on Preview with a real APK; Space path not proven.
- Software Factory built (FEAT-111 `done`), with a build runner. Not "next to build."
- Android review partial; Rev 2 sheet layout and Drive proof still missing in code.
- Production mobile dark. **FEAT-110 blocked on STORY-102** (not STORY-101).
- Worktree clean as of 2026-11-03; commit with explicit pathspecs only.
- **Next agent (ROAD Phase 4):** **FEAT-102** / **FEAT-115** → assets **FEAT-116** →
  fair-use **FEAT-117** → **STORY-102** device proof → **FEAT-110** only after STORY-102.

---

## 23. Document maintenance

This file must stay agent-complete. When reality changes:

1. Bump **Snapshot** and the "What changed" bullets.
2. Refresh §2 milestone, §10 (git), §11 (status/gates), §16 entity table, §19
   priorities — keep them aligned with **ROAD-001** phase checkboxes.
3. If a contract changes in code, update the matching §3–§9 / §4 / §8 section
   in the **same** change — do not push detail into other markdown that agents
   would need to open.
4. Never reintroduce "see SPEC-X.md" as required reading. Optional human docs
   may exist; agents must not depend on them.
5. After large product shifts, re-read this file as a cold agent would and fill
   any gap that would force opening another doc.
6. If **DIR-001** or a **DEC-*** card changes, patch this file in the same pass —
   entity cards win over prose here.
