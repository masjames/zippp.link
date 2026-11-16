# TASK-013 Results: Local Dummy Web Preview

**Date:** 2026-11-16  
**Status:** Complete  
**Scope:** Development-only local UI access. No Google, Sheets, Drive, billing, Preview, or Production credentials or requests.

## Change

- Added `ZIPPP_LOCAL_DUMMY_AUTH=1` gated by `NODE_ENV=development` and disabled on Vercel. The dummy identity is limited to loopback, Tailscale IPv4, or the exact `ZIPPP_LOCAL_DUMMY_HOST`.
- `/api/auth/me` and `/api/auth/session` return the synthetic `local-preview-user` for UI bootstrap only. Server `currentUser()` and `resolveRequestUser()` remain unauthenticated.
- In dummy mode, middleware permits only the two auth-bootstrap GETs. All other API calls and non-GET actions return 403. App bootstrap skips workspace/billing calls; `/app/inbox` is available without a Google sheet. The shell labels the dummy mode.
- Production builds and Vercel cannot enable the dummy identity.

## Verification

- `npm test`: 117 passed, 0 failed.
- `npx tsc --noEmit`: passed.
- `npm run build`: passed in a sanitized isolated workspace.
- Tailnet development preview: `https://susi.tail6078b4.ts.net:39876/app/inbox`, bound to the Tailscale IP and launched with a clean environment. No `.env` files or credentials were copied.
- Browser: Inbox rendered with the local dummy banner; `window.isSecureContext` and `crypto.subtle` were available; IndexedDB stored a non-extractable AES-GCM key for `local-preview-user`.
- API safety: `/api/auth/me` returned the dummy identity; append, extraction, and billing endpoints returned 403. No external service calls.

## Access and limits

- The preview certificate is self-signed. The Mac browser must explicitly accept its certificate warning. Direct Mac browser verification was unavailable because the browser relay could not connect; the Mac Tailscale peer responded to ping and the host-local HTTPS endpoint loaded in the managed browser.
- The dummy preview is UI-only. Upload extraction, Sheets writes, billing, Google OAuth, and other server API actions are disabled. For the full local app on Mac, pull `origin/v2`, then run the native and device checks separately.
- Native FEAT-102 / FEAT-115 device checks, FEAT-118 phone screenshots, Phase 3 Space proof, and protected owner gates remain open.
