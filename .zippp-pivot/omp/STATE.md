# ZIPPP Pivot Execution State

- **Date:** 2026-11-16
- **Phase:** M2 React Native/Expo shell; P2.1 web verified, Android/iOS verification pending on owner's Mac
- **Status:** TASK-015 web checks passed: SDK alignment, TypeScript, static export, and browser. Native acceptance remains open. Results: `.zippp-pivot/outputs/TASK-015-EXPO-COMPATIBILITY-RESULTS.md`.
- **Canonical baseline:** `v2` at `9799859786d238c3796910cbacbe01cb62d51d78` (owner confirmed).
- **v2 sync:** Task-014 code and state are committed and pushed to `origin/v2`; the Mac checkout must pull the latest branch.
- **P0.2 evidence:** `.zippp-pivot/outputs/TASK-002-BASELINE.md` — 79 tests and TypeScript check passed.
- **P0.3 decisions:** `.zippp-pivot/outputs/TASK-003-DECISION-RECORD-DRAFT.md` — planning directions accepted; protected gates remain closed.
- **P1.1 models:** `src/lib/cashflow/model.ts`; evidence in `.zippp-pivot/outputs/TASK-004-P1-1-RESULTS.md`.
- **P1.2 adapter:** default-template candidates only; not complete canonical transactions. See `.zippp-pivot/outputs/TASK-005-P1-2-RESULTS.md`.
- **P1.3 projection:** synthetic canonical inputs only; real opening balances/reconciliation unverified. See `.zippp-pivot/outputs/TASK-006-P1-3-RESULTS.md`.
- **TASK-007/008/009/010:** draft recovery, unknown dates, read-only Home, and Inbox are implemented. Results are recorded in their `TASK-XXX-*-RESULTS.md` outputs.
- **TASK-011:** owner-partitioned IndexedDB, explicit legacy claim, expected-owner web side effects, and foreground identity masking. Evidence: `.zippp-pivot/outputs/TASK-011-DRAFT-ACCOUNT-ISOLATION-RESULTS.md`.
- **TASK-012:** per-owner AES-GCM web drafts, transactional migration, fail-closed missing-key behavior. Evidence: `.zippp-pivot/outputs/TASK-012-ENCRYPTED-WEB-DRAFTS-RESULTS.md`.
- **TASK-013:** development-only dummy user; server auth remains false and protected API actions are blocked. Evidence: `.zippp-pivot/outputs/TASK-013-LOCAL-DUMMY-PREVIEW-RESULTS.md`.
- **TASK-014:** dummy preview opens Home, navigates Home/Inbox, and shows truthful empty states with capture disabled. Evidence: `.zippp-pivot/outputs/TASK-014-USABLE-DUMMY-PREVIEW-RESULTS.md`.
- **Active task:** Complete TASK-015 Android/iOS verification on the owner's Mac from `apps/expo-compat/`; Linux web proof does not satisfy native acceptance.
- **Target:** v2 specifies Expo/React Native for Android, iOS, and web. Current clients remain Next.js + Kotlin. D-02 still limits this to an isolated spike; client replacement/rollout is not authorized.
- **Other limits:** No real Google account, Sheet, Drive, billing, Preview, or Production calls.
- **Dummy preview:** `https://susi.tail6078b4.ts.net:39876/` redirects to Home; `/app/inbox` is also available. Development-only user `local-preview-user`, no `.env`, all non-auth API actions return 403.
- **Transport:** Temporary self-signed certificate. Browser verified secure context and encrypted local key. Mac browser relay was unavailable; direct Mac page load is unverified, and the Mac browser may require a certificate-warning bypass.
- **Security limitation:** Dummy identity is never server-authenticated. Web drafts are AES-GCM ciphertext under a non-extractable same-origin key; same-origin JavaScript can still request decryption. This is not end-to-end encryption or XSS protection. Key loss may make ciphertext unrecoverable.

## Protected owner gates

- Checkpoint B (Sheet schema/migration/writes), C (OAuth/Drive scopes), D (billing), and E (production release) remain closed.
