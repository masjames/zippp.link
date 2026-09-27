# zippp user flows

Depends on: `SPEC.md`
Owns: who does what, in order. Not stack. Not prices.

Primary design partner: **Charlie**, F&B manager. His staff shop for resto inventory. He types every nota into Google Sheets today. zippp ends that typing.

---

## Actors

| Actor | Job |
|---|---|
| **Staff** | Buys inventory, holds the paper nota, photographs it. Does not own the sheet. |
| **Charlie** | Owns the Google Sheet. Reviews rows. Does not retype. Sets outlet, staff list, column map once. |
| **zippp** | Reads the photo, maps to columns, appends rows. Does not become the books. |

The sheet stays the system of record. zippp is the intake mill.

---

## Flow A — First-time setup (Charlie, once)

1. Charlie opens zippp, signs in with Google (Sheets write scope only).
2. He either **copies a zippp template** (resto inventory) or **points at the sheet he already uses**.
3. zippp reads **row 1** as headers. He maps mill fields → those headers. Unmapped mill fields are dropped. Extra sheet columns get a **constant** or **prompt-at-submit** (e.g. Staff, Outlet).
4. He saves the connection: spreadsheet id, tab, mapping, defaults.
5. He adds staff names (plain list). Done.

He does not build a chart of accounts. He does not create a second product.

---

## Flow B — Shopping day (the time save)

1. Staff open zippp on a phone (link Charlie sent). They pick **their name** from Charlie’s list. Outlet is already defaulted, or they pick it if he has more than one.
2. They photograph **one** nota (or pick from camera roll). English or Indonesian.
3. zippp extracts. They see a table: merchant, date, lines, totals. If a line is wrong, they **correct it on this screen** (this phase has edit-before-send; the old CSV mill did not).
4. They tap **Send to sheet**. zippp appends **one row per line item** into Charlie’s tab, using the saved map. Header facts (date, supplier, receipt total, staff, outlet) repeat on each line.
5. Staff see “landed.” They can shoot the next nota.
6. Charlie opens Google Sheets when he wants. New rows are there. He does not type.

Fail path: unreadable / not a receipt → no append. Staff retake. Nothing silent.

---

## Flow C — Personal expense template (same mill, different map)

Same as A+B, one person, template `personal-expense`. No staff list. No inventory units. Not an accounting system.

---

## Flow D — Custom sheet (any operator, including Charlie if he already has columns)

Same as A, except there is no zippp-branded template. Row 1 is law. Mapping is the product.

---

## Out of flow (do not draw)

Accountant close, P&L, journals, bank rec, tax, payroll, multi-entity, staff having their own login beyond “pick my name,” zippp-hosted history, replacing Google Sheets.
