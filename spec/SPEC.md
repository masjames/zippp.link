# zippp spec

Status: **ACTIVE** — Phase 1 (Sheets intake) plus the shipped v2 UI.
Depends on: `USER-FLOW.md`, `ARCHITECTURE.md`, `TEMPLATES.md`, `PRICING.md`, `wording.md`

Domain: zippp.link

---

## One sentence

Staff photograph a nota (or invoice); zippp reads it, the user checks it, and
zippp appends clean line-item rows into the Google Sheet the operator already
uses.

---

## Who it is for

1. **Primary:** operators who already run a sheet and whose team produces paper
   notas (restaurants, warung, cafes, shops). Their time is spent typing.
2. **Secondary (spec-only):** one person using the `personal-expense` template.
3. **Not:** replacing Accurate/Jurnal/Xero, and not a hobby ledger with 40 reports.

> **Implemented today:** only the `resto-inventory` template. `personal-expense`
> and `custom` are specified but not built (see `LATER.md`, `TEMPLATES.md`).

---

## Why Sheets, not zippp-as-DB

The operator already has the sheet. Land in **their** columns; do not make them
learn ours. The job is append + one map, not a second general ledger.

---

## Phase 1 requirements (shipped)

### Must

1. Google OAuth only. Scopes: `spreadsheets` + `drive.file`. No Gmail.
2. Connect one spreadsheet + one tab per workspace. Find or create a `[zippp]`
   spreadsheet; never paste a URL. (`resto-inventory` only, for now.)
3. Read row 1 as headers; map mill/op fields; save constants (e.g. Category).
4. **Extract**: PP-OCRv6 (vision) reconstructs text rows; DeepSeek Flash
   structures them into JSON (EN+ID, null not invented). DeepSeek vision is the
   fallback, Gemini the last resort.
5. **Check screen before send**: edit date, staff, outlet, line items, total.
6. Append one row per line item. Header facts + `staff` / `outlet` repeat.
7. Show success with the number of rows appended. Fail = no write.
8. **Google Sheets is the only destination.** CSV/JSON export was removed.
9. **Credits**: 1 credit = 1 scan, spent on Send. Top-ups (GoPay manual / Paddle)
   create 30-day lots. Block Send and Snap at zero credits. The **only free
   credit** is the referral bonus; no trial, no free tier.
10. **Region-aware**: `/id` is Indonesian + IDR, `/` is English (US) + intl. The
    region is set at entry; there is no language toggle.
11. **Always-on debug trace** for the extraction pipeline (stages, OCR tokens,
    rows sent to the model, raw model output).

### Must not

- Invent units (kg/pcs) or values the receipt does not contain.
- Deduct stock. This is nota intake, not inventory truth.
- Build P&L, categories-as-a-product, bank feed, or "full accounting".
- Auto-send without the Check screen.
- Store receipt images as the product. Image in memory → extract → append → drop.

### Should (later, see `LATER.md`)

- Copy-from-template convenience, per-market price tuning, server-side job queue.

---

## Data contract

- Extract schema: `src/types/receipt.ts` (`Receipt`, `LineItem`) plus a `refusal`
  signal (`not_a_receipt` / `unreadable`).
- Sheet write: array of rows, order = header map. Empty string for null.
- Workspace config (persisted):

```
google_user_id
spreadsheet_id, spreadsheet_title, sheet_tab
template_id: resto-inventory | personal-expense | custom
column_map: { mill_field | op_field → header }
constants: { header → value }
staff_names: string[]
outlets: string[]
default_outlet: string | null
headers: string[]
```

Op fields (`staff`, `outlet`, `captured_at`) never come from the model.

---

## UX contract

See `REVISION-1.md`. Current:

- Routes: **Intro/Sign in, Snap (single screen), Success, Top up, Settings,
  Sheet, Admin**. There is no separate Check or Sent route.
- **Snap** = live camera + batch review on one screen. **Auto-snap on by
  default**; a **blurry frame is blocked**; the camera stays live.
- Review is an accordion: **one card open**, accepted hidden, **Accept/Edit**
  per card, then **Send all accepted**.
- **1 credit per successful append** (charge on success).
- The batch **persists in IndexedDB** and survives a refresh (image, extraction,
  draft, status, open card).

---

## Privacy and ops

- Client receipts: the image is sent to **Baidu AI Studio (PaddleOCR/PP-OCRv6)**
  for OCR; the reconstructed text is sent to **DeepSeek** for structuring.
  **Google Gemini** is used only as a last-resort fallback. No free tier is used
  for client work.
- OAuth tokens and workspace config are stored server-side (private Vercel Blob
  by default), never `NEXT_PUBLIC`.
- The user can disconnect. Tokens are revoked; the sheet remains theirs.

---

## Definition of done (Phase 1)

A real shopping nota, photographed by someone playing **staff**, lands as
**correct line-item rows** in the operator's **real Google Sheet**, with **staff
name** on each line, **without retyping**. The columns match how they already
work, or the map is adjusted until they do.

Not a general ledger. Not a marketplace. Not every resto in Indonesia.

---

## What this spec is not

Anything in `LATER.md`. A second database of record. A full accounting system.
