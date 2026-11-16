# TASK-009 — Read-Only Legacy Receipt Home

**Status:** VERIFIED LOCALLY WITH SYNTHETIC DATA — focused/full tests, typecheck, build, browser states, and unauthenticated route check passed. Live Google workbook behavior remains unverified.

## Objective
Provide a real, authenticated web Home view of receipt spending already recorded in the user's existing personal-expense Sheet. Read the saved workspace mapping; never write or migrate the workbook. Keep the existing capture flow and billing checks.

## Boundaries
- This is receipt history, not a complete cash ledger. Account balances and income are unavailable; do not invent them or present the partial source as a complete financial picture.
- Count repeated line-item receipt totals once by receipt ID; reject conflicting or unparseable rows and report incomplete data. Keep currencies separate.
- Resolve identity and workspace server-side. Never accept a workbook ID from the browser. Do not expose tokens. Web access only in this slice.
- No cache persistence, Sheet schema change, write, OAuth scope change, payment change, or production deployment.
- Test with synthetic rows and intercepted browser responses; never access a real workbook during verification.

## Verification

See `.zippp-pivot/outputs/TASK-009-LEGACY-RECEIPT-HOME-RESULTS.md` for commands, browser evidence, and limitations.
