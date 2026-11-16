# TASK-006 — P1.3 Synthetic Balance Projection

**Result:** Local pure projection verified; actual account balances, opening-balance cutoffs, and historical reconciliation remain unverified. This does not satisfy the roadmap's real-data reconciliation gate.

`src/lib/cashflow/balances.ts` projects committed income, expenses and atomic same-currency transfers using integer minor units. Pending movements do not affect balances; unknown openings stay unknown; everyday totals exclude accounts marked outside everyday balance and remain separated by currency. Duplicate movement IDs, missing accounts, mismatched currencies, negative movement amounts, self-transfers, and unsupported corrections/adjustments fail closed. Callers must provide movements relative to the same opening-balance cutoff. The module is not wired to the app, a Sheet, or P1.2 candidates.

| Check | Result |
|---|---|
| Focused `node --experimental-transform-types --loader ./scripts/ts-loader.mjs --test src/lib/cashflow/balances.test.ts` | 3 passed, 0 failed. |
| `npm ci --ignore-scripts --no-audit --no-fund` | Passed on retry in a disposable workspace; package registry accessed. First attempt failed with `ECONNRESET`. |
| `npm test` | 90 passed, 0 failed, 0 skipped. |
| `npx tsc --noEmit --incremental false` | Passed. |
| `npm run build` | Passed in disposable workspace. |

Checks ran with isolated environment and synthetic data. The build workspace excluded `.env*`, `.npmrc`, `.vercel`, `.git`, the original `.next`, and original `node_modules`. No Google Sheets/Drive, payment, deployment, or customer-data operations were performed.
