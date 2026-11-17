# TASK-020 — Authenticated Expo web app parity

**Status:** Functional Expo Web screen/API parity is implemented for the non-admin app. Visual parity with the intended v2 HTML is not done; real OAuth and Mac verification remain blocked. Native Android/iOS work is deferred at the owner's request.

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
- Home, Capture, Inbox, Sheet setup, Settings, Space/invites, TopUp/QRIS/order, device management, and supported integrations are ported in TASK-023/TASK-024. Authenticated mutations remain unverified until OAuth works; no WA mock or admin route is exposed.
- Visual design remains open. The owner plans to add the intended HTML after pulling. `ZIPPP-Pivot-Kit/reference/ZIPPP-Prototype-v0.8.html` is browser-only and uses illustrative local data, simulated OCR, and no live cloud/payment/encryption; use it only as a visual reference, never as a data or behavior source.
- The local OAuth callback is `https://susi.tail6078b4.ts.net:39876/api/auth/callback`; Google returns `redirect_uri_mismatch`. Add this exact URI to the standard OAuth web client in Google Cloud Console. The `gcloud iam oauth-clients` API is only for Workforce Identity Federation: https://docs.cloud.google.com/iam/docs/workforce-manage-oauth-app. Do not bypass Google auth.
- Direct Mac check remains blocked: Tailscale reports `mms-macbook-pro-2` offline, last seen about one hour ago; the browser relay extension is not connected. Funnel serves a different local port (8788), not the Expo preview on 39876.
- Native screen behavior, SQLCipher, SecureStore, camera, and Android/iOS binaries remain deferred until web parity is complete.

## Acceptance

- Signed-out Expo Web shows real Google sign-in; `/api/auth/session` reports `signedIn:false` and no local-preview identity. After authorized OAuth configuration, login returns to `/rn` with the server-owned user session.
- All existing real user-facing app screens listed above have working Expo web routes and use existing authenticated Next.js APIs.
- Receipt capture uses server-issued extraction data, displays editable review, and appends only after explicit user acceptance. Owner, scan, workspace, credit, and billing checks remain server-side.
- No synthetic user/account data or mock receipt path is exposed.
- Local Tailnet preview is verified on the Mac once its connectivity and OAuth callback configuration are available.
- Expo tests/typecheck/export and root typecheck/build pass; record results and update `STATE.md` after each slice.
