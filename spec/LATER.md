# Later — not Phase 1

Phase 1 is intake into **their** Google Sheet (`SPEC.md`). Do not build this until Charlie’s real nota lands without him typing.

---

## Full personal / small-business accounting

Chart of accounts, journals, P&L, balance sheet, AR/AP, tax periods, bank reconciliation, period close. That is a second product. zippp is not Jurnal/Accurate.

---

## Inventory truth

Stock on hand, recipes, COGS per plate, waste. Phase 1 only **records the nota**. It does not decrement inventory.

---

## Product chrome parked

- zippp-hosted sheet UI as the home screen
- Multi-sheet / one sheet per client in-app
- Paywalls, Stripe, credit wallet UI
- History of images inside zippp
- Staff logins, roles, permissions beyond a name picker
- Auto-send without confirm
- Categories as a vision feature
- Mobile-only redesign
- Drive ingestion of old PDF folders

---

## Specified but not built

- **`personal-expense` and `custom` templates** — only `resto-inventory` ships
  (`TEMPLATES.md`).
- **Server-side job queue** — the app uses a per-device client queue today.
  A Blob-backed async job (`POST` returns a jobId, client polls) is the upgrade
  if a queue must survive closing the app.
- **Observability: Axiom log drain** — structured `extract.run` logs go to Vercel
  runtime logs for now.
- **Camera auto-snap** — the detection overlay ships as guidance only; automatic
  capture is disabled.
- **Real prices / per-market tuning** — plans show `xx` placeholders
  (`PRICING.md`).

## Old Phase 2 notes

Freemium zippp-as-database, export paywalls, Google Sheets as a *sync of zippp’s sheet* — superseded. Phase 1 writes **to Google**, it does not replace Google.
