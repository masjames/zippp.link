# TASK-023 — Expo Web Sheet and account Settings results

**Status:** Implemented; build and signed-out browser verification passed. Authenticated workflows remain unverified because the Tailnet Google OAuth callback is still rejected.

## Changes

- Added Expo `/sheet` with real-session gating, existing-sheet discovery/selection, the current template choices, user-triggered creation only, and connected-sheet actions. Home and Inbox now link to this Expo route.
- Added Expo `/settings` with language selection persisted through the existing `zippp_lang` cookie, real server-backed balance/plan reads, explicit checkout, device list/revocation and pairing when enabled, Telegram linking, and live WhatsApp linking only. Mock WhatsApp mode is hidden and a mock response is rejected.
- Added the Expo navigation entries, static route rewrites, and localized Sheet/WhatsApp wording. No Next.js API contract changed.

## Verification

| Check | Result |
|---|---|
| Expo tests | 9 passed |
| Expo TypeScript check | Passed |
| Expo Web static export | Passed; `/sheet` and `/settings` exported |
| Root `npx tsc --noEmit` | Passed |
| Root `npm run build` | Passed; Next reported only its existing middleware deprecation warning |
| Browser `/rn/sheet` and `/rn/settings` | HTTP 200; real Google sign-in shown; five navigation links visible at mobile width |
| Signed-out network boundary | `/api/auth/session` only; no `/api/auth/me`, Sheets, billing, device, or integration calls |
| Browser console errors | None |

No Google account was signed in. No Sheet/Drive mutation, payment, or production call occurred. Authenticated Settings/Sheet actions were not exercised. Google OAuth still needs `https://susi.tail6078b4.ts.net:39876/api/auth/callback` registered in the configured web client. Mac-browser access was not verified by this browser run.
