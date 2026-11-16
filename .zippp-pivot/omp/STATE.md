# ZIPPP Pivot Execution State

- **Date:** 2026-11-16
- **Phase:** M3 Expo capture and encrypted Inbox. TASK-019 web slice is verified; native Mac/device proof remains pending.
- **Status:** TASK-019 web capture, AES-GCM drafts, Inbox reload, and image preview verified. Expo TypeScript, prebuild config, dependency check, and Android/iOS JS bundle exports pass; 17 encrypted-storage tests, root typecheck, and build pass. Native compilation remains pending.
- **Canonical baseline:** `v2` at `9799859786d238c3796910cbacbe01cb62d51d78` (owner confirmed).
- **v2 sync:** TASK-015 through TASK-019 code and results are pushed at `39fa5e9e56`. Native Mac/device proof remains pending.
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
- **Active task:** `.zippp-pivot/omp/TASK-019-EXPO-ENCRYPTED-DRAFTS.md` — web slice verified; native compilation, SQLCipher/key-store, and camera behavior still need Mac verification.
- **Target:** Owner authorized parallel Expo/React Native development for Android, iOS, and web; keep Next.js/Kotlin until parity. Production release and client retirement remain unauthorized.
- **Other limits:** No real Google account, Sheet, Drive, billing, Preview, or Production calls. Native SQLCipher, key-store, camera, and iOS/Android verification remain on the owner's Mac, which is currently offline on Tailscale.
- **Dummy preview:** `https://susi.tail6078b4.ts.net:39876/` redirects to Home; `/app/inbox` is available. Expo web preview: `/rn`, `/rn/capture`, and `/rn/inbox`. Development-only user `local-preview-user`; all non-auth API actions are disabled.
- **Transport:** Temporary self-signed certificate. The Tailnet browser verified the preview; direct Mac browser trust/access is unverified and may require a certificate-warning bypass.
- **Security limitation:** Dummy identity is never server-authenticated. Web drafts are AES-GCM ciphertext under a non-extractable same-origin key; same-origin JavaScript can still request decryption. This is not end-to-end encryption or XSS protection. Key loss may make ciphertext unrecoverable.

## Protected owner gates

- Checkpoint B (Sheet schema/migration/writes), C (OAuth/Drive scopes), D (billing), and E (production release) remain closed.
