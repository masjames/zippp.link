# TASK-021 — Expo Web receipt flow

**Status:** Receipt-flow implementation and local checks pass. Authenticated end-to-end use is blocked until the Tailnet OAuth callback is authorized.

## Scope

- Capture/pick an image, save it in the authenticated owner's encrypted local queue, then call the existing image-only `POST /api/extract` route.
- Persist the server extraction result, editable receipt draft, status, and server-issued scan ID in the encrypted queue. Expo drafts stay partitioned under `expo:<userId>`.
- Inbox supports review, retry, and delete. Review reuses the existing draft conversion and hard-flag/outlet checks.
- Require an explicit Check action before Send. Send calls the existing `POST /api/sheets/append` route with `expectedUserId` from the server session and the server-issued scan ID. Ownership, workspace, plan, credit, and Sheet rules remain server-side.
- Do not call extraction or append until the Expo Web session resolves to a real signed-in user. Do not add Google logic to the image-extraction route or trust a client-supplied user ID as identity.

## Acceptance and verification

- Deterministic tests cover review validity, missing line/price/outlet, hard-flag edit/acknowledgment, and the no-append-before-Check gate.
- Expo typecheck, Expo web export, root typecheck/build, and encrypted storage tests pass.
- Signed-out browser routes show real sign-in and issue no extract/append request. No real account or Sheet was used by automation.
- After OAuth callback registration, the owner can sign in from the Mac and verify capture, extraction, review, retry/delete, and the append request. Do not submit a real Sheet append from automated verification.
- Native SQLCipher/SQLite storage has matching metadata fields in source, but native runtime verification remains deferred.

## Known gates

- Local Google OAuth currently returns `redirect_uri_mismatch` for `https://susi.tail6078b4.ts.net:39876/api/auth/callback`. Register that exact URI in the Google OAuth web client before Mac login can complete.
- The existing Next.js review/acknowledgment gates are enforced in client UI, not by a server-issued review token. Preserve the explicit Check step; do not claim the API independently proves a review occurred.
- `/app/wa-mock` is excluded: its fixture can be appended to a real Sheet. Admin remains separate and server-authorized.
- No real Google/Sheet/billing/Production actions were performed. Mac native builds and camera checks are outside this slice.
