# zippp templates

Depends on: `SPEC.md`, `USER-FLOW.md`
Owns: column maps only. One row per **line item**. Header facts repeat. Unknown = empty cell, never invented.

Mill extract: merchant, date, currency, line description, qty, unit_price, amount, subtotal, tax, total (`Receipt` in `src/types/receipt.ts`). There is no `doc_ref` field.

**Only T1 `resto-inventory` is implemented today.** `connect` only creates/maps
resto-inventory; T2 and T3 are spec-only (see `LATER.md`).

---

## T1 — `resto-inventory` (Charlie / F&B)

For a manager whose staff shop for kitchen/inventory. Matches “I used to type every nota.”

| Sheet column | Source | Rule |
|---|---|---|
| Date | mill `date` | ISO or as printed, one format per sheet |
| Supplier | mill `merchant` | |
| Item | mill line `description` | |
| Qty | mill line `qty` | empty if not printed |
| Unit | **constant or blank** | receipts rarely print kg/pcs; do not guess |
| Unit price | mill line `unit_price` | |
| Line amount | mill line `amount` | |
| Tax | mill `tax` split or header tax | if only a header tax exists, put it on the last line only, rest empty |
| Receipt total | mill `total` | repeats on every line of that nota |
| Currency | mill `currency` | default IDR if null and Charlie says so |
| Staff | **prompt-at-submit** | from Charlie’s list |
| Outlet | **default or prompt** | |
| Category | **constant** default e.g. Bahan baku | not read from photo unless mapped later |
| Notes | empty | |
| Captured at | zippp timestamp | ISO |

---

## T2 — `personal-expense` (not implemented)

Intake for one human. **Not** books, VAT, or net worth.

| Sheet column | Source |
|---|---|
| Date | mill `date` |
| Merchant | mill `merchant` |
| Description | mill line `description` |
| Qty | mill line `qty` |
| Amount | mill line `amount` |
| Tax | mill `tax` (header; last line only if needed) |
| Total | mill `total` (repeat) |
| Currency | mill `currency` |
| Category | constant or empty (user fills in sheet) |
| Payment | empty unless printed and mapped |
| Notes | empty |

---

## T3 — `custom` (not implemented)

Row 1 of the user’s tab is the schema. Each mill field maps to zero or one column. Each extra column is: ignore | constant | prompt-at-submit.

No zippp column created without a header already in the sheet (or in a template copy).

---

## Mapping rules (all templates)

- One nota with N lines → N rows appended.
- Never overwrite existing rows. Append only.
- Never invent merchant, date, qty, or money.
- Staff and outlet are **operation fields**, not vision fields.
