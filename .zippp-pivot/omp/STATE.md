# ZIPPP Pivot Execution State

- **Date:** 2026-11-17
- **Phase:** M4 Expo Web includes the real-auth app and a React Native mock-only `/rn/demo` preview visually ported from the available v0.8 screen system. OAuth/Mac authenticated E2E and native checks remain open.
- **Status:** TASK-021 through TASK-026 are implemented. Last root test suite (TASK-024): 121 passed; current Expo suite: 14 passed. Expo typecheck/export, root typecheck/build, and mock-browser verification passed. Fresh Linux browser verification of `/rn` shows real Google sign-in; `GET /api/auth/session` returned HTTP 200 with `signedIn:false,userId:null`. All 18 `/rn/demo` screens and mock expense/receipt/payment flows work with no `/api/*` traffic. Authenticated flows remain untested.
- **Canonical baseline:** `v2` at `9799859786d238c3796910cbacbe01cb62d51d78` (owner confirmed).
- **v2 sync:** TASK-015 through TASK-026 code, task plans, and results are synced to `v2` with this update.
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
- **Active gate:** `.zippp-pivot/omp/TASK-026-EXPO-INTENDED-HTML-DESIGN.md` is complete against the only supplied HTML. Linux verifies the signed-out `/rn` state, but the Tailnet OAuth callback still needs registration in Cloud Console before Mac authenticated E2E; native Android/iOS work remains on the user's Mac.
- **Target:** Real-auth Expo Web at `/rn`; mock-only React Native preview at `/rn/demo`. On a fresh Mac checkout, run `npm run expo:web:copy` before `npm run dev`; `public/rn` is generated/ignored.
- **Other limits:** No real Google account was signed in, and no Sheet, Drive, billing, Preview, or Production mutation was called. Google OAuth returns `redirect_uri_mismatch` for the Tailnet callback; the standard web-client redirect must be added in Google Cloud Console. The managed Cloud Console browser redirects to Google sign-in, so no OAuth change was made. A read-only `gcloud` check found an active account but no default project. The `gcloud iam oauth-clients` API is for Workforce Identity Federation only: https://docs.cloud.google.com/iam/docs/workforce-manage-oauth-app.
- **Local preview:** `https://susi.tail6078b4.ts.net:39876/rn/demo`; Next dev server is ready on Linux with dummy auth off. `mms-macbook-pro-2` is active/direct on Tailnet, but the browser relay is disconnected; a read-only SSH probe was refused because the host key is unknown under strict checking. No host-key bypass was used; Mac UI was not observed.
- **Transport:** Temporary self-signed TLS may require a browser warning. Tailscale Funnel currently proxies `127.0.0.1:8788`, not Expo port `39876`. No Funnel or certificate settings were changed.

- **Visual design gate:** TASK-026 ports the v0.8 visual system into React Native components. The HTML's illustrative records, browser storage, and JavaScript are not used. A later owner-provided revision can refine the design.
- **Security limitation:** Dummy identity is never server-authenticated. Web drafts are AES-GCM ciphertext under a non-extractable same-origin key; same-origin JavaScript can still request decryption. This is not end-to-end encryption or XSS protection. Key loss may make ciphertext unrecoverable.

## Protected owner gates

- Checkpoint B (Sheet schema/migration/writes), C (OAuth/Drive scopes), D (billing), and E (production release) remain closed.
