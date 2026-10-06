# zippp architecture

Depends on: `SPEC.md`, `USER-FLOW.md`
Owns: how it is built. Column dictionary: `TEMPLATES.md`. Copy: `wording.md`.

---

## Law

**The Google Sheet is the system of record.** zippp extracts, maps, appends. It
does not keep a second ledger. Facts come from the extraction pipeline, then the
Check screen, then Sheets — the model never writes straight to the sheet.

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
  `paddle → deepseek-vision → gemini`, verification, per-stage timings, and the
  debug trace (`debug.flags`).
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
  logged-out one sees Intro/Sign in. This is why a reopen does not log you out.

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
`bill:email:{email}`, `bill:idem:{key}`, `bill:order:{id}`, `bill:orders:open`,
`bill:orders:recent`, `bill:codes`, `bill:orders:hour:{id}:{hour}`.

### Top-up and admin

- **Indonesia** (`/id`): manual GoPay. `POST /api/topup/orders` creates an order
  with a unique code 1-999; the pay amount is base + code. States:
  `pending -> claimed -> approved | rejected | expired` (60-min TTL, one open
  order per user, max 5/hour). `/app/topup/order/[id]` shows the number, exact
  amount, countdown and "I have paid".
- **International**: Paddle.js checkout (`PADDLE_CLIENT_TOKEN`,
  `PADDLE_PACK_PRICE_ID`); `POST /api/paddle/webhook` verifies the signature and
  grants on `transaction.completed` (idempotent on the transaction id).
- **Admin** (`/admin`, `ADMIN_EMAILS`): approve/reject orders and manual grant.
  Every admin route checks the email server-side and returns 404 otherwise.
- **Telegram** (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`): new-order and
  paid-notice alerts; a failure never blocks the order.
- **Referral**: 20% to the referrer and a 20-credit first-top-up bonus, run on
  every approved/completed top-up (`src/lib/billing/referral.ts`).

Regions: `/` (English, USD) and `/id` (Indonesian, IDR). Middleware sets the
region at entry and captures `?ref=CODE`. The language toggle is removed.

## Region & language

`src/middleware.ts` stamps `zippp_region` (`id` / `intl`) from
`x-vercel-ip-country` (Vercel) or `Accept-Language` (local), and forwards it on
the request so the first render is correct. `?region=id|intl` overrides for
preview.

- Region drives **pricing currency**; language (`zippp_lang`, user-toggleable)
  drives **copy**. Indonesia → Indonesian + IDR; else English (US) + intl.

## Wording

Every user-visible string lives in **`spec/wording.md`** (`## key.lang` entries).
`src/lib/content.ts` parses it once on the server; `src/lib/t.ts` resolves keys.
`next.config.ts` traces the file into the serverless bundle. Edit values only.

---

## Templates

Only **`resto-inventory`** is implemented (`src/lib/google/templates.ts`,
`connect` route). `personal-expense` and `custom` are spec-only (`LATER.md`).

## Data flow

```
Staff phone
  → photo
  → POST /api/extract              → PP-OCRv6 → DeepSeek → receipt JSON + debug
  → Check screen (client, editable)
  → POST /api/sheets/append        { receipt, staff, outlet }
       → load workspace map + refresh Google token
       → build rows (one per line item)
       → spreadsheets.values.append
  → { ok, rows_written, spreadsheet_title, sheet_tab }
```

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
| `PADDLEOCR_AISTUDIO_TOKEN` / `PADDLEOCR_MODEL` / `PADDLEOCR_BASE_URL` / `PADDLEOCR_TIMEOUT_MS` | server |
| `DEEPSEEK_API_KEY` / `DEEPSEEK_MODEL` / `DEEPSEEK_BASE_URL` / `DEEPSEEK_MAX_TOKENS` / `DEEPSEEK_TIMEOUT_MS` | server |
| `GEMINI_API_KEY` / `GEMINI_TIMEOUT_MS` | server |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI` | server |
| `TOKEN_ENCRYPTION_KEY` | server |
| `BLOB_READ_WRITE_TOKEN` **or** `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` | server |
| `ZIPPP_DATA_DIR` | server (local only) |

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
