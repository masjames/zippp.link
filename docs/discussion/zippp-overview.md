# zippp: full context for external review

This document is a self-contained brief. It assumes you know nothing about the
project. Read it top to bottom and you should be able to reason about the
architecture, the product, the constraints, and the open questions without
seeing the repository.

Repo: `github.com/masjames/zippp.link` (public). Deployed on Vercel.
Live site: `www.zippp.link` (English, USD) and `www.zippp.link/id` (Indonesian,
IDR).

---

## 1. What zippp is

A restaurant, warung, cafe, or small shop buys supplies every day. Every purchase
comes with a paper nota (receipt or invoice). Today, a staff member types each
nota into a Google Sheet by hand.

zippp replaces the typing. Staff photograph the nota, the app reads it, the user
checks what was read, and the line items are appended to the operator's own
Google Sheet. The sheet stays the system of record. zippp is the intake mill, not
a second ledger.

One sentence: photograph a receipt, get clean line-item rows in your Google
Sheet, without retyping.

### Why Google Sheets and not its own database

The operator already runs their business on a sheet. zippp writes into that
sheet, in their columns. It does not try to become a general ledger, an inventory
system, or an accounting product.

### Who is it for

- The staff member who buys the supplies and photographs the nota. They do not
  own the sheet.
- The operator (name: Charlie in early docs) who owns the Google Sheet, reviews
  the rows, and set up the column mapping once.

Billing is prepaid credits. One credit equals one receipt sent to the sheet.
Credits are spent on Send, never on a read. A failed read costs nothing.

---

## 2. The core rule: never silently wrong

This is the design center of the whole project. The product touches financial
records. A wrong value that nobody notices is worse than a missing value that is
flagged.

The rule:

> Every extracted value is either verified against the OCR text or flagged for
> the human to check.

Everything in the extraction and review design follows from this. The verifier
section below is the concrete implementation.

---

## 3. Constraints

- **Hosting**: Vercel. The account is on a free or hobby plan. That means
  short-lived serverless functions, no always-on process, cold starts, and no
  long-running workers.
- **Framework**: Next.js App Router, TypeScript, Tailwind.
- **Secrets**: never committed, only in Vercel environment variables.
- **Sensitive areas**: billing, auth, ledger, top-up, and admin. Changes here are
  kept isolated and reviewed.
- **User-visible copy**: every string lives in `spec/wording.md`, in English and
  Indonesian. Code reads it at runtime.
- **Model spend**: paid calls are deliberate. The operator decides when to run
  comparisons.

---

## 4. Architecture at a glance

```
Phone browser (Next.js app)
  camera capture and batch review
        |
        |  POST /api/extract  (image)
        v
  Extraction pipeline (serverless function)
    1. PaddleOCR (PP-OCRv6 on Baidu AI Studio)  -> OCR rows
    2. DeepSeek Flash structures the rows       -> receipt JSON
    3. Deterministic verifier grounds every value in the OCR text
    4. Fallbacks: DeepSeek vision, then Gemini
        |
        v
  Review card (client): flagged fields in amber, tap to confirm
        |
        |  POST /api/sheets/append  (accepted, edited receipt)
        v
  Google Sheets append (one row per line item)

Admin console (same app, admin emails only)
  /admin/eval       compare four methods on real receipts
  /admin/lessons    review corrections as lessons
  /admin/releases   release log, open change requests, manual deploy
```

Storage:

- Session tokens and workspace config: private Vercel Blob, else Upstash Redis
  REST, else the local filesystem (`.data`).
- Credits and orders: Upstash Redis REST, atomic spend via Lua.
- Admin eval data (feedback, lessons, releases): same backend choice as the
  session store.

Region and language: `/` is English (USD), `/id` is Indonesian (IDR). Region is
set by middleware on first entry. There is no language toggle.

---

## 5. The capture path

The client camera is the weak point that started this whole reliability effort.

Current behavior:

- The preview keeps the camera's native aspect and uses `object-contain`, with a
  static 9:16 portrait guide. The old client-side bright-box overlay was removed
  because it was misaligned and useless.
- Camera constraints ask for a high ideal resolution. Where the browser supports
  `ImageCapture.takePhoto()`, a full-resolution still is used; otherwise the
  video frame is drawn to a canvas.
- Photos are downscaled to a pixel budget of about 4 megapixels at JPEG quality
  0.85, so a tall receipt keeps enough width to read. Earlier it was long-edge
  1600px at 0.7, which squeezed tall receipts.
- On-device detection (`useReceiptDetector`) computes sharpness (variance of
  Laplacian), steadiness (frame to frame luma diff), and brightness (for the
  torch). It no longer tries to find a bright rectangle.
- Auto-snap fires when the frame is steady and sharp, adds the card immediately
  as `reading`, and lets the server decide. If the extraction refuses with
  `not_a_receipt`, the card is removed silently and auto-capture pauses for 2.5
  seconds.
- Blur is a hard block: a blurry frame cannot be captured, including from the
  manual shutter.
- Up to three extractions run concurrently. The Send queue is sequential.

---

## 6. The extraction path (production)

Entry: `POST /api/extract`, which calls `runExtraction(image, options)` in
`src/lib/extract-pipeline.ts`.

Attempt order by default: `paddle`, then `deepseek-vision`, then `gemini`.

1. **PaddleOCR** (`src/lib/paddleocr.ts`). Submit a job to Baidu AI Studio, poll,
   fetch the JSONL result. PP-OCRv6 returns `rec_texts`, `rec_boxes`, and
   `rec_scores`. Tokens are grouped into visual rows by y-centre and joined with
   ` | `. Per-token recognition scores are carried through.
2. **Compactor** (`src/lib/ocr-compact.ts`). Strips HTML tables and whitespace.
   Rows are prefixed with their zero-based index, so the model can report which
   row each field came from.
3. **DeepSeek Flash** (`src/lib/deepseek.ts`). Text-only structuring with
   `response_format=json_object` and thinking disabled. Each field carries a
   `*_source` row index.
4. **Verifier** (`src/lib/verify-receipt.ts`). See section 7.
5. **Essentials gate**. A non-refusal result without an item and a price is
   treated as incomplete and falls through to the next attempt. A missing date is
   not fatal; the client fills the capture date and flags it as assumed.
6. **Fallbacks**. DeepSeek vision (image to JSON), then Gemini (image to JSON).
   Fallback results are verified too, against any OCR text that was captured, or
   flagged `ungrounded` when there was none.

### Hedged OCR

If PaddleOCR has not answered within `PADDLEOCR_HEDGE_MS` (default 5000), the
vision leg starts in parallel. The first result that passes the verifier is used.
This exists because PaddleOCR cold starts have exceeded the 10 second production
timeout, in which case the pipeline would otherwise silently fall back to vision.

### Method mode

`runExtraction` also accepts a `method` option that runs exactly one method, with
no fallback, no hedge, and no vision retry, and without the essentials gate. This
is used only by the admin eval so a comparison shows the raw read of each method
instead of a substitute. The four methods are defined in
`src/lib/admin/methods.ts`.

---

## 7. The verifier (the anti-hallucination layer)

This is the piece that enforces the core rule. It is deterministic, has no model,
and runs after structuring. `src/lib/verify-receipt.ts`.

What it does:

- **Number normalization.** Indonesian and English formats: `15.000`,
  `15.000,50`, `15,000.00`, `1.234.567`, `Rp 15.000`, and a trailing dash as in
  `15.000,-`.
- **Grounding.** Every amount, quantity, unit price, subtotal, tax, total, the
  date, and the merchant must appear in the OCR tokens. A value that is not
  present is a guess: it becomes `null` and gets a `not_in_ocr` flag.
- **Row check.** The model reports a source row index per field. If that row does
  not contain the value, a `row_mismatch` flag is added, but the value is kept if
  it is grounded elsewhere.
- **Low confidence.** If the matching OCR token has a recognition score below
  0.8, a `low_confidence` flag is added.
- **Merchant.** Fuzzy matched against OCR tokens and rows (substring, edit
  distance, word overlap).
- **Date.** Order-insensitive match over day, month, and year digits, including
  English and Indonesian month names.
- **Arithmetic.** Checks that `qty * unit_price` is about the line amount, and
  that the line sum relates to the subtotal and total, and that `subtotal + tax`
  relates to the total.

Design decisions worth reviewing:

- **Grounding nulls, arithmetic flags.** A value not in the OCR is deleted. An
  arithmetic mismatch keeps the grounded value and adds a flag, because a printed
  total is not a hallucination and a sum mismatch usually means a missing line
  item. The alternative, nulling the total, would erase a real printed number and
  force a retype.
- **Missing is not a flag.** A null merchant, date, or total is not flagged. It is
  empty, not a guess. The client flags an assumed date, and the item plus price
  gate still applies. This was a deliberate change to stop the review card
  demanding taps for fields that were never read.
- **No OCR means ungrounded.** When the image-only fallback runs with no OCR
  text, every value is flagged `ungrounded` and kept, so nothing is silently
  trusted, but the fallback still works.

Flags are returned in the API response (`receipt.flags`), in the debug trace
(`debug.flags`), and in the production log line. In the review card, every flagged
field gets an amber border and a "check this" hint, and Accept is disabled until
each flagged field is tapped.

Unit tests: `src/lib/verify-receipt.test.ts`, covering digit swaps 0/8, 1/7, 5/6,
wrong totals, line arithmetic, missing date, merchant fuzzy matching, row
mismatch, low score, ungrounded, and Indonesian number formats.

---

## 8. The eval harness

Two front doors, one scoring model.

- **CLI**: `scripts/eval.ts`, run with `npm run eval`. Reads `eval/labels.json`,
  runs the pipeline over labeled photos, prints per-field accuracy and the count
  of wrong and unflagged values.
- **Admin UI**: `/admin/eval`. Same idea, in the browser, for phones and quick
  iteration.

### The four methods

1. OCR + DeepSeek Flash
2. DeepSeek Flash vision only
3. OCR + Gemini Flash
4. Gemini Flash vision only

The OCR pass is computed once per (photo, OCR model) and reused by both OCR
methods, and cached in process memory for a short time. The eval gives OCR a 30
second budget, longer than production, so the comparison reflects real OCR rather
than a slow fallback.

The page shows the photo large and tappable to zoom, the four reads side by side
with merchant, date, total, items, and flags, a diff against optional expected
values, a one-tap winner or an all-wrong correction box, and a Test OCR button
that shows the raw PP-OCRv6 result or the exact error.

### The metric that matters

Per-field accuracy is useful for locating a problem. The north-star metric is
**wrong and unflagged**: a value that is wrong and was not flagged. That is the
number that must go to zero, because it is the number that reaches the sheet
silently. A wrong value that was flagged is the system working. A right value
that was flagged is the verifier being too noisy.

### Labels

Accuracy needs a known right answer, which is a label. On a phone, labeling is
painful, so the cheap path is to tap the method that read it best. That pick is
also a label. Expected values are optional and collapsed, and a field left empty
is not scored.

---

## 9. The improvement loop

The harness is only useful if failures turn into permanent improvements. The loop:

1. Run a comparison in `/admin/eval`, pick the best read, or mark all wrong and
   write what zippp got wrong and how it should be.
2. An all-wrong correction becomes a **lesson** on `/admin/lessons`, along with a
   summary of which method won the most.
3. Review the lesson, edit its title and detail, then approve or reject.
4. Approving opens a **change request**: a branch `zippp/lesson/<id>`, a dossier
   at `eval/lessons/<id>.md`, and a pull request. A Telegram message carries the
   PR link, and a **release** record is written on `/admin/releases`.
5. A developer (or the agent) implements the fix on that branch, runs the tests
   and the build, and merges. Merging deploys through the Vercel GitHub
   integration.

A manual **Deploy now** button on `/admin/releases` uses `VERCEL_DEPLOY_HOOK_URL`
if it is set.

The honest limitation: approving does not write code. It records the lesson and
opens the work item. The fix is a code change, and the deploy ships it. A button
that generated code and pushed it to production unverified would be a security
and correctness hazard.

---

## 10. The dataset and the flywheel

The dataset is the collection of every labeled receipt: the photo, the correct
answer, and what each method read. Today that data is scattered across the
browser store, the feedback records, the lessons, and the releases. A dataset
page would put it in one place with a per-method accuracy summary and a trend.

Why it matters:

- **Scoreboard.** It measures the whole pile, not one photo, so "method A is 94
  percent on totals" has evidence.
- **Regression net.** Every change is re-run against the whole pile, so a fix
  that breaks an earlier receipt is caught before shipping.
- **Evidence for tuning.** Thresholds, prompts, and default method choices stop
  being guesses.

The dataset does not run during a scan and does not make the model learn. It is a
test suite and a scoreboard. It improves the app by improving the decisions a
person or agent makes, which then become code. It could also supply few-shot
examples or a routing table at runtime, but that is a separate, deliberate step.

---

## 11. Storage, auth, billing (brief)

- **Auth**: Google OAuth only, scopes `spreadsheets` and `drive.file`. A
  per-browser session cookie holds an encrypted Google user id. Admin routes
  check the email server-side and return 404 otherwise.
- **Ledger**: credits as lots with a 30-day expiry, idempotent grants, atomic
  earliest-expiry spend via a Lua script. One credit per successful append,
  refunded on failure.
- **Top-up**: manual GoPay orders (unique code, 60 minute TTL) for Indonesia, and
  a Paddle sandbox pack for international. Telegram alerts.
- **Sheets**: append one row per line item using the saved column map. Header
  facts and staff and outlet repeat on each line.

---

## 12. Costs

Model cost is small. PP-OCRv6 is free inside a daily quota (20,000 pages per day
per model). DeepSeek Flash structuring is fractions of a cent per receipt. Gemini
is a rarely used fallback. The real cost is human QA time and wrong rows, which is
exactly what the verifier and the review step are meant to reduce.

---

## 13. What is built and what is not

Built and deployed:

- Capture reliability (Phase 1).
- Deterministic verifier and flagged review (Phase 2).
- Eval harness, CLI and admin UI, four methods, OCR diagnostics (Phase 3 and the
  redesign).
- Hedged OCR and per-stage timings (Phase 4).
- Improvement loop: feedback, lessons, releases, GitHub change request, Telegram.
- Admin console with Eval, Lessons, Releases pages.

Not built:

- The dataset page (the flywheel memory described in section 10).
- Real labeled photos in the golden set. The harness works but the set is
  synthetic placeholders only.
- A paid model comparison run. The tooling exists; the run has not been done.
- Threshold tuning based on real data.
- Automated code generation from lessons. Approving opens a change request, not a
  patch.
- Axiom log drain (planned).

---

## 14. Open questions

1. Which method should be the production default, and should it vary by region or
   receipt type? The dataset should answer this.
2. Should the verifier null an arithmetic-failing total, or flag and keep it? The
   current choice is flag and keep.
3. How noisy is the flag set on real receipts? If most cards require taps, users
   will stop trusting it.
4. Should the eval set be one shared golden set, or per-customer sets?
5. How do we keep the OCR timeout from silently degrading production to vision on
   cold starts? The hedge covers latency, but the OCR result may be discarded.

---

## 15. Framework discussion: ADK, LangChain, LangGraph, graph workflows

The question: should we use an agent or workflow framework (Google ADK,
LangChain, LangGraph) instead of the hand-written pipeline?

What each provides:

- **LangChain**: glue for model calls, tools, chains, memory, retrievers.
- **LangGraph**: graph workflows with nodes, edges, shared state, conditional
  routing, human-in-the-loop pauses, durable checkpoints.
- **Google ADK**: an agent toolkit with tools, sessions, memory, deployment,
  pointed mostly at Google models.

What we already have: small provider modules that make one HTTP call each, a
linear pipeline with fallbacks, and a deterministic verifier.

Arguments against adding a framework now:

1. **The hot path is deterministic and we want it that way.** The rule is never
   silently wrong, which is served by deterministic checks. An agent on the hot
   path would still have to pass the same verifier, so it would add cost and
   nondeterminism and change nothing about correctness.
2. **Serverless is stateless and short lived.** Agent frameworks assume state you
   can hold: a session, a scratchpad, a long loop. Vercel functions are request
   in, response out.
3. **Cold starts and bundle size.** Heavy orchestration libraries slow every
   deployment and every cold start, exactly where a phone user is waiting.
4. **The eval and lessons need none of it.** A dataset page is storage and
   arithmetic.
5. **Free Vercel limits**: function duration caps, no always-on worker, cold
   starts, bundle limits. The serverless-native answer to durable workflows is an
   HTTP queue such as Upstash QStash or Upstash Workflow, not an in-process
   graph.

When a graph or agent would earn its place:

- **Routing**: if the dataset shows a condition where another method wins, and
  the app should choose per receipt.
- **Multi-tool agents**: if the pipeline needed many tools and decisions, such as
  supplier lookup, tax tables, currency services.
- **Long batch jobs**: a queue with durable checkpoints helps; QStash plus a small
  state record gets most of it.
- **Human-in-the-loop**: already handled by the approve-and-PR flow.

Recommendation: keep the small modules and the deterministic verifier. If
experimentation is wanted, do it off the hot path, for example using a framework
to analyze eval results or draft a lesson change, where latency does not matter
and a human reviews the output. Any agentic step must still pass the verifier and
the human check before reaching a sheet.

If a graph is ever genuinely needed, model it as a small state machine in plain
TypeScript first, and only reach for LangGraph or ADK when the routing becomes a
real graph with many branches and shared state.

---

## 16. Glossary

- **Nota**: Indonesian word for a shop receipt.
- **OCR**: optical character recognition, the part that turns the image into text
  tokens and rows.
- **Structuring**: the model step that turns OCR rows into receipt JSON.
- **Grounding**: checking a value against the OCR text.
- **Flag**: a recorded reason a field needs human attention.
- **Wrong and unflagged**: the count of wrong values that were not flagged. The
  metric to drive to zero.
- **Method**: one extraction strategy, for example OCR plus DeepSeek, or Gemini
  vision only.
- **Hedge**: starting the vision leg in parallel when OCR is slow.
- **Golden set**: the labeled receipts used to measure accuracy.
- **Change request**: the branch and pull request opened from an approved lesson.
