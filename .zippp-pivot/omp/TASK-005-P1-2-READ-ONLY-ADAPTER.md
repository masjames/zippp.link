# TASK-005 — P1.2 Read-Only Legacy Sheet Adapter

**Status:** VERIFIED FOR DEFAULT TEMPLATE ONLY — focused tests, full tests, typecheck, and isolated build passed. Actual workbook layouts and canonical account/identity mappings remain unverified.

## Inputs
- `.zippp-pivot/docs/13-CONTRACTS.md` (target model and invariants)
- `.zippp-pivot/outputs/TASK-001-AUDIT.md` (current-sheet limits and unknowns)
- `.zippp-pivot/outputs/TASK-003-DECISION-RECORD-DRAFT.md` (read-only-first direction; workbook strategy still open)
- `src/lib/cashflow/model.ts` (P1.1 types)

## Objective
Implement a local, read-only adapter for the built-in personal-expense template, using synthetic rows derived from its implementation. Do not connect to a real Google Sheet or assume customized workbooks match the default template.

## Fixture provenance
`PERSONAL_EXPENSE_HEADERS` and `buildAppendRows` in `src/lib/google/templates.ts` define the default headers and repeated receipt totals. Actual workbook mappings remain unverified. Missing account and idempotency information must not be invented; output is an incomplete candidate, not a confirmed ledger entry.

The read-only adapter yields incomplete receipt candidates because source rows do not establish an account or ledger idempotency key. This is not the roadmap's complete canonical transaction adapter; do not feed these candidates into confirmed balances. See `.zippp-pivot/outputs/TASK-005-P1-2-RESULTS.md`.

## Safety boundary
- Synthetic/redacted fixtures only; no `.env*`, Google credentials, workbook ID, live Sheets API, or user data.
- No Sheets writes, migration, new mandatory columns, source-of-truth changes, or workbook strategy decision. Checkpoint B remains closed.
- Do not invent missing account, currency, transaction, date, or stable-ID values; represent unknowns explicitly or reject the row according to an approved mapping.

## Completion if authorized
- Add a read-only adapter and deterministic synthetic fixtures for the built-in template.
- Run focused tests, `npm test`, `npx tsc --noEmit`, and `npm run build` in an isolated, credential-free environment.
- Record results and update `STATE.md`.
