# ZIPPP Pivot Execution State

- **Date:** 2026-11-17
- **Phase:** M4 Expo Web feature parity and an isolated UI-only React Native demo are implemented. Visual parity with the owner's intended HTML remains pending; real OAuth, Mac E2E, and native checks remain open.
- **Status:** TASK-021 through TASK-025 are implemented. Current checks: Expo tests 14, Expo typecheck/export, root TypeScript check/build all pass; TASK-025 browser verified all 18 screens and local mock interactions with no `/api/*` traffic. Real authenticated flows were not exercised.
- **Canonical baseline:** `v2` at `9799859786d238c3796910cbacbe01cb62d51d78` (owner confirmed).
- **v2 sync:** TASK-015 through TASK-025 code, task plans, and results are synced to `v2` with this update.
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
- **Active task:** `.zippp-pivot/omp/TASK-026-EXPO-INTENDED-HTML-DESIGN.md` — await the owner's intended HTML, then adapt `/rn/demo` visuals while preserving mock-only data. Real auth and native gates stay deferred.
- **Target:** Real-auth Expo Web remains at `/rn`; UI-only mock preview is at `/rn/demo`. Dummy auth remains off and no mock identity reaches server APIs.
- **Other limits:** No real Google account was signed in, and no Sheet, Drive, billing, Preview, or Production mutation was called. Google OAuth returns `redirect_uri_mismatch` for the Tailnet callback; the standard web-client redirect must be added in Google Cloud Console. The `gcloud iam oauth-clients` API is for Workforce Identity Federation only: https://docs.cloud.google.com/iam/docs/workforce-manage-oauth-app.
- **Local preview:** `https://susi.tail6078b4.ts.net:39876/rn`; Next dev server is ready on Linux with dummy auth off. `mms-macbook-pro-2` is offline (last seen ~1h ago), and the browser relay extension is not connected, so Mac access is unverified.
- **Transport:** Temporary self-signed TLS may require a browser warning. Tailscale Funnel currently proxies `127.0.0.1:8788`, not Expo port `39876`. No Funnel or certificate settings were changed.

- **Visual design gate:** `ZIPPP-Pivot-Kit/reference/ZIPPP-Prototype-v0.8.html` is an 18-screen browser prototype with illustrative local data, simulated OCR, and no live cloud, payment, or encryption. Expo `PreviewShell` is a generic functional port, not visual parity. Treat v0.8 as layout reference only; do not copy its demo data or interactions.
- **Security limitation:** Dummy identity is never server-authenticated. Web drafts are AES-GCM ciphertext under a non-extractable same-origin key; same-origin JavaScript can still request decryption. This is not end-to-end encryption or XSS protection. Key loss may make ciphertext unrecoverable.

## Protected owner gates

- Checkpoint B (Sheet schema/migration/writes), C (OAuth/Drive scopes), D (billing), and E (production release) remain closed.
