# TASK-006 — P1.3 Synthetic Balance Projection

**Status:** VERIFIED FOR SYNTHETIC INPUTS ONLY — 3 focused tests, 90 full tests, typecheck, and isolated build passed. Actual opening-balance and historical reconciliation are unverified.

## Objective
Build and test an isolated balance projection over synthetic canonical accounts and confirmed ledger movements. Do not connect it to user Sheets, the app, APIs, billing, cache, or a database. P1.2's default-template adapter still emits incomplete candidates and must not feed confirmed totals.

## Scope
- Require explicit per-account opening balances; propagate unknown opening balances rather than inventing zero.
- Apply confirmed income and expenses; model same-currency transfers atomically between distinct accounts, without treating transfers as spending.
- Use integer minor units, separate currencies, and exclude reserved savings from everyday totals.
- Reject contradictory inputs and unsupported correction/adjustment semantics rather than guessing. Opening balances and supplied movements must refer to the same caller-selected cutoff; the projection does not read or reconcile history.
- Synthetic tests only. No user data or external systems.

## Verification

See `.zippp-pivot/outputs/TASK-006-P1-3-RESULTS.md` for commands and results. The synthetic projection does not satisfy the roadmap's real-data reconciliation gate.
