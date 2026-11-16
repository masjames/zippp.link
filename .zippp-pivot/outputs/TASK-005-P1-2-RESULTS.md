# TASK-005 — P1.2 Verification

**Status:** Verified for the built-in personal-expense template only; actual workbook layouts and canonical account/identity mappings remain unverified.

Synthetic fixtures use `PERSONAL_EXPENSE_HEADERS` in `src/lib/google/templates.ts`, whose append implementation repeats the receipt total on each line-item row. `src/lib/cashflow/legacy-expenses.ts` groups rows by receipt ID and rejects conflicting groups, missing IDs, unsupported currencies, invalid dates, and missing/duplicate required headers. It emits incomplete receipt candidates, not confirmed ledger entries; no account or ledger idempotency key is fabricated. IDR accepts integer minor units; AUD accepts up to two decimal places. Safe numeric AUD values such as `42.5` convert from their canonical decimal representation; unsafe integer numbers and precision-noisy values such as `0.1 + 0.2` are rejected. Receipt IDs with conflicting row totals reject the whole group; rows without IDs are rejected individually. Identical IDs and totals are treated as one receipt, so reused IDs cannot be distinguished without source evidence.

| Check | Result |
|---|---|
| `npm ci --ignore-scripts --no-audit --no-fund` | Passed in disposable workspace; package registry accessed. |
| Focused `node --experimental-transform-types --loader ./scripts/ts-loader.mjs --test src/lib/cashflow/legacy-expenses.test.ts` | 4 passed, 0 failed. |
| `npm test` | 87 passed, 0 failed, 0 skipped. |
| `npx tsc --noEmit --incremental false` | Passed. |
| `npm run build` | Passed in disposable workspace. |

Checks ran with a clean environment and local synthetic data. The build workspace excluded `.env*`, `.npmrc`, `.vercel`, `.git`, the original `.next`, and original `node_modules`. No Google Sheets/Drive, payment, deployment, or customer-data operations were performed. The adapter is not connected to the app or to any workbook.
