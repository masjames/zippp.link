# Later — not Revision 2

Revision 2 is defined in `AUDIT-2026-10.md` and the active specs. Do not build
the items below until the audit task list (§10) is done.

---

## Full personal / small-business accounting

Chart of accounts, journals, P&L, balance sheet, AR/AP, tax periods, bank
reconciliation, period close. That is a second product. zippp is not
Jurnal/Accurate.

---

## Inventory truth

Stock on hand, recipes, COGS per plate, waste. zippp only **records the nota**.
It does not decrement inventory.

---

## Product chrome parked

- zippp-hosted sheet UI as the home screen
- Multi-sheet / one sheet per client in-app
- History of images inside zippp (beyond IndexedDB batch + Drive proof)
- Staff logins, roles, permissions beyond a name picker
- Auto-send without confirm
- Migrating pre–Revision 2 single-tab sheets to month tabs
- Yearly spreadsheet rollover
- Discount extraction for sales-recap
- Reimbursement approval / status workflow
- **Share month as PDF** from the app (Phase B; Phase A = Google Share +
  Open this month)
- Bigger Paddle packs
- Axiom log drain (structured `extract.run` stays on Vercel logs for now)
- Server-side job queue (client IndexedDB queue today)
- Native app (Capacitor / Flutter); PWA first

---

## Eval / quality (not blocking Revision 2 UI)

- Handwritten golden set (required before marketing **sales-recap** / Fais)
- Dataset page (every labeled receipt, per-method accuracy, trend)
- Paid method comparison run and threshold tuning
- Production default method by region / receipt type

---

## Old Phase 2 notes

Freemium zippp-as-database, export paywalls, Google Sheets as a *sync of zippp’s
sheet* — superseded. Phase 1 writes **to Google**, it does not replace Google.
