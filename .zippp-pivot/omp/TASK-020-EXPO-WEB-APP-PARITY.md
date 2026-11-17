# TASK-020 — Authenticated Expo web app parity

**Status:** In progress. Web preview is running in real-auth mode; OAuth callback registration and screen parity remain incomplete. Native Android/iOS work is deferred at the owner's request.

## Goal

Finish the Expo Router web client under `/rn`, hosted by the local Next.js server on Linux and reachable from the owner's Mac over Tailscale. Preserve the existing Next.js server APIs and real Google-session identity. No fake account, fake receipt, or login bypass in the exposed web app.

## Existing app surfaces to port

- Home and receipt summary.
- Receipt capture, queue/Inbox, extraction review, explicit acceptance, and append.
- Sheet connect/create/select settings.
- Account settings, devices, and server-backed integration panels.
- Space settings and member/asset interactions already present in Next.js.
- Top-up, QRIS, and order status screens already present in Next.js.

Do not expose `/app/wa-mock`: its fixture can be appended to a real Sheet. Keep admin routes separate and server-authorized. Do not invent new Spaces, payment, or integration behavior beyond existing contracts.

## Auth and data rules

- Keep `ZIPPP_LOCAL_DUMMY_AUTH` disabled for the exposed preview.
- Expo Web uses the same-origin `/api/auth/session` and Google OAuth cookie session. Server APIs remain the authority for user identity, ownership, billing, credits, and Sheet writes.
- Store and load local drafts only under the authenticated server user ID. Never accept a client-supplied ID as authentication.
- Preserve the explicit review/accept step before Sheet append. Never auto-send, invent receipt values, or put extraction/append logic in the client.
- Automated verification must not sign in to a real account, create/modify a real Sheet, top up, charge, or invoke production services.

## Known blockers and gaps

- TASK-021 now wires Expo capture to server extraction, encrypted review persistence, Check, and explicit append. Authenticated Mac E2E remains blocked by OAuth redirect configuration.
- Home, Capture, and Inbox are in Expo Web. Sheet setup, Settings, Space, TopUp/QRIS/order, device, and integration screens remain to port using existing APIs.
- The local OAuth callback is set to `https://susi.tail6078b4.ts.net:39876/api/auth/callback`; Google currently returns `redirect_uri_mismatch`. Add this exact URI to the configured Google OAuth web client before a Mac browser can complete sign-in. Do not bypass Google auth.
- HTTPS uses a temporary self-signed certificate; Mac browser access may require accepting its warning. Tailscale currently shows the Mac intermittently offline.
- Native screen behavior, SQLCipher, SecureStore, camera, and Android/iOS binaries remain deferred until web parity is complete.

## Acceptance

- Signed-out Expo Web shows real Google sign-in; `/api/auth/session` reports `signedIn:false` and no local-preview identity. After authorized OAuth configuration, login returns to `/rn` with the server-owned user session.
- All existing real user-facing app screens listed above have working Expo web routes and use existing authenticated Next.js APIs.
- Receipt capture uses server-issued extraction data, displays editable review, and appends only after explicit user acceptance. Owner, scan, workspace, credit, and billing checks remain server-side.
- No synthetic user/account data or mock receipt path is exposed.
- Local Tailnet preview is verified on the Mac once its connectivity and OAuth callback configuration are available.
- Expo tests/typecheck/export and root typecheck/build pass; record results and update `STATE.md` after each slice.
