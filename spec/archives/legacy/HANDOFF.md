> Archived 2026-10-13. Superseded by active specs + `AUDIT-2026-10.md`. Do not treat as source of truth.

# zippp — handoff, current state, and refinement plan

Updated: 2026-10-06. Written because the working session is out of context.
**Read this first, then the individual specs.** Purpose: hand a fresh agent
everything needed to iterate on capture detection and vision accuracy.

Repo: `github.com/masjames/zippp.link` (public). Deployed on Vercel.
`origin/main = ec58d29`. Site: `www.zippp.link` (apex 308 → www). `/id` = Indonesian.

---

## 1. What zippp is

Photograph a receipt/invoice → OCR + a model extract merchant, date, currency,
line items, subtotal, tax, total → the user reviews and edits → the rows are
appended to the user's own Google Sheet. Prepaid credits (1 credit = 1 scan,
spent on Send). Bilingual (EN `/`, ID `/id`). Admin panel for manual GoPay
orders.

Read: `SPEC.md`, `USER-FLOW.md`, `ARCHITECTURE.md`, `REVISION-1.md`, `PRICING.md`,
`wording.md`. Inactive material is in `archived/`.

---

## 2. Stack and layout

- Next.js (App Router) + TypeScript + Tailwind, deployed on Vercel.
- Session/token store: private Vercel Blob → Upstash Redis → filesystem.
- Credits/orders: Upstash Redis REST (Lua for atomic spend).
- Payments: Paddle (sandbox) for intl; manual GoPay + Telegram for Indonesia.
- OCR/vision: PP-OCRv6 via Baidu AI Studio; structuring via DeepSeek Flash.

```
src/app/                 routes (/, /id, /app/**, /admin, /api/**)
src/components/landing/  Landing.tsx
src/components/app/      AppProvider, AppShell, screens/, useReceiptDetector
src/lib/                 extract-pipeline, paddleocr, deepseek, gemini, schema,
                         ocr-compact, verify-receipt, image, batch-db, eval-score,
                         t, content, region, server-locale, auth, billing/*,
                         google/*, admin/* (methods, eval-store, github)
src/app/admin/           AdminClient + eval/, lessons/, releases/
src/middleware.ts        region + one-time /id redirect + ?ref capture
scripts/                 eval.ts, ts-loader.mjs (dev harness)
eval/                    labels.json + images/ (gitignored) for the CLI harness
spec/discussions/        external-review brief (zippp-overview.md)
spec/                    all specs (this file is the index of record)
```

### Routes
`/` EN landing · `/id` ID landing · `/app` guard · `/app/start` · `/app/snap`
(single capture + batch review) · `/app/topup` (+ `/app/topup/order/[id]`) ·
`/app/settings` (+ `/app/settings/sheet`) · `/admin`.
`/app/check/[id]` and `/app/sent` were **removed** in Revision 1.

### Key API routes
`/api/extract`, `/api/sheets/{append,connect,workspace,map}`, `/api/auth/*`,
`/api/billing/balance`, `/api/topup/orders*`, `/api/admin/{orders,grant}`,
`/api/admin/{eval,feedback,lessons,releases,corrections,contributions}`,
`/api/corrections` (accepted-card telemetry), `/api/contribute` (opt-in
unreadable-photo donation), `/api/paddle/webhook`.
`/api/detect` and `src/lib/receipt-detect.ts` were removed in Phase 1.

---

## 3. Env (all set on Vercel production/preview/development)

`EXTRACT_PROVIDER`, `PADDLEOCR_AISTUDIO_TOKEN`, `PADDLEOCR_MODEL=PP-OCRv6`,
`PADDLEOCR_BASE_URL`, `PADDLEOCR_TIMEOUT_MS`, `PADDLEOCR_HEDGE_MS`,
`VISION_RETRY_HARD_MIN`, `DEEPSEEK_API_KEY`,
`DEEPSEEK_MODEL=deepseek-flash`, `DEEPSEEK_BASE_URL`, `DEEPSEEK_MAX_TOKENS`,
`GEMINI_API_KEY`, `GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI`, `TOKEN_ENCRYPTION_KEY`,
`BLOB_READ_WRITE_TOKEN`, `UPSTASH_REDIS_REST_URL/TOKEN`, `ADMIN_EMAILS`,
`GOPAY_NUMBER`, `GOPAY_NAME`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`,
`PADDLE_ENV=sandbox`, `PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET`,
`PADDLE_PACK_PRICE_ID`, `PADDLE_CLIENT_TOKEN`.

Optional: `GITHUB_TOKEN` (Contents and Pull requests write) plus `GITHUB_REPO`
let an approved lesson on `/admin/lessons` open a branch and a pull request;
`VERCEL_DEPLOY_HOOK_URL` powers the manual deploy button on `/admin/releases`.

Never commit secrets. `.env.example` holds names only. `npm run grant -- <email> <credits>`
(uses `.env.local`). `npm run logs` streams structured production logs.

---

## 4. Extraction pipeline (as-is)

`src/lib/extract-pipeline.ts` — attempt order: `paddle → deepseek-vision → gemini`.
Each attempt is bounded; the debug trace is returned in every `/api/extract`
response and shown in the app's Debug panel.

1. **PaddleOCR** (`src/lib/paddleocr.ts`): submit → poll → result. PP-OCRv6
   returns JSONL `ocrResults` with `rec_texts`/`rec_boxes`/`rec_scores`; tokens
   are grouped into rows by y-centre (`|` joined). `PADDLEOCR_TIMEOUT_MS=10000`.
   If it has not answered within `PADDLEOCR_HEDGE_MS` (default 5000), the vision
   leg starts in parallel; the first result that passes the verifier is used.
2. **Compactor** (`src/lib/ocr-compact.ts`): the row text is the payload to
   DeepSeek (HTML tables → compact text). Rows are prefixed with their zero-based
   index so the model can report where each field came from.
3. **DeepSeek Flash** (`src/lib/deepseek.ts`): text-only structuring,
   `response_format=json_object`, `thinking: disabled`, with `*_source` row
   indices on every field.
4. **Verifier** (`src/lib/verify-receipt.ts`, deterministic): grounds every
   amount, qty, total, date and the merchant in the OCR tokens. An ungrounded
   value becomes `null` and gets a flag; row mismatches, low OCR scores and
   arithmetic mismatches get flags. When the result fails badly, or carries
   `VISION_RETRY_HARD_MIN` (default 3) hard flags, one vision re-read with the
   OCR text is taken and the cleaner result wins. Both reads are grounded
   against the OCR text, so this compares two grounded reads.
5. **Essentials gate** (`hasEssentials` in the pipeline): a non-refusal result
   without **an item and a price** throws → falls through to DeepSeek vision.
   A missing date is not fatal: the capture date is filled in and marked assumed.
6. **Fallbacks**: DeepSeek vision (image → JSON), then Gemini. Fallback results
   are verified too (against any OCR text, else flagged `ungrounded`).
7. **Method mode** (eval only): `runExtraction(image, { method })` runs exactly
   one method with no fallback, hedge, or retry, and without the essentials gate,
   so the admin comparison shows the raw read of each method. Defined in
   `src/lib/admin/methods.ts`: OCR + DeepSeek, DeepSeek vision, OCR + Gemini,
   Gemini vision.

Observability: `console.log(JSON.stringify({event:"extract.run", ...}))` → Vercel
runtime logs. Flags are in the `extract.run` line, the `/api/extract` response and
the Debug panel.

---

## 5. Capture / camera (reliability pass, Phase 1)

`src/components/app/screens/SnapScreen.tsx` + `useReceiptDetector.ts`.

- Viewfinder: the preview keeps the camera's native aspect with
  `object-contain`; a static 9:16 portrait guide frames the receipt. The old
  bright-rectangle overlay (and its misaligned percentage math) is gone.
- Detector (`useReceiptDetector`): 160px grayscale; **variance of Laplacian** for
  `sharp`; **frame-to-frame luma diff** for `steady` (`MOTION_MAX=8`,
  `STEADY_FRAMES=6`); mean luma for `brightness`.
- Shutter: the viewfinder itself (tap the preview; no separate button). A
  capture is drawn from the preview into a ~3 MP canvas (JPEG 0.72); the thumb
  comes from the same canvas, so there is no second decode. The viewfinder is a
  small box until the camera is live. The camera opens with soft constraints
  (1920 ideal) so older phones start fast.
- Auto-capture: `autoSnap && steady && sharp` captures at once, adds the card as
  `reading`, and **`/api/extract`** decides. A `not_a_receipt` refusal drops the
  card silently and pauses auto-capture for 2.5s. Re-arms when the scene moves.
  A tap is always available, but a blurry frame is a hard block.
- Extractions run 2-3 at a time; the Send queue stays sequential.
- A missing date is filled from the capture time and marked assumed in the
  review card.
- `/api/detect` and its helpers were removed; `receipt-detect.ts` is gone.
- Torch: `MediaStreamTrack` capability; auto-on when luma < 55, off > 95; manual
  toggle. Not available on iOS Safari or desktop webcams.
- Batch: `src/lib/batch-db.ts` (IndexedDB) persists image Blob, thumb, status,
  receipt, draft, debug, error and `openId`; survives refresh. Review is an
  accordion in `SnapScreen` (one card open, accepted hidden, Accept/Edit, Delete;
  Send all accepted sequentially; 1 credit per successful append in
  `/api/sheets/append`, idempotent on the scan id, refunded on failure).

### Known problems (user feedback)
- **Auto-capture is still the weak part**, especially low light, a hand in frame,
  or a torn edge. Steady + sharp can fire on a non-receipt, which the server then
  drops and cools down. There is no on-device document detector yet.
- **The vision model still hallucinates** when it is used (see §6). The verifier
  now catches ungrounded values, but a plausible number that happens to appear
  somewhere in the OCR can survive grounding.

---

## 6. Vision quality and hallucination — analysis

Hallucination sources:
1. **DeepSeek structuring invents fields** when the OCR text is incomplete or
   ambiguous. The prompt says "never invent", but a small model still does
   (e.g., a plausible total or a merchant name).
2. **DeepSeek vision fallback** reads the image and can invent totals/items when
   the image is poor.
3. **OCR digit errors** (0/8, 1/7, 5/6) can be silently "corrected" by the model
   to plausible numbers. The verifier now catches these: a swapped digit no
   longer matches an OCR token, so the field becomes `null` and is flagged.

Guardrails (Phase 2): the deterministic verifier (`verify-receipt.ts`) grounds
amounts, qty, totals, dates and the merchant in the OCR tokens (ungrounded values
become `null`), fuzzy-matches the merchant, checks qty x unit price and the
totals, checks the reported row indices, flags low OCR scores, and retries once
through the vision path. Every flag must be tapped in the review card before
Accept. A missing field is not flagged: it is empty, not a guess. The client
flags an assumed date, and the essentials gate (item + price) still applies.
The admin comparison tool lives at `/admin/eval` (see `eval/README.md`).

Still open: A/B the vision model (PP-OCRv6 vs PaddleOCR-VL-1.6; DeepSeek Flash vs
Pro vs Gemini) on real notas (Phase 3), and per-field confidence beyond the OCR
score.

---

## 7. Other subsystems (working, verified)

- **Auth/sessions**: per-browser session, `zippp_sid` (AES-256-GCM encrypted
  Google user id); token/workspace stores keyed by user id. `/admin` is private
  (404 unauthenticated). An earlier leak of the Upstash token was rotated and
  purged from history — the current token is new.
- **Ledger** (`src/lib/billing/ledger.ts`): lots with 30-day expiry, idempotent
  grants, atomic earliest-expiry spend (Lua) — verified against Redis (including
  a concurrent double-spend: exactly one winner).
- **Top-up**: GoPay manual orders (unique code 1-999, base+code, 60-min TTL,
  1 open order, 5/hour) + Telegram alerts + `/admin` approve/reject/grant;
  Paddle sandbox pack (100 credits / $9) with signature-verified webhook
  (idempotent). All verified except the browser checkout click.
- **Referral**: 20% to referrer, 20-credit first-top-up bonus (referred only).
- **Region**: middleware sets region at entry; one-time `/` → `/id` for ID IPs.

---

## 8. Reliability work: done and remaining

### Done
- **Capture (Phase 1)**: native-aspect preview, static 9:16 guide,
  viewfinder-tap shutter, preview grabs at a ~3 MP budget, `/api/detect`
  removed, capture into a reading card, 2.5s refusal cooldown, blur hard block,
  3 concurrent reads.
- **Verifier (Phase 2)**: deterministic grounding, flags, row indices, OCR
  scores and one OCR-aware vision retry. Flags are server-side telemetry only;
  the review card no longer blocks on them.
- **Eval (Phase 3 and the redesign)**: CLI harness and `/admin/eval` with four
  fixed methods, big zoomable photo, OCR text, Test OCR, one-tap winner, optional
  expected values, Advanced drawer. Runs are stored server-side and the page
  shows a per-method set summary, so the whole loop works from the page alone.
- **Speed (Phase 4)**: hedged OCR (`PADDLEOCR_HEDGE_MS`), per-stage timings.
- **Improvement loop**: `/admin/eval` feedback, `/admin/lessons`,
  `/admin/releases`, GitHub change request, Telegram, optional deploy hook.
- **Production signal**: field-level correction telemetry at Accept, sent to
  `/api/corrections` and summarized on `/admin/insights`. No images, no values.
- **Flag tiering**: soft flags (`low_confidence`, `row_mismatch`) are shown but do
  not block Accept; hard flags (`not_in_ocr`, arithmetic, `ungrounded`, assumed
  date) do.
- **Hedge instrumentation**: `extract.run` records `hedge_fired`,
  `hedge_winner`, and `ocr_ms`.
- **Privacy**: the Baidu and DeepSeek disclosure is in the landing FAQ and the
  sign-in copy (`wording.md`).
- **Opt-in donations**: a card that could not be read offers to save the photo
  (the image and the failure reason only, no account or sheet data) via
  `/api/contribute`. Admins review and delete them at `/admin/contributions`.
- **Docs**: `spec/discussions/zippp-overview.md` is the external-review brief.

### Remaining
- **Dataset page** (flywheel memory): every labeled receipt, per-method accuracy
  and trend, export and import. The next build.
- **Real golden set**: 10 to 20 real photos across conditions (low light, hand,
  torn, handwritten, Indonesian formats). The harness is ready; the data is not.
- **Paid comparison run**: the tooling exists, the run has not happened.
- **Threshold tuning**: OCR score 0.8, merchant fuzzy 0.6, hedge 5s, all based on
  real results once they exist.
- **OCR cold start**: production can fall back to vision when PP-OCRv6 exceeds
  10s. The hedge covers latency; consider raising `PADDLEOCR_TIMEOUT_MS`.
- **Product polish**: end-to-end GoPay and Paddle browser tests still pending.

---

## 9. Open questions for the next discussion
1. Which method should be the production default, and should it vary by region
   or receipt type? The dataset should answer this.
2. Arithmetic mismatch: keep the grounded value and flag it (current), or null
   it? The current choice favors not erasing a printed total.
3. Flag noise on real receipts: is the amber set too large for users to trust?
4. One shared golden set, or per-customer sets?
5. Should a routing rule be derived from the dataset, and if so, in plain code or
   a graph?
6. Framework stance: keep the hand-written pipeline (current recommendation), or
   pilot LangGraph or ADK off the hot path? See
   `spec/discussions/zippp-overview.md` section 15.

---

## 10. Commands
- `npm run dev` · `npm run build` · `npx tsc --noEmit`
- `npm test` (unit tests) · `npm run eval` (accuracy harness, see `eval/README.md`)
- Admin: `/admin/eval` (four methods, OCR test), `/admin/lessons`,
  `/admin/releases`, `/admin/insights`, `/admin/contributions`
- External brief: `spec/discussions/zippp-overview.md`
- `npm run logs` (stream `extract.run`/`detect.run` from production)
- `npm run grant -- <email> <credits>`
- Deploy: push to `main` (Vercel builds automatically). Verify with `curl -I`.
