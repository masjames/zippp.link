# TASK-023 — Expo Web Sheet and account Settings

**Status:** Implemented and verified for static/signed-out behavior. Authenticated API workflows still require the real Google callback to be registered.

## Scope

- Port Sheet discovery, existing-sheet selection, template selection, explicit sheet creation, and connected-sheet actions to Expo Web at `/rn/sheet`.
- Port account Settings at `/rn/settings`: language, balance/plan, device pairing and revocation when the mobile API is enabled, Telegram, and live WhatsApp integration.
- Reuse existing authenticated Next.js APIs. Keep fake identities disabled. Never expose `/app/wa-mock`; reject a mock-mode WhatsApp link response.
- Do not create or modify a Sheet, initiate a payment, or change production data during verification.

## Verification

- Expo unit tests, typecheck, and static web export.
- Root TypeScript check and production build.
- Browser verification of `/rn/sheet` and `/rn/settings` while signed out, including navigation, mobile layout, API requests, and console errors.
- Update `STATE.md` with completed slice and the next parity work.
