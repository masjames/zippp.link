# TASK-002 — BASELINE VERIFICATION (NOT YET APPROVED)

**Only use after owner approves TASK-001 and authorizes this phase.** Never auto-run this file as part of TASK-001.

## Inputs
- TASK-001 output, approved branch/commit, existing scripts/tests, exact app modules and environment constraints.

## Objective
Obtain reproducible baseline checks for existing web/Android app without altering production or user data.

## Work
1. Determine safe test commands, their file-system/network side effects, and approved test environment.
2. Run permitted unit/type/build checks in a disposable/safe environment; do not infer success if dependencies or permissions are missing.
3. Produce redacted route, spreadsheet-schema, authentication and OCR fixtures. If real customer data would be exposed, use synthetic fixtures only.

## Acceptance
- Exact commands, exit codes, and observed behaviors documented.
- No user Google Sheet, Drive, payment, or deployed environment modified.
- Approved migration approach and first coding slice ready for owner review.
