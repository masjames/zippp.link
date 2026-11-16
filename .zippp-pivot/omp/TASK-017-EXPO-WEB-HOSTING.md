# P2.2 — Expo web under the existing Next.js origin

**Status:** In progress.  
**Goal:** Serve the Expo web client under `/rn` on the existing Next.js origin so it can later reuse the server-owned web session without CORS or new OAuth scopes.

## Scope

- Export Expo Router with `experiments.baseUrl: "/rn"`.
- Copy the generated static output into ignored `public/rn/` through an explicit development script.
- Keep the existing Next.js routes and production build path unchanged.
- Do not call auth, Google, Sheets, Drive, billing, or mutation APIs in this slice.

## Acceptance

- `npm run expo:web:copy` succeeds with Node 22.
- Next dev serves `/rn/` and `/rn/inbox` with Expo assets resolving under `/rn`.
- Browser confirms both routes and navigation on the same origin, no console errors.
- No generated Expo output is committed; update `.zippp-pivot/omp/STATE.md` and add results under `.zippp-pivot/outputs/`.
