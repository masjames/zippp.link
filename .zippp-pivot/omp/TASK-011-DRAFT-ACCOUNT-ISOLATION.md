# TASK-011 — Account-Safe Local Drafts

**Status:** COMPLETE — 108 tests, typecheck, clean build, synthetic account migration/switch tests, foreground masking, and stale-append rejection passed. Native builds remain deferred to the owner's Mac.

## Problem
Web drafts currently share one IndexedDB queue and restore before account identity is known. A later account on the same browser can see an earlier account's receipts. Existing unowned records must not be deleted or silently assigned.

## Scope
- Associate new local drafts and UI metadata with the authenticated Google user ID; load only that user's records after identity is known.
- Keep existing unowned records intact and offer an explicit, warned import into the current account. Claim records atomically within IndexedDB.
- Prevent capture until account-specific storage is ready; surface storage failures.
- Bind web append, correction telemetry, opt-in photo contribution, and read-only receipt summary to the draft owner's authenticated Google ID before applying effects. Preserve mobile bearer behavior.
- Imported drafts are assigned only if they are still unowned; an existing account owner is never overwritten.
- Revalidate the signed-in Google ID when the web app returns to the foreground; mask account-specific views until verified and reload if the identity changed.
- No real Google Sheet, Drive, payment, or customer-data operations during verification.

## Security boundary
This prevents cross-account display through the application UI. IndexedDB remains same-origin browser storage and is not encrypted or protected against a compromised device or same-origin script. Do not claim otherwise.

## Verification

See `.zippp-pivot/outputs/TASK-011-DRAFT-ACCOUNT-ISOLATION-RESULTS.md`. Web IndexedDB is not encrypted; the app-level account partition does not protect against same-origin script access or device compromise.
