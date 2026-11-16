# TASK-013: Local Dummy Web Preview

**Status:** COMPLETE. Dummy identity is development-only and explicitly opt-in. The Mac-facing preview uses no `.env` credentials and blocks application API actions.

## Objective
Bypass OAuth for the local web UI only, so the owner can inspect the app from a Mac over Tailscale. Do not make the dummy user a server-authenticated account.

## Safety contract
- Enable only with `NODE_ENV=development`, `ZIPPP_LOCAL_DUMMY_AUTH=1`, and a loopback/Tailscale host. `ZIPPP_LOCAL_DUMMY_HOST` permits the exact Tailscale MagicDNS hostname. Production and Vercel never issue the dummy identity.
- `/api/auth/me` and `/api/auth/session` expose a clearly labeled `local-preview-user` only for the local UI bootstrap.
- `currentUser()` and `resolveRequestUser()` remain unauthenticated in dummy mode. Middleware blocks all other API requests and non-GET actions. No Sheets, Google OAuth, Drive, billing, extraction, or production operation can run from this preview.
- App bootstrap skips workspace and billing fetches; the app bypasses the no-workspace redirect only for the dummy identity. The UI labels the mode and local drafts remain in this browser's encrypted IndexedDB.

## Verification
Use no credentials and synthetic local data. Run `npm test`, `npx tsc --noEmit`, and `npm run build`. Verify the dummy identity on loopback and Tailscale hosts, production/Vercel disablement, API write rejection, Inbox rendering, and secure-context draft-key initialization.

## Limits
The tailnet preview uses a temporary self-signed certificate because Tailscale certificate issuance requires host privilege unavailable to this session. A Mac browser may require an explicit certificate-warning bypass. This does not alter Tailscale Funnel or Production configuration.
