# TASK-021 — Expo Web receipt flow results

**Status:** Capture, encrypted queue, review, and append wiring are implemented. Authenticated end-to-end use is not yet verified because Google rejects the Tailnet OAuth callback URI.

## Delivered

- Expo Web capture stores the image under the real session owner's encrypted `expo:<userId>` namespace, then posts only the image to the existing `/api/extract` route.
- Extraction status, receipt, editable draft, and server-issued `scanId` are persisted with the encrypted queue item. The server scan ID is reused for idempotent append.
- Inbox supports queue status, retry, delete, and editing receipt fields. Existing review-ops rules cover hard flags and required outlet selection.
- The Check action validates and persists the edited draft. Send stays disabled until Check succeeds and then calls `/api/sheets/append` with the session owner ID and server scan ID. The server remains authoritative for ownership, workspace, plan, credits, and Sheet writes.
- A local-preview identity returned by the session API is treated as signed out by Expo Web; it cannot trigger extraction or append from the RN web UI.

## Verification

| Check | Result |
|---|---|
| Expo tests | 9 passed, including local-preview rejection, review validity, missing line/price/outlet, hard-flag acknowledgement, and no append before Check |
| Encrypted storage tests | 17 passed across `src/lib/batch-db.test.ts` and `src/lib/draft-crypto.test.ts`, including scan ID encryption round-trip |
| Expo TypeScript check | Passed |
| Expo static web export and `/rn` copy | Passed |
| Root `npx tsc --noEmit` and `npm run build` | Passed |
| Android/iOS Metro JS bundle exports | Passed; these are JS bundles only, not native builds or runtime checks |
| Browser, `/rn`, `/rn/capture`, `/rn/inbox`, signed out | Google sign-in shown, no dummy identity, session returned `signedIn:false` and `localPreview:false`; only GET `/api/auth/session`, no extraction or append; no browser errors |
| Google login initiation | OAuth route redirects to Google; Google reports `redirect_uri_mismatch` for `https://susi.tail6078b4.ts.net:39876/api/auth/callback` |
| Real user data or Sheet writes | None. No real account signed in and no append/payment/production call made |
| Native SQLCipher, SecureStore, camera, device builds | Deferred per owner; not tested |

## Remaining gates

- Register the Tailnet callback URI with the Google OAuth web client, then verify sign-in from the owner's Mac without bypassing authentication.
- Authenticated capture, review, and append still require an owner-controlled test session. Automated checks did not write to a real Sheet.
- Sheet setup, Settings, Space, TopUp/QRIS/order, devices, and integration screens remain to be ported. Do not port `/app/wa-mock`, which can append a synthetic fixture to a real Sheet.
