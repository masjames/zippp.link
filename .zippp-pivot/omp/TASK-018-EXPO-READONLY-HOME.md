# P2.4 — Expo Home with existing read-only session APIs

**Status:** In progress.  
**Goal:** Replace the UI-only Home empty state with the existing authenticated read-only receipt summary when available, while preserving the local dummy preview.

## Scope

- Use same-origin `GET /api/auth/me`, `GET /api/sheets/workspace`, and `GET /api/cashflow/legacy-summary` only.
- If `localPreview` is true, stop after auth bootstrap; show the existing truthful no-Sheet state and make no other API calls.
- For real web sessions, use the server-owned workspace and `expectedUserId`; do not accept a workbook id from the browser, add OAuth scopes, or write to Sheets/Drive.
- Keep balance unavailable, currencies separate, partial data labeled, and unsupported/error states explicit.
- Preserve the existing Next.js and Kotlin clients. Native bearer auth and live Google verification are out of scope for this slice.

## Acceptance

- Deterministic tests cover auth/summary state transitions, including local preview, no workspace, unsupported template, partial summary, and error.
- Expo typecheck, web export, root typecheck/build pass.
- Tailnet browser proves the dummy path calls only `/api/auth/me` and leaves server APIs untouched.
- Record results and update `STATE.md`.
