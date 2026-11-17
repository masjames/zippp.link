# TASK-024 — Expo Web Space and payment parity results

**Status:** Implemented; build and signed-out route verification passed. Authenticated Space/payment workflows remain unverified because Google rejects the Tailnet callback URI.

## Changes

- Added Expo `/space` and `/join`: Space list/create, member view/removal/leave, invite link generation/copy, asset/goal add/edit/archive, and explicit invite acceptance. Invite links now use `/rn/join`.
- Added Expo `/topup`, `/topup/qris/[id]`, and `/topup/order/[id]`. Indonesia uses server-reported GoPay/QRIS availability, invite-aware limits, presets and credit conversion. International checkout uses Paddle.js with only public client fields and a real authenticated user ID; checkout opens only on explicit click.
- Added authenticated `GET /api/topup/config`. It returns only UI configuration and a whitelisted Paddle client payload. It never returns `apiKey` or `planPriceId`. Existing Next TopUp props are also sanitized; browser components no longer import the mixed server billing config module.
- Added server-calculated QRIS credits to the status response. Rewrites serve Expo static routes; legacy `/join` and Kasera's `/app/topup/qris/:id` return to Expo.
- Updated the canonical context with the new top-up config contract.

## Verification

| Check | Result |
|---|---|
| Root tests | 121 passed, including Paddle client-config whitelist regression |
| Expo tests | 9 passed |
| Expo TypeScript check | Passed |
| Expo Web export/copy | Passed; Space, Join, TopUp, QRIS, and GoPay routes exported |
| Root TypeScript check | Passed |
| Root production build | Passed; only existing middleware deprecation warning |
| Signed-out browser routes | Space, TopUp, QRIS, GoPay, and Join rendered; only auth-session reads on protected screens |
| Legacy return routing | `/join` and `/app/topup/qris/:id` reached the Expo routes |
| TopUp config without auth | HTTP 401, `Cache-Control: no-store`, no configuration fields |
| Browser console | No errors |

No real account was used. No Space, invitation, Sheet, Drive, payment order, checkout, credit grant, or production mutation was performed. Authenticated business flows and direct Mac access remain unverified. Tailscale reports `mms-macbook-pro-2` offline (last seen about one hour ago); the browser relay is not connected. The existing Funnel endpoint maps to port 8788, not this preview.
