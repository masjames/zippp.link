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

The existing Expo routes are Home, Capture, and Inbox. Capture and Inbox currently save and preview encrypted local images only. The existing Next.js app also has Snap/review/append, Sheet settings, Space settings, account settings, TopUp/QRIS/order status, device management, and integration panels. These remain to be ported to Expo Web using existing server-side ownership and billing checks. Do not port `/app/wa-mock`; its fixture can be written to a real Sheet.

No native Android/iOS build, SQLCipher, SecureStore, or camera behavior is claimed. Those checks remain deferred on the owner's Mac.
