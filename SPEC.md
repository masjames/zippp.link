# zippp spec

Status: DRAFT — Phase 1 (Sheets intake)
Depends on: `USER-FLOW.md`, `TEMPLATES.md`
Architecture: `ARCHITECTURE.md`
Parked: `LATER.md`

Domain: zippp.link

---

## Decision (24 Sep 2026)

Phase 0 mill (photo → table → CSV/JSON) is **done**. Phase 1 is **Google Sheets as the destination**, because that is where the work already lives.

**MVP is not three products.** It is one mill and one mapping engine.

| In Phase 1 | Out (see `LATER.md`) |
|---|---|
| Google sign-in, write to **their** sheet | zippp as the accounting database |
| Template `resto-inventory` (Charlie) | Full personal accounting (COA, journals, P&L, tax, bank rec) |
| Template `personal-expense` (thin) | Personal finance app chrome, budgets, charts |
| `custom` column map | Multi-company, payroll, inventory stock ledger (qty on hand) |
| Edit-before-send | Silent overwrite of old rows |
| Staff name + outlet at submit | Staff user accounts, roles, audit product |

Charlie (F&B manager, staff shop for resto inventory, he types notas into Sheets) is the **definition of done** for Phase 1. Personal expense is the same code path with a different map. Full accounting is a different company.

---

## One sentence

Staff photograph a nota; zippp appends clean line-item rows into the Google Sheet the manager already uses.

---

## Who it is for

1. **Primary:** operators like Charlie — people who already run a sheet, whose team produces paper notas, whose time is typing.
2. **Secondary:** one person using `personal-expense` so the same mill has a second demo template.
3. **Not:** replacing Accurate/Jurnal/Xero. Not a hobby ledger with 40 reports.

---

## Why Sheets, not zippp-as-DB

Charlie already has the sheet. Customer-centric means land in **his** columns, not make him learn ours. Ops efficiency means **append + one map**, not a second general ledger.

---

## Phase 1 requirements

### Must

1. Google OAuth. Scope: see and write spreadsheets the user picks. No Drive dump of their whole life if a narrower scope exists; do not request Gmail.
2. Connect **one** spreadsheet + **one** tab per workspace (Charlie = one resto sheet for MVP).
3. Read header row. Save a field map (`TEMPLATES.md`).
4. Extract with existing mill (Gemini, EN+ID, null not invented).
5. **Correct screen** before send (line text, qty, amounts). Send is opt-in.
6. Append one row per line item. Numbers as numbers. Dates as dates the sheet already uses, or ISO if the column is empty of style.
7. Prompt-at-submit: **Staff** (required for resto template), **Outlet** if more than one.
8. Show success with row count appended. Fail = no write.
9. Paid Gemini (or billed AI Studio) for **client** fotos. Free tier may train. Tell Charlie.
10. CSV/JSON download still works if they are not connected (Phase 0 path).

### Must not

- Invent units (kg/pcs) from a receipt that has none.
- Deduct stock. This is **nota intake**, not inventory truth.
- Build P&L, categories-as-a-product, bank feed, or “full accounting.”
- Auto-send on capture. Manager/staff must confirm.
- Store receipt images as the product (optional later). MVP: image in memory → extract → append → discard or short-lived temp.

### Should

- Copy-from-template: “Make a sheet from `resto-inventory`” then connect that copy.
- Bring-your-sheet: paste/pick existing.
- One “test append” with a sample row Charlie can delete.

---

## Data contract

Extract schema stays `src/types/receipt.ts` plus optional `doc_ref: string | null`.

Sheet write: array of rows, order = header map. Empty string for null.

Workspace config (persisted):

```
google_user_id
spreadsheet_id
sheet_tab
template_id: resto-inventory | personal-expense | custom
column_map: { mill_field | op_field → header }
constants: { header → value }
staff_names: string[]
outlets: string[]
default_outlet: string | null
```

Op fields: `staff`, `outlet`, `captured_at`. Not from the model.

---

## Privacy and ops

- Client notas: billed Gemini, training off, or refuse the job.
- OAuth tokens on the server, never `NEXT_PUBLIC`.
- Charlie can disconnect. Tokens revoked. Sheet remains his.

---

## Definition of done (Phase 1)

Charlie’s real shopping nota, photographed by someone playing **staff**, lands as **correct line-item rows** in **his real Google Sheet**, with **staff name** on each line, **without Charlie typing**. He says the columns match how he already works, or the map is adjusted until they do.

Not: a general ledger. Not: deployed marketplace. Not: every resto in Indonesia.

---

## Money (after done)

Same mill sell: Run pack / concierge. The demo is Charlie’s before/after: typed sheet vs appended rows. Loom: photo → confirm → sheet updates.

---

## What this spec is not

Anything in `LATER.md`. A second database of record. A “full blown personal accounting system.” That phrase is a later product. Phase 1 is intake into a sheet.
