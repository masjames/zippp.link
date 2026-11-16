# ZIPPP Pivot Execution State

- **Date:** 2026-11-16
- **Phase:** Phase 4 Android verification (FEAT-102 + FEAT-115), owner Mac required
- **Status:** TASK-012 COMPLETE — 114 tests, TypeScript check, isolated web build, and synthetic browser persistence/account checks passed.
- **Canonical baseline:** `v2` at `9799859786d238c3796910cbacbe01cb62d51d78` (owner confirmed).
- **Synced commit:** `6984759d08cdfcc384640aadef41adf28ea765d0` pushed to `origin/v2`; the Mac checkout still needs to pull the branch.
- **P0.2 evidence:** `.zippp-pivot/outputs/TASK-002-BASELINE.md` — 79 tests and TypeScript check passed.
- **P0.3 decisions:** `.zippp-pivot/outputs/TASK-003-DECISION-RECORD-DRAFT.md` — planning directions accepted; protected gates remain closed.
- **P1.1 models:** `src/lib/cashflow/model.ts`; evidence in `.zippp-pivot/outputs/TASK-004-P1-1-RESULTS.md`.
- **P1.2 adapter:** default-template candidates only; not complete canonical transactions. See `.zippp-pivot/outputs/TASK-005-P1-2-RESULTS.md`.
- **P1.3 projection:** synthetic canonical inputs only; real opening balances/reconciliation unverified. See `.zippp-pivot/outputs/TASK-006-P1-3-RESULTS.md`.
- **TASK-007/008/009/010:** draft recovery, unknown dates, read-only Home, and Inbox are implemented. Results are recorded in their `TASK-XXX-*-RESULTS.md` outputs.
- **TASK-011:** owner-partitioned IndexedDB, explicit legacy claim, expected-owner web side effects, and foreground identity masking. Evidence: `.zippp-pivot/outputs/TASK-011-DRAFT-ACCOUNT-ISOLATION-RESULTS.md`.
- **TASK-012:** per-owner AES-GCM web drafts, transactional migration, fail-closed missing-key behavior. Evidence: `.zippp-pivot/outputs/TASK-012-ENCRYPTED-WEB-DRAFTS-RESULTS.md`.
- **Active task (Mac required):** Phase 4 FEAT-102 / FEAT-115 native compile and device checks.
  Cards: `spec/themes/03-zippp-software-factory/entities/features/FEAT-102-android-review-contract.md`
  and `spec/themes/03-zippp-software-factory/entities/features/FEAT-115-notification-capture.md`.
- **Local verification limits:** No real Google account, Sheet, Drive, billing, Preview, or Production calls. Native Android compile/device checks are not run on this Linux workstation.
- **Security limitation:** Web draft payloads are AES-GCM ciphertext in IndexedDB with a non-extractable same-origin key. Same-origin JavaScript can still request decryption; this is not end-to-end encryption or XSS protection. Key loss may make ciphertext unrecoverable.

## Protected owner gates

- Checkpoint B (Sheet schema/migration/writes), C (OAuth/Drive scopes), D (billing), and E (production release) remain closed.
