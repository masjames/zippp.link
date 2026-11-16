# TASK-018 — Expo read-only Home results

**Status:** Web implementation verified with synthetic API tests and the local dummy preview. Real Google/Sheet data was not requested or called.

## Delivered

- Expo web uses the read-only `/api/auth/session` endpoint, which does not create billing/referral records.
- A local-preview session stops after that endpoint. It does not request a workspace or receipt summary.
- A real web session uses the server-provided user id for the existing workspace and legacy-summary GET routes. It never accepts a browser workbook id and performs no writes.
- Home handles no workspace, unsupported template, partial summary, errors, currencies, and the explicitly unavailable balance.
- Signed-out users use the existing Google login route. The Expo Inbox preserves the dummy empty state and links real users to the existing working Next.js Inbox until the local draft store is ported.

## Verification

| Check | Result |
|---|---|
| Expo Home data tests | 4 passed; local preview request boundary, owner-bound summary query, no workspace, unsupported template |
| Expo typecheck / SDK compatibility | Passed |
| Expo static web export under `/rn` | Passed |
| Root `npx tsc --noEmit` / `npm run build` | Passed |
| Tailnet browser, 390×844, English and Indonesian | Home and Inbox navigation/reload passed; no console/page errors |
| Dummy API requests | Only `GET /api/auth/session` on Home/Inbox; no workspace, summary, Google, Sheet, or mutation request |
| Native auth / Android / iOS | Not run; Mac/device verification remains pending |

No real Google account, Sheet, Drive, billing, or production service was accessed. The authenticated summary path is verified with synthetic tests only.
