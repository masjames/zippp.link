# TASK-020 — Expo real-auth web preview results

**Status:** Signed-out real-auth preview verified. Full authenticated screen parity is still in progress.

## Delivered

- Restarted the local Next.js preview with `ZIPPP_LOCAL_DUMMY_AUTH=0`; the served Expo web app no longer receives the synthetic `local-preview-user` identity.
- Expo `/rn` shows the real Google sign-in action when signed out. The same-origin session endpoint returned `signedIn:false` and `localPreview:false` in the isolated browser.
- The local login route returns a Google OAuth authorization redirect. The server is configured to return to `https://susi.tail6078b4.ts.net:39876/api/auth/callback` and then `/rn`.

## Verification

| Check | Result |
|---|---|
| Local Expo web route | `/rn` rendered Home and the Google sign-in action; no dummy-user banner or fake account data |
| Session API | `GET /api/auth/session`: HTTP 200, `signedIn:false`, `localPreview:false` |
| Login initiation | HTTP 307 to Google OAuth; no account credentials submitted |
| Google redirect URI | Google returned `redirect_uri_mismatch` for the Tailnet callback; that exact URI must be authorized in the Google OAuth web client before login can complete from the Mac |
| Local app server | Next.js dev server is ready on `https://susi.tail6078b4.ts.net:39876`; Expo web is mounted at `/rn` |
| Mac Tailnet access | Mac was online directly during one check, but later status showed it relayed/offline; Mac browser access was not observed |
| TLS | Current certificate is self-signed. `tailscale cert` was denied to this Linux user; no privilege escalation was attempted |
| Real account/data mutations | None. No Google account was signed in, no Sheet was read or changed, and no payment/billing operation was called |

## Remaining UI scope

- TASK-021 now wires capture, extraction, encrypted review, and explicit append. The remaining Expo parity work is the Sheet/Settings, Space, TopUp/QRIS/order, device, and integration screens; `/app/wa-mock` remains excluded because it can append a fabricated fixture.

No native Android/iOS build, SQLCipher, SecureStore, or camera behavior is claimed. Those checks remain deferred on the owner's Mac.
