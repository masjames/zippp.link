# TASK-017 — Expo web same-origin hosting results

**Status:** Verified locally on the Next.js origin. No production routing or release change.

## Delivered

- Configured Expo Router `experiments.baseUrl` as `/rn`.
- Added `npm run expo:web:copy` to export the Expo web app and copy generated files to `public/rn/`.
- Ignored generated `public/rn/` output; the app bundle is not committed.
- Added Next.js rewrites for `/rn` and `/rn/inbox` to their static Expo HTML routes. API routes remain unchanged.

## Verification

| Check | Result |
|---|---|
| `npm run expo:web:copy` under Node 22 | Passed; static bundle copied to `public/rn/` |
| Root `npx tsc --noEmit` | Passed |
| Root `npm run build` | Passed; TypeScript and 105 static routes completed |
| Browser at the Next.js origin, 390×844 | Passed; Home and Inbox navigate and reload at `/rn` and `/rn/inbox`; no console errors |
| Tailnet preview `https://susi.tail6078b4.ts.net:39876/rn` | Passed after restarting the dev server to load the new rewrite and public files |

The first check against the already-running dev server returned 404 because it had started before the static files and rewrite existed. Restarting that preview service loaded the new route. No auth, Google, Sheets, Drive, billing, or mutation APIs were called.

The Expo client still uses the disconnected local preview. Authentication, real Sheet totals, capture, persistence, OCR, native builds, and production routing remain separate tasks. Native verification remains on the owner's Mac.
