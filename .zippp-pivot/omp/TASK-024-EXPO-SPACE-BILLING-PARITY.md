# TASK-024 — Expo Web Space and payment parity

**Status:** Implemented and verified for route/build and signed-out behavior. Authenticated Space and payment actions were not exercised because the Tailnet Google OAuth callback is still rejected.

## Scope

- Port Space selection, creation, members, invites, assets/goals, and invite acceptance to Expo Web.
- Port the existing Indonesia GoPay/QRIS and international Paddle top-up flows, plus QRIS and GoPay order status routes.
- Keep server APIs authoritative for identity, invite-aware limits, payment availability, order ownership, and credit grants. Only explicit user actions may create orders, open checkout, claim payment, cancel, invite, or mutate Spaces.
- Keep server-only Paddle credentials out of browser payloads. Do not expose admin or WhatsApp mock routes.
- Do not sign in, create a Space, send an invite, create an order, open checkout, or call production payment services in verification.

## Verification

- Run root and Expo tests/typechecks, Expo static export/copy, root TypeScript/build.
- Verify Expo static routes and signed-out API boundaries in a real browser without account data.
- Update `STATE.md` and the canonical context for the additive top-up config/QRIS response contract.
