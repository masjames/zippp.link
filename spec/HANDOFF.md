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
                         ocr-compact, receipt-detect, image, batch-db, t, content,
                         region, server-locale, auth, billing/*, google/*
src/middleware.ts        region + one-time /id redirect + ?ref capture
spec/                    all specs (this file is the index of record)
```

### Routes
`/` EN landing · `/id` ID landing · `/app` guard · `/app/start` · `/app/snap`
(single capture + batch review) · `/app/topup` (+ `/app/topup/order/[id]`) ·
`/app/settings` (+ `/app/settings/sheet`) · `/admin`.
`/app/check/[id]` and `/app/sent` were **removed** in Revision 1.

### Key API routes
`/api/extract`, `/api/detect`, `/api/sheets/{append,connect,workspace,map}`,
`/api/auth/*`, `/api/billing/balance`, `/api/topup/orders*`,
`/api/admin/{orders,grant}`, `/api/paddle/webhook`.

---

## 3. Env (all set on Vercel production/preview/development)

`EXTRACT_PROVIDER`, `PADDLEOCR_AISTUDIO_TOKEN`, `PADDLEOCR_MODEL=PP-OCRv6`,
`PADDLEOCR_BASE_URL`, `PADDLEOCR_TIMEOUT_MS`, `DEEPSEEK_API_KEY`,
`DEEPSEEK_MODEL=deepseek-flash`, `DEEPSEEK_BASE_URL`, `DEEPSEEK_MAX_TOKENS`,
`GEMINI_API_KEY`, `GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI`, `TOKEN_ENCRYPTION_KEY`,
`BLOB_READ_WRITE_TOKEN`, `UPSTASH_REDIS_REST_URL/TOKEN`, `ADMIN_EMAILS`,
`GOPAY_NUMBER`, `GOPAY_NAME`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`,
`PADDLE_ENV=sandbox`, `PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET`,
`PADDLE_PACK_PRICE_ID`, `PADDLE_CLIENT_TOKEN`.

Never commit secrets. `.env.example` holds names only. `npm run grant -- <email> <credits>`
(uses `.env.local`). `npm run logs` streams structured production logs.

---

## 4. Extraction pipeline (as-is)

`src/lib/extract-pipeline.ts` — attempt order: `paddle → deepseek-vision → gemini`.
Each attempt is bounded; the debug trace is returned in every `/api/extract`
response and shown in the app's Debug panel.

1. **PaddleOCR** (`src/lib/paddleocr.ts`): submit → poll → result. PP-OCRv6
   returns JSONL `ocrResults` with `rec_texts`/`rec_boxes`; tokens are grouped
   into rows by y-centre (`|` joined). `PADDLEOCR_TIMEOUT_MS=10000`.
2. **Compactor** (`src/lib/ocr-compact.ts`): the row text is the payload to
   DeepSeek (HTML tables → compact text).
3. **DeepSeek Flash** (`src/lib/deepseek.ts`): text-only structuring,
   `response_format=json_object`, `thinking: disabled`.
4. **Essentials gate** (`hasEssentials` in the pipeline): a non-refusal result
   without **an item and a price** throws → falls through to DeepSeek vision.
   A missing date is not fatal: the capture date is filled in and marked assumed.
5. **Fallbacks**: DeepSeek vision (image → JSON), then Gemini.

Observability: `console.log(JSON.stringify({event:"extract.run", ...}))` → Vercel
runtime logs. `/api/detect` logs `detect.run`.

---

## 5. Capture / camera (reliability pass, Phase 1)

`src/components/app/screens/SnapScreen.tsx` + `useReceiptDetector.ts`.

- Viewfinder: the preview keeps the camera's native aspect with
  `object-contain`; a static 9:16 portrait guide frames the receipt. The old
  bright-rectangle overlay (and its misaligned percentage math) is gone.
- Detector (`useReceiptDetector`): 160px grayscale; **variance of Laplacian** for
  `sharp`; **frame-to-frame luma diff** for `steady` (`MOTION_MAX=8`,
  `STEADY_FRAMES=6`); mean luma for `brightness`.
- Still: `ImageCapture.takePhoto()` gives a full-resolution still where the
  browser supports it, else the video frame. A high `ideal` camera resolution is
  requested, and photos are stored at a ~4 MP pixel budget (JPEG 0.85) so tall
  receipts keep enough width.
- Auto-capture: `autoSnap && steady && sharp` captures at once, adds the card as
  `reading`, and **`/api/extract`** decides. A `not_a_receipt` refusal drops the
  card silently and pauses auto-capture for 2.5s. Re-arms when the scene moves.
  Manual shutter is always available, but a blurry frame is a hard block.
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
- **Viewfinder looks ~16:9 while receipts are tall.** The overlay box coordinates
  are percentages of the container, but the video is `object-cover` (cropped), so
  the box is **misaligned** and the framing guide is wrong for portrait receipts.
- **Auto-capture detection is still bad**, especially low light / hand in frame /
  torn edge. The client box was made non-required, but the practical gate is now
  the server `detect`, which is only as good as the vision model.
- **The vision model is bad** and **hallucinates** (see §6).

---

## 6. Vision quality and hallucination — analysis

Hallucination sources:
1. **DeepSeek structuring invents fields** when the OCR text is incomplete or
   ambiguous. The prompt says "never invent", but a small model still does
   (e.g., a plausible total or a merchant name).
2. **DeepSeek vision fallback** reads the image and can invent totals/items when
   the image is poor.
3. **OCR digit errors** (0/8, 1/7, 5/6) are silently "corrected" by the model to
   plausible numbers instead of being left null.

Current guardrails: `null` when absent (prompt), the essentials gate (date/item/
price), and user review before Send. Missing: grounding to the OCR text,
arithmetic cross-checks, digit verification against OCR tokens, confidence.

Candidate fixes (to discuss): ground every field in a source span from the OCR
text; arithmetic validation (sum of line amounts ≈ subtotal ≈ total); reject
values not found in the OCR tokens (fuzzy match); return per-field confidence;
prefer a stronger structuring model; A/B the vision model (PP-OCRv6 vs
PaddleOCR-VL-1.6; DeepSeek Flash vs Pro vs Gemini).

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

## 8. Refinement + action plan (proposed, for discussion)

### A. Capture reliability (highest priority — the user's complaint)
1. **Fix the viewfinder geometry.** Either (a) make the preview match the
   camera's native aspect and map the overlay with `object-cover` crop math, or
   (b) use `object-contain` with letterbox and correct mapping. Add a **portrait
   receipt guide** (e.g. a 3:4 or 9:16 inner frame) instead of relying on the
   whole 16:9 area.
2. **Rethink detection.** Brightness+projection is weak. Options: gradient/edge
   document detection; a small on-device document detector (OpenCV.js / ONNX /
   TF.js); or drop the client box entirely and gate purely on steady + the server
   `detect`. Fix the overlay math regardless.
3. **Auto-capture UX.** Consider capture-then-verify (add instantly, drop if not a
   receipt) to remove the 3–8s wait; keep manual always available; expose the
   toggle prominently; tune `MOTION_MAX`/`STEADY_FRAMES`/light thresholds.

### B. Vision accuracy + hallucination (highest priority — the user's complaint)
1. **Ground the structuring**: require each field to be quoted from the OCR text;
   add arithmetic validation; reject/flag values not present in OCR tokens.
2. **A/B the models** on a set of real notas (low light, hand, torn): PP-OCRv6 vs
   **PaddleOCR-VL-1.6**; **DeepSeek Flash vs Pro vs Gemini** for structuring.
   Pick on field accuracy, not vibes.
3. **Field confidence + review affordance**: mark low-confidence fields in the
   review card so the human fixes them (fits the existing Accept/Edit UI).
4. **Real test set**: collect 10–20 real photos (the current tests use synthetic
   images) and a small harness that scores merchant/date/total/items.

### C. Product polish
- Credits are live; end-to-end GoPay and Paddle browser tests still pending.
- Later (see `LATER.md`): templates picker, Drive photo, batch review extras,
  team members, per-minute guard, bigger Paddle packs, QRIS, Axiom logs.

---

## 9. Open questions for the next discussion
1. Vision model: keep deepseek-flash, or move to `deepseek-v4-pro` / Gemini for
   structuring? Use PaddleOCR-VL-1.6 instead of PP-OCRv6?
2. Detection: heuristic vs an on-device document-detection model? Is the server
   `detect` round-trip acceptable, or must detection be instant/offline?
3. Grounding strategy: source-span prompt vs a deterministic verifier vs both?
4. Is hallucination acceptable if every field is confidence-marked and editable?
5. Real receipts: can we get a labeled set (date/item/price ground truth) to
   measure against?

---

## 10. Commands
- `npm run dev` · `npm run build` · `npx tsc --noEmit`
- `npm run logs` (stream `extract.run`/`detect.run` from production)
- `npm run grant -- <email> <credits>`
- Deploy: push to `main` (Vercel builds automatically). Verify with `curl -I`.
