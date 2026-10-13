# zippp spec

Status: **ACTIVE** — Phase 1 shipped; Revision 2 (`AUDIT-2026-10.md`) decided,
not fully implemented. Implementer follows the audit task list.
Depends on: `USER-FLOW.md`, `ARCHITECTURE.md`, `TEMPLATES.md`, `PRICING.md`,
`wording.txt`

Domain: zippp.link

---

## One sentence

Photograph a receipt or invoice; zippp reads it, the user checks it, and zippp
appends clean line-item rows into a Google Sheet the user already owns — one
month tab, with daily totals and (when on) photo proof in Drive.

---

## Who it is for

| Persona | Template | Job |
|---|---|---|
| **Sonny** | `resto-inventory` | Purchasing staff at a resto / warung / cafe |
| **Bibian** | `personal-expense` | Student or individual tracking spend |
| **Fais** | `sales-recap` | Seller who recaps daily sales from paper notas |
| **Bagas** | `reimbursement` | Staff claiming reimbursement with photo proof |

Not: replacing Accurate / Jurnal / Xero. Not a hobby ledger with 40 reports.
`custom` exists for people who already have their own headers.

---

## Why Sheets, not zippp-as-DB

The operator already has the sheet. Land in **their** Drive; do not make them
learn ours. The job is append + map + month layout, not a second general ledger.

---

## Requirements

### Must (shipped)

1. Google OAuth only. Scopes: `spreadsheets` + `drive.file`. No Gmail.
2. Connect one spreadsheet per workspace. Find a `[zippp]` spreadsheet, or
   create one from a template. Never create silently, never paste a URL.
3. Extract: PP-OCRv6 → DeepSeek Flash (EN+ID, null not invented). DeepSeek
   vision fallback, Gemini last resort. Verifier grounds values in OCR.
4. Check before send: edit merchant, date, money, line items. No auto-send.
5. Append one row per line item. Fail = no write. Charge 1 credit on success.
6. Google Sheets is the only destination.
7. Credits: 1 credit = 1 scan. Top-ups create 30-day lots. Block Snap/Send at
   zero. Only free credit = referral bonus.
8. Region-aware: `/id` Indonesian + IDR, `/` English + intl. An EN/ID language
   selector overrides copy only, never the currency.
9. Always-on debug trace for the extraction pipeline.
10. Capture: auto-snap on by default, blur hard-blocks, batch on one screen,
    IndexedDB persistence, Accept writes immediately.

### Must (Revision 2 — decided, build next)

See `AUDIT-2026-10.md` §10 for task order.

1. Five templates with persona wizard copy (`TEMPLATES.md`).
2. Zippp-owned sheets: **one tab per month** (receipt date), `Summary` tab,
   daily formula block, hide tabs older than 12 months, formatting + dropdowns.
3. Staff / outlet (and other ops) **wired in the review card** and Settings.
4. Photo proof to the user's Drive when toggled (default on for reimbursement).
5. Credit pill in the header; Accept shows cost; top-up presets start at
   **Rp 15.000 = 100 scans**; post-pay back to camera.
6. Landing: four persona cards, sheet visual, pricing copy for Rp 15.000 entry.

### Must not

- Invent units or values the receipt does not contain.
- Deduct stock. Nota intake, not inventory truth.
- Build P&L, bank feed, or full accounting.
- Auto-send without review.
- Keep receipt images on zippp servers. Device IndexedDB for the batch only;
  optional copy goes to **the user's Drive**.

---

## Data contract

- Extract schema: `src/types/receipt.ts` plus refusal (`not_a_receipt` /
  `unreadable`). Verifier attaches `flags`.
- Sheet write: array of rows, order = header map. Empty string for null.
- Workspace config (persisted):

```
google_user_id
spreadsheet_id, spreadsheet_title, sheet_tab
template_id: resto-inventory | personal-expense | sales-recap | reimbursement | custom
column_map: { field_id → header }
constants: { header → value }
staff_names: string[]
outlets: string[]
default_outlet: string | null
photo_proof: boolean
headers: string[]
```

Op fields (`staff`, `outlet`, `payment`, `customer`, `purpose`, `captured_at`)
never come from the model. Month tab for append is derived from receipt date,
not from `sheet_tab` (except `custom`).

---

## UX contract

See `USER-FLOW.md`. Routes: Intro/Sign in, Snap, Top up, Settings, Sheet, Admin.
No separate Check or Sent route. Credit pill always visible when signed in.

---

## Privacy and ops

- Photo → Baidu AI Studio (PP-OCRv6) for OCR → DeepSeek for structuring → Gemini
  only as last-resort fallback. Disclosed in FAQ and sign-in copy.
- When photo proof is on, the JPEG is uploaded to the user's Google Drive under
  `[zippp] Receipts/`. zippp does not keep a copy.
- OAuth tokens and workspace config are server-side only. Never `NEXT_PUBLIC`
  for secrets. Disconnect revokes tokens; the sheet remains theirs.

---

## Definition of done

A real nota photographed by each persona lands as correct line-item rows in the
right **month tab**, with daily totals that match a hand sum, ops filled where
required, and (for Bagas) a Drive photo linked from the row — without retyping.

Not a general ledger. Not a marketplace. Not every resto in Indonesia.

---

## What this spec is not

Anything in `LATER.md`. A second database of record. A full accounting system.
