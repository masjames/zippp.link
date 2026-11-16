# TASK-009 — Read-Only Legacy Receipt Home

**Result:** Local web Home and its synthetic summary path verified. Real Google workbook behavior and complete cash-ledger balances remain unverified.

- `/app` routes ordinary signed-in users to `/app/home`. Home remains readable at zero credits; capture retains the top-up guard.
- The web-only `/api/cashflow/legacy-summary` resolves the authenticated user and saved workspace on the server, reads that user's personal-expense Sheet without caching, applies the saved column mapping, groups repeated receipt totals, separates IDR and AUD, and marks unreadable or future-dated rows as incomplete.
- Home shows today and Monday-to-today receipt totals, latest readable receipts, an incomplete-data warning where applicable, and an explicit unavailable state for account balance. Unsupported Sheet templates receive an explanation and a settings link. This is not a complete cash ledger or income/balance implementation.

| Check | Result |
|---|---|
| Focused `legacy-summary.test.ts` | 5 passed, 0 failed. Covers repeated rows, mapped headers, Sheets date serials, time zones, partial data, currencies, and large-number formatting. |
| `npm test` | 102 passed, 0 failed, 0 skipped. |
| `npx tsc --noEmit --incremental false` | Passed. |
| `npm run build` | Passed in an isolated workspace. |
| Unauthenticated `GET /api/cashflow/legacy-summary?timeZone=UTC` | HTTP 401, `UNAUTHORIZED`. |
| Browser `/app` and `/app/home` | Intercepted synthetic data rendered separate IDR/AUD totals and the incomplete-data and unavailable-balance messages. Home stayed accessible at zero credits; Capture routed to top-up. With credits unconfigured, Capture routed to `/app/snap`. Unsupported template displayed its explanation and Sheet settings link. |

Browser auth, workspace, balance, and summary responses were intercepted synthetic data. No real Sheet, Drive, payment, or customer data was accessed. The isolated workspace and preview server were removed. The server-side Google Sheets read was not exercised against a live workbook.
