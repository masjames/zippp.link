# TASK-004 — P1.1 Pure Cash-Flow Domain Models

**Status:** COMPLETE — focused tests (4/4), full tests (83/83), typecheck, and isolated production build passed on 2026-11-15.

## Inputs
- `.zippp-pivot/docs/13-CONTRACTS.md` (core entities, accounting invariants, fixtures)
- `.zippp-pivot/docs/12-DECISIONS.md` (D-01, D-05, D-06, D-09; owner-approved planning directions recorded in TASK-003)
- `.zippp-pivot/outputs/TASK-003-DECISION-RECORD-DRAFT.md`
- Existing `src/lib/money.ts` and `src/lib/money.test.ts`

## Objective
Implement the first pure domain-model slice without connecting it to the current app, Sheet, cache, or persistence layers.

## Scope if approved
- Add a small isolated model module under `src/lib/cashflow/` for `Money`, `Account`, ledger-entry kinds, `Transfer`, receipt draft state, and `CashFlowCycle`, consistent with approved contracts.
- Represent minor-unit amounts as base-10 integer strings; do not use floating-point arithmetic for domain money.
- Add deterministic tests for the selected model invariants using synthetic values only.
- Keep the existing `parseMoney()` import/display parser and its callers unchanged; it returns `number` and is not the canonical ledger money type.

## Exclusions
- No Sheet schema, adapter, migration, or writes; D-01's workbook choice and Checkpoint B remain open.
- No balance projection, summary route, Redis/cache changes, UI, API, auth, OAuth/Drive, billing, or deployment changes.
- No historical data/date conversion, currency conversion, or production access.

## Verification results

See `.zippp-pivot/outputs/TASK-004-P1-1-RESULTS.md`; all checks exited 0.
