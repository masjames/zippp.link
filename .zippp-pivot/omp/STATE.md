# ZIPPP Pivot Execution State

- **Date:** 2026-11-17
- **Phase:** M4 Expo web app completion. Expo preview now uses real authentication; native Android/iOS work is deferred until web parity is complete.
- **Status:** TASK-020 active. `/rn` shows Google sign-in with no dummy identity; session reports signed out and not local preview. Google rejects the Tailnet callback URI; register it before Mac login. Results: `.zippp-pivot/outputs/TASK-020-EXPO-WEB-AUTH-RESULTS.md`.
- **Canonical baseline:** `v2` at `9799859786d238c3796910cbacbe01cb62d51d78` (owner confirmed).
- **v2 sync:** TASK-015 through TASK-019 are pushed. TASK-020 task/results and real-auth preview state are local pending commit.
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
- **Active task:** `.zippp-pivot/omp/TASK-020-EXPO-WEB-APP-PARITY.md` — port the existing authenticated user-facing Next.js screens/interactions to Expo Web, preserving server-side ownership and real sign-in.
- **Target:** Local Next.js backend plus Expo Web frontend at `/rn`, reachable over Tailscale. No dummy user/data or login bypass. Native build/device checks are deferred until web parity.
- **Other limits:** No real Google account was signed in; no Sheet, Drive, billing, Preview, or Production call was made. Local Expo web server has `ZIPPP_LOCAL_DUMMY_AUTH=0`; Google OAuth redirect URI registration is still required for remote login.
- **Local preview:** `https://susi.tail6078b4.ts.net:39876/rn` serves the Expo web shell. Current Tailscale status shows the Mac relayed/offline; direct Mac page load is not verified.
- **Transport:** Temporary self-signed certificate; browsers may require accepting its warning. `tailscale cert` access was denied; no privilege escalation attempted.
- **Security limitation:** Dummy identity is never server-authenticated. Web drafts are AES-GCM ciphertext under a non-extractable same-origin key; same-origin JavaScript can still request decryption. This is not end-to-end encryption or XSS protection. Key loss may make ciphertext unrecoverable.

## Protected owner gates

- Checkpoint B (Sheet schema/migration/writes), C (OAuth/Drive scopes), D (billing), and E (production release) remain closed.
