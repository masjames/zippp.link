# zippp templates

Depends on: `SPEC.md`, `USER-FLOW.md`
Owns: column maps, sheet layout, dropdowns, photo proof. One row per **line
item**. Header facts repeat. Unknown = empty cell, never invented.

Decisions: `AUDIT-2026-10.md` (revision 2). Implementer builds from that brief;
this file is the lasting column and layout contract.

Mill extract: merchant, date, currency, line description, qty, unit_price,
amount, subtotal, tax, total, category (`Receipt` in `src/types/receipt.ts`).
There is no `doc_ref` field. Op fields never come from the model.

---

## Templates

| Id | Persona | Create title |
|---|---|---|
| `resto-inventory` | Sonny (purchasing) | `[zippp] Resto inventory` |
| `personal-expense` | Bibian (personal spend) | `[zippp] Expenses` |
| `sales-recap` | Fais (daily sales) | `[zippp] Sales` |
| `reimbursement` | Bagas (claim / proof) | `[zippp] Reimbursement` |
| `custom` | own headers | `[zippp] Custom` |

Keep the id `resto-inventory` for existing workspaces; change the UI label only
(`app.sheets.tpl.resto`).

`custom` = user's headers, single tab, no Summary, no daily block, no photo.
Zippp-owned templates share the layout in **Sheet layout** below.

Shared columns on zippp-owned templates: **Receipt ID** (scan id), **Captured
at** (server ISO), **Photo** (`=HYPERLINK(...)` or empty). Photo is **on by
default** for `reimbursement`, **off** for the others (toggle in Settings).

### T1 — `resto-inventory` (Sonny)

| Sheet column | Source | Dropdown |
|---|---|---|
| Date | mill `date` | |
| Supplier | mill `merchant` | |
| Item | mill line `description` | |
| Qty | mill line `qty` | |
| Unit | constant or blank | |
| Unit price | mill line `unit_price` | |
| Line amount | mill line `amount` | |
| Tax | mill `tax`, last line only | |
| Receipt total | mill `total`, repeats | |
| Staff | **op, from card** | `staff_names` |
| Outlet | **op, from card or default** | `outlets` |
| Category | model `category`, editable | list below |
| Notes | empty | |
| Photo | Drive link when proof on | |
| Receipt ID | scan id | |
| Captured at | zippp timestamp | |

### T2 — `personal-expense` (Bibian)

| Sheet column | Source |
|---|---|
| Date | mill `date` |
| Merchant | mill `merchant` |
| Description | mill line `description` |
| Qty | mill line `qty` |
| Amount | mill line `amount` |
| Tax | mill `tax` (last line only) |
| Total | mill `total` (repeat) |
| Category | model `category`, editable (dropdown) |
| Payment | op, optional (Cash, Debit, Credit, QRIS, E-wallet, Transfer) |
| Notes | empty |
| Photo | when proof on |
| Receipt ID | scan id |
| Captured at | zippp timestamp |

### T3 — `sales-recap` (Fais)

Money **in**. No Merchant column (the printed name is the seller).

| Sheet column | Source |
|---|---|
| Date | mill `date` |
| Item | mill line `description` |
| Qty | mill line `qty` |
| Unit price | mill line `unit_price` |
| Amount | mill line `amount` |
| Discount | empty unless printed and mapped later |
| Nota total | mill `total`, repeats |
| Payment | op: Cash, QRIS, Transfer |
| Customer | op, free text, optional |
| Notes | empty |
| Photo | when proof on |
| Receipt ID | scan id |
| Captured at | zippp timestamp |

The daily block on the month tab is the product for Fais. The `Summary` tab is
first so he lands on it.

Risk: sales notas are often handwritten. Do not market T3 until `eval/` has a
handwritten golden set and the wrong-and-unflagged rate is known.

### T4 — `reimbursement` (Bagas)

| Sheet column | Source |
|---|---|
| Date | mill `date` |
| Merchant | mill `merchant` |
| Description | mill line `description` |
| Qty | mill line `qty` |
| Amount | mill line `amount` |
| Tax | mill `tax` (last line only) |
| Total | mill `total` (repeat) |
| Category | model `category`, editable (dropdown) |
| Purpose | op, free text, session-remembered |
| Photo | **on by default** |
| Notes | empty |
| Receipt ID | scan id |
| Captured at | zippp timestamp |

One month tab = one claim period. No status column. Proof = photo in the user's
Drive, linked from the row. Share = Google's Share on that spreadsheet / tab
(Phase A). PDF share is later (`LATER.md`).

### T5 — `custom`

Row 1 of the user's tab is the schema. Each mill field maps to zero or one
column. Each extra column is: ignore | constant | prompt-at-submit. No zippp
column created without a header already in the sheet.

---

## Dropdown lists (data validation, warning only)

Applied at month-tab creation. User can edit the lists in the sheet.

- **Category T1** (ID): Bahan baku, Minuman, Kemasan, Kebersihan, Peralatan,
  Lainnya. (EN: Ingredients, Beverages, Packaging, Cleaning, Equipment, Other.)
- **Category T2 / T4** (ID): Makanan, Transport, Belanja, Tagihan, Kesehatan,
  Hiburan, Lainnya. (EN: Food, Transport, Shopping, Bills, Health, Fun, Other.)
- **Payment T2**: Cash, Debit, Credit, QRIS, E-wallet, Transfer.
- **Payment T3**: Cash, QRIS, Transfer.
- **Staff / Outlet T1**: from workspace lists. `strict: false`.

The model's category is written as-is even if not in the list.

Sheet-side strings (headers, "Summary", "Day", "Receipts", "Total", "Month",
dropdown values) live in `wording.txt` under `sheet.*` so `/id` users get
Indonesian headers. For zippp-created sheets, `column_map` keys by **field id**,
not header text.

---

## Sheet layout (zippp-owned templates only)

```
[zippp] <Template>
├── Summary       first tab. Month | Receipts | Total
├── 2026-10       current month (receipt date)
├── 2026-09
├── ...           12 most recent months visible
└── 2025-09       older than 12 months: hidden
```

- Tab name `YYYY-MM` from the **receipt date** (after assumed-date fill).
- On Accept: resolve tab → create with headers, formatting, validation, daily
  block if missing → Summary row → hide tabs older than 12 months → append.
- Existing single-tab workspaces keep writing to that tab until the user creates
  a new sheet. No migration.
- Formatting constants: `src/lib/google/sheet-style.ts`.

### Daily block (right of data, 2-column gap)

Pre-filled for every day of the month at tab creation:

| Day | Receipts | Total |
|---|---|---|
| 2026-10-01 | `COUNTUNIQUEIFS` on Receipt ID | `SUMIF` Amount + `SUMIF` Tax |
| ... | | |
| **Month** | `=SUM(...)` | `=SUM(...)` |

Amount column = Line amount (T1) or Amount (T2–T4). Tax is last-line only, so
amount + tax per day matches receipt totals when every line has an amount.

### Summary tab

One row per month tab, newest on top, formulas pointing at each month's Month
totals. zippp appends a Summary row when it creates a month tab.

### Photo proof

- Drive folder `[zippp] Receipts/YYYY-MM/`, `drive.file` scope.
- File: `YYYY-MM-DD <merchant> <scanId8>.jpg` (downscaled JPEG from IndexedDB).
- Accept order: spend → ensureMonthTab → upload (optional) → append with link.
  Append fail → trash file + refund. Upload fail → append without link,
  soft notice.
- zippp keeps no server copy. Privacy copy discloses Drive storage when proof is
  on.

### Share / export (Bagas)

Phase A: month tab + Drive folder. In-app `Open this month` deep-links to the
tab. Sharing uses Google Sheets Share. Phase B (later): PDF export via app.

---

## Mapping rules (all templates)

- One nota with N lines → N rows appended.
- Never overwrite existing rows. Append only.
- Never invent merchant, date, qty, or money.
- Staff, outlet, payment, customer, purpose are **operation fields**, not vision
  fields.
