# zippp architecture

Depends on: `SPEC.md`, `USER-FLOW.md`
Owns: how it is built. Column dictionary: `TEMPLATES.md`. Copy: `wording.txt`.

---

## Law

**The Google Sheet is the system of record.** zippp extracts, maps, appends. It
does not keep a second ledger. Facts come from the extraction pipeline, then the
review step, then Sheets. The model never writes straight to the sheet.

---

## Stack

- **Next.js App Router + TypeScript + Tailwind.**
- `google-auth-library` (OAuth + Sheets), `@google/genai` (Gemini fallback),
  `@vercel/blob` (durable session store).
- Deployed on Vercel; runtime logs are the observability source of truth.

### Layout

```
src/
  app/                 routes: /, /app, /api/**
  components/landing/  landing page
  components/app/      AppFlow, screens, queue, debug panel, camera detector
  lib/                 extraction pipeline, region, wording loader, Google helpers
spec/                  all specs and docs (archived/ for inactive)
```

---

## Extraction pipeline

`POST /api/extract` returns the receipt JSON plus an always-on `debug` trace.

```
photo → PP-OCRv6 (Baidu AI Studio) → indexed rows → DeepSeek Flash → verifier → receipt JSON
             │ fails / times out          │ fails                        │ fails badly
             ▼                            ▼                              ▼
     DeepSeek Flash vision → Gemini (last resort)   DeepSeek Flash vision + OCR text (once)
```

- **PP-OCRv6** (`src/lib/paddleocr.ts`): submit → poll → result. The result is
  JSONL `ocrResults` with `rec_texts` + `rec_boxes` + `rec_scores`; tokens are
  grouped into visual rows by y-centre and joined with ` | `.
- **Compactor** (`src/lib/ocr-compact.ts`): strips HTML tables / whitespace so
  DeepSeek gets a compact payload. Rows are prefixed with a zero-based index.
- **DeepSeek Flash** (`src/lib/deepseek.ts`): text-only structuring with
  `response_format=json_object` and thinking disabled; also the vision fallback.
  Every field carries a `*_source` row index.
- **Verifier** (`src/lib/verify-receipt.ts`): deterministic grounding of every
  amount, qty, total, date and the merchant in the OCR tokens; ungrounded values
  become `null` and get a flag. Row mismatches, low OCR scores and arithmetic
  mismatches get flags. A bad failure allows one vision re-read with the OCR text.
- **Gemini** (`src/lib/gemini.ts`): last-resort fallback.
- **Orchestration** (`src/lib/extract-pipeline.ts`): attempt order
  `paddle → deepseek-vision → gemini`, verification, per-stage timings
  (`debug.stageMs`), and the debug trace (`debug.flags`). If PaddleOCR has not
  answered within `PADDLEOCR_HEDGE_MS` (default 5000), the vision leg starts in
  parallel and the first result that passes the verifier is used. A `method`
  option runs exactly one method for the admin eval, with no fallback, hedge,
  retry, or essentials gate. If the OCR-structured result carries several hard
  flags (`VISION_RETRY_HARD_MIN`, default 3), one vision re-read with the OCR
  text is taken and the cleaner result wins.
- Timeouts are env-tunable (`PADDLEOCR_TIMEOUT_MS`, `DEEPSEEK_TIMEOUT_MS`,
  `GEMINI_TIMEOUT_MS`).

---

## Session & data stores

Two small JSON records — Google tokens and the workspace config — behind one
abstraction (`src/lib/google/kv.ts`):

```
private Vercel Blob  →  Upstash Redis REST  →  filesystem (.data / ZIPPP_DATA_DIR)
```

- Selected from env: `BLOB_READ_WRITE_TOKEN`, else `UPSTASH_REDIS_REST_*`, else
  the filesystem. On Vercel the filesystem is ephemeral (`/tmp`), so Blob is the
  production path.
- The refresh token is encrypted at rest with `TOKEN_ENCRYPTION_KEY`
  (AES-256-GCM, `src/lib/google/crypto.ts`).
- Remote read/write failures log `store.read.failed` / `store.write.failed` and
  degrade to the filesystem instead of 500-ing.
- OAuth `state` lives in a short-lived httpOnly cookie, not server memory.
- **Per-browser session**: the OAuth callback sets `zippp_sid`, an encrypted
  (AES-256-GCM) httpOnly cookie holding the Google user id. Token and workspace
  records are keyed by that id (`google-tokens/{id}.json`, `workspace/{id}.json`),
  so the app is multi-user and `/admin` is private. Without the cookie, a request
  is not signed in (admin routes return 404). Logout clears the cookie.
- The session is **server-side only** (there is no auth cookie). On open, `/app`
  asks `/api/auth/me` before rendering: a signed-in user lands in the app, a
  logged-out one is sent to the landing (`/` or `/id`) to sign in. This is why
  a reopen does not log you out.

---

## Billing (credits)

Upstash Redis REST (`src/lib/billing/*`), separate from the session store.
1 credit = 1 scan, spent on **Send**. Top-ups are lots with a 30-day expiry;
spend takes the earliest lot and is **atomic** (Lua `EVAL`); grants are
**idempotent** on a key. `billingConfigured()` gates enforcement: without
Upstash the app runs unconfigured and does not enforce credits.

- `GET /api/billing/balance` → `{ configured, credits, soonestExpiry, refCode }`.
- Guard redirects to `/app/topup` at zero credits; Snap/Send are blocked.
- `npm run grant -- <email> <credits>` writes an `admin_grant` lot.
- `GET /api/auth/me` creates the user record (ref code + referral lock) on load.

Keys: `bill:acct:{id}`, `bill:ledger:{id}`, `bill:user:{id}`, `bill:ref:{code}`,
`bill:email:{email}`, `bill:idem:{key}`, `bill:doku:{invoice}`,
`bill:doku:recent`. (`bill:order:*`, `bill:orders:*`, `bill:codes` are
leftovers from the retired GoPay flow and can be deleted.)

### Top-up and admin

- **Indonesia** (`/id`): DOKU Checkout (hosted page). `POST
  /api/topup/doku` signs a `/checkout/v1/payment` request (HMAC-SHA256 over
  Client-Id, Request-Id, Request-Timestamp, Request-Target, Digest), stores
  `bill:doku:{invoice}` and redirects to DOKU's URL. Invoice numbers are
  alphanumeric, under 30 chars. The request sends
  `payment.payment_method_types` from `DOKU_PAYMENT_METHODS` in
  `src/lib/billing/config.ts`, so the checkout only offers channels whose
  Notification URL is configured in the DOKU Back Office. DOKU POSTs to `/api/doku/notify`; the route
  verifies the signature against its own path, checks the amount, and grants
  once (idempotent on `doku:{invoice}`). The customer returns to
  `/app/topup?doku={invoice}`, which polls `GET /api/topup/doku/[invoice]`.
  States: `pending -> paid | failed | expired`. Sandbox and production are
  selected by `DOKU_ENV`. Presets: Rp 15.000 / 30.000 / 50.000 / 100.000
  (`IDR_TOPUP_PRESETS`, Rp 150/credit → 100 / 200 / 333 / 666 scans). Manual
  GoPay was retired; old ledger entries keep `topup_gopay` as their source.
- **International**: Paddle.js checkout (`PADDLE_CLIENT_TOKEN`,
  `PADDLE_PACK_PRICE_ID`); `POST /api/paddle/webhook` verifies the signature and
  grants on `transaction.completed` (idempotent on the transaction id).
- **Admin** (`/admin`, `ADMIN_EMAILS`): recent DOKU payments (read-only) and
  manual grant.
  Every admin route checks the email server-side and returns 404 otherwise.
- **Telegram** (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`): paid and
  amount-mismatch alerts; a failure never blocks the payment.
- **Referral**: 20% to the referrer and a 20-credit first-top-up bonus, run on
  every approved/completed top-up (`src/lib/billing/referral.ts`).

Regions: `/` (English, USD) and `/id` (Indonesian, IDR). A redirect in
`next.config.ts` sends Indonesian IPs to `/id`; middleware sets the region
cookie and captures `?ref=CODE`. An **EN/ID language selector** in the
landing nav, the footer, and the app header overrides copy only; `/` and `/id`
remain the regional entry routes.

## Region & language

`next.config.ts` redirects `/` to `/id` when `x-vercel-ip-country` is `ID` and
the `zippp_region` cookie is missing, so the redirect happens once and anyone
who picked Worldwide is not bounced back. `src/middleware.ts` stamps
`zippp_region` (`id` / `intl`) from the path, forwards it on the request so the
first render is correct, and stores `?ref=CODE`.

- Region drives **pricing currency**. Indonesia → IDR; else English (US) + intl.
- Language follows the region by default (`id` → Indonesian, else English). The
  EN/ID selector writes `zippp_lang`; `getLocale()` prefers it, so a visitor can
  read the copy in either language without changing the price currency.

## Wording

Every user-visible string lives in **`spec/wording.txt`** (`## key.lang` entries).
`src/lib/content.ts` parses it once on the server; `src/lib/t.ts` resolves keys.
`next.config.ts` traces the file into the serverless bundle. Edit values only.

---

## Templates and sheet layout

Five templates (`src/lib/google/templates.ts`): `resto-inventory`,
`personal-expense`, `sales-recap`, `reimbursement`, `custom`. Column contract:
`TEMPLATES.md`. Revision 2 layout modules (to build):

- `src/lib/google/sheet-style.ts` — widths, formats, colours (no magic numbers
  in `sheets.ts`).
- `src/lib/google/sheet-layout.ts` — `ensureMonthTab`, `hideOldTabs` (keep 12),
  `summaryUpsert`. Composes `batchUpdate`.
- `src/lib/google/drive.ts` — `ensureFolder`, `uploadJpeg`, `trashFile` for
  photo proof under `[zippp] Receipts/YYYY-MM/`.

Zippp-owned sheets: `Summary` + one tab per `YYYY-MM` from **receipt date**.
Daily formula block on each month tab. Tabs older than 12 months hidden.
`custom` stays single-tab, no block, no photo.

## Data flow

```
Staff phone
  → photo
  → POST /api/extract              → PP-OCRv6 → DeepSeek → receipt JSON + debug
  → Review cards (client, editable) + template ops
  → POST /api/sheets/append        { receipt, scanId, ops, image? }
       → spend 1 credit (idempotent on scanId)
       → ensureMonthTab(receipt date)   // zippp-owned templates
       → optional Drive upload → Photo hyperlink
       → build rows (one per line item)
       → spreadsheets.values.append
       → hideOldTabs(keep=12)
  → { ok, rows_written, sheet_tab, photo? }
  On any throw after spend: refund (+ trash uploaded file if any)
```

---

## Admin eval and improvement loop

Admin-only, guarded like `/admin` (server `currentUser().admin`, 404 otherwise).

- `/admin/eval` (`src/app/admin/eval/`): capture or upload photos, run four fixed
  methods per photo, see the reads side by side with flags and a diff against
  optional expected values, pick a winner or correct it, and save feedback. A
  Test OCR action shows the raw PP-OCRv6 tokens or the exact error.
- `/api/admin/eval`: runs the requested methods for one image. OCR is computed
  once per (image, OCR model), reused across the OCR methods, and cached in
  process memory for a short time. Optional `action: "ocr"` returns the raw OCR
  result or the error.
- The four methods are defined in `src/lib/admin/methods.ts`: OCR + DeepSeek,
  DeepSeek vision, OCR + Gemini, Gemini vision. `structureWithGemini` in
  `src/lib/gemini.ts` is the text-only Gemini structuring step.
- `/api/admin/feedback` stores a feedback record. An all-wrong correction also
  creates a lesson.
- `/admin/lessons` (`/api/admin/lessons`) reviews lessons. Approving opens a
  **change request**: a branch, a dossier at `eval/lessons/<id>.md`, and a pull
  request (via `src/lib/admin/github.ts`), plus a Telegram message.
- `/admin/releases` (`/api/admin/releases`) is the version and improvement log,
  with a manual deploy backed by `VERCEL_DEPLOY_HOOK_URL`.
- Feedback, lessons and releases persist through `src/lib/admin/eval-store.ts`,
  using the session store backend (Vercel Blob or Upstash Redis, else `.data`).
- Scores and metrics come from `src/lib/eval-score.ts`, shared by the CLI harness
  (`scripts/eval.ts`) and the admin UI. The metric to drive to zero is wrong and
  unflagged.
- `/api/corrections` records the field-level diff collected when a user accepts a
  card: edited or not, plus flag reasons and the run id. No images and no values.
  `/admin/insights` (`/api/admin/corrections`) shows the four boxes (edited and
  flagged, edited and unflagged, left and flagged, left and unflagged) and per
  flag reason edit rates.
- The CLI harness has `--init` to write a labels skeleton from `eval/images/` and
  `--compare` to run all four methods per photo.

---

## OAuth

- Web client in Google Cloud; redirect to zippp.
- Scopes: `spreadsheets` + `drive.file` (find/create `[zippp]` sheets). Not Gmail.
- `access_type=offline`, `prompt=consent`; the refresh token is required.
- Disconnect deletes tokens and workspace config.

---

## Env

| Name | Where |
|---|---|
| `EXTRACT_PROVIDER` (`paddle` \| `gemini`) | server |
| `PADDLEOCR_AISTUDIO_TOKEN` / `PADDLEOCR_MODEL` / `PADDLEOCR_BASE_URL` / `PADDLEOCR_TIMEOUT_MS` / `PADDLEOCR_POLL_INTERVAL_MS` / `PADDLEOCR_HEDGE_MS` | server |
| `DEEPSEEK_API_KEY` / `DEEPSEEK_MODEL` / `DEEPSEEK_BASE_URL` / `DEEPSEEK_MAX_TOKENS` / `DEEPSEEK_TIMEOUT_MS` | server |
| `GEMINI_API_KEY` / `GEMINI_TIMEOUT_MS` | server |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI` | server |
| `TOKEN_ENCRYPTION_KEY` | server |
| `BLOB_READ_WRITE_TOKEN` **or** `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` | server |
| `DOKU_ENV` / `DOKU_CLIENT_ID` / `DOKU_SECRET_KEY` / `DOKU_NOTIFY_PATH` | server; DOKU Checkout (`src/lib/billing/doku.ts`) |
| `ZIPPP_DATA_DIR` | server (local only) |
| `BUSINESS_NAME` / `BUSINESS_OPERATOR` / `BUSINESS_ADDRESS` / `CONTACT_EMAIL` / `CONTACT_WA` | server; shown on the public info pages (`src/lib/business.ts`) |
| `CONTACT_REVEAL_SECRET` | server; signs the contact-page email reveal challenge (`/api/contact/reveal`). Falls back to `TOKEN_ENCRYPTION_KEY` |

Never `NEXT_PUBLIC_` for secrets.

---

## Observability

- One structured JSON line per run: `{ event: "extract.run", runId, ok, provider,
  fallback, ocrChars, model, finish, usage, total_ms, stages, error }` → Vercel
  runtime logs.
- `npm run logs` (`scripts/watch-logs.py`) streams and pretty-prints those runs.
- Axiom (log drain) is planned, not yet wired.

---

## Failure handling

| Failure | Behaviour |
|---|---|
| OCR times out | DeepSeek vision re-reads the image |
| Model structuring fails | Next attempt in the chain; all fail → error, no append |
| Sheets 401 | Client returns to Sign in with a message |
| Append error | Error shown; item stays ready to retry |
| Store (Blob) error | Logged; degrade to filesystem |
