# ZIPPP Pivot Execution State

- **Date:** 2026-11-17
- **Phase:** M4 Expo web app completion. Real Google sign-in and the Expo receipt flow are wired locally; broader screen parity and OAuth callback registration remain open. Native app builds are deferred.
- **Status:** TASK-021 receipt flow and TASK-022 fail-closed Google identity are implemented. 9 Expo tests, 120 root tests, Expo typecheck/export, root typecheck/build, and Android/iOS JS bundle exports pass. Authenticated E2E remains blocked by the Google callback mismatch.
- **Canonical baseline:** `v2` at `9799859786d238c3796910cbacbe01cb62d51d78` (owner confirmed).
- **v2 sync:** TASK-015 through TASK-022 code, task plans, and results are synced to `v2` with this update.
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
- **Active task:** `.zippp-pivot/omp/TASK-020-EXPO-WEB-APP-PARITY.md` — next slice: port authenticated Sheet setup and Settings to Expo Web. TASK-021/022 results are in their task files.
- **Target:** Local Next.js backend plus Expo Web frontend at `/rn`, reachable over Tailscale. Current preview uses real auth only; no local dummy sign-in. Native build/device checks are deferred until web parity.
- **Other limits:** No real Google account was signed in, and no Sheet, Drive, billing, Preview, or Production mutation was called. Google OAuth currently returns `redirect_uri_mismatch` for the Tailnet callback; owner registration is required for Mac login.
- **Local preview:** `https://susi.tail6078b4.ts.net:39876/rn`; Next dev server is running with dummy auth off and Tailscale HMR origin enabled. Tailscale last reported the Mac relayed/offline; direct Mac page access is unverified.
- **Transport:** Temporary self-signed TLS; a browser warning may need manual acceptance. No Tailscale certificate privilege escalation was attempted.
- **Security limitation:** Dummy identity is never server-authenticated. Web drafts are AES-GCM ciphertext under a non-extractable same-origin key; same-origin JavaScript can still request decryption. This is not end-to-end encryption or XSS protection. Key loss may make ciphertext unrecoverable.

## Protected owner gates

- Checkpoint B (Sheet schema/migration/writes), C (OAuth/Drive scopes), D (billing), and E (production release) remain closed.
