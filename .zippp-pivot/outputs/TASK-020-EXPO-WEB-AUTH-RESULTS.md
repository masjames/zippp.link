# TASK-020 — Expo real-auth web preview results

- **Status:** Signed-out real-auth preview verified on Linux. Authenticated screen parity on the Mac remains blocked.

## Delivered

- Restarted the local Next.js preview with `ZIPPP_LOCAL_DUMMY_AUTH=0`; the served Expo web app no longer receives the synthetic `local-preview-user` identity.
- Expo `/rn` shows the real Google sign-in action when signed out. A fresh same-origin `GET /api/auth/session` returned HTTP 200 with `{ signedIn: false, userId: null }`; no synthetic identity was issued.
- The local login route is still configured for `https://susi.tail6078b4.ts.net:39876/api/auth/callback` and then `/rn`. The callback has not been registered in the standard Google OAuth web client.

## Verification

| Check | Result |
|---|---|
| Local Expo web route | `/rn` rendered Home and the Google sign-in action; no dummy-user banner or fake account data |
| Session API | `GET /api/auth/session`: HTTP 200, `{ signedIn: false, userId: null }`; no dummy identity |
| Login initiation | HTTP 307 to Google OAuth; no account credentials submitted |
| Google redirect URI | Google returned `redirect_uri_mismatch` for the Tailnet callback; that exact URI must be authorized in the Google OAuth web client before login can complete from the Mac |
| Cloud Console access | `https://console.cloud.google.com/apis/credentials` requires Google sign-in in the managed browser; no credentials were submitted and no OAuth client was changed |
| Local app server | Next.js dev server is ready on `https://susi.tail6078b4.ts.net:39876`; Expo web is mounted at `/rn` |
| Mac Tailnet access | `mms-macbook-pro-2` is active/direct. Its SSH host key matched the fingerprint observed over the Tailnet, but SSH login as `mm` was denied (publickey/password/keyboard-interactive). Browser relay remains disconnected; no auth/host-key bypass was used. Mac browser and authenticated flow remain unobserved |
| TLS | Current certificate is self-signed. `tailscale cert` was denied to this Linux user; no privilege escalation was attempted |
| Real account/data mutations | None. No Google account was signed in, no Sheet was read or changed, and no payment/billing operation was called |

## Remaining UI scope

- TASK-021 now wires capture, extraction, encrypted review, and explicit append. The remaining Expo parity work is the Sheet/Settings, Space, TopUp/QRIS/order, device, and integration screens; `/app/wa-mock` remains excluded because it can append a fabricated fixture.

No native Android/iOS build, SQLCipher, SecureStore, or camera behavior is claimed. Those checks remain deferred on the owner's Mac.
