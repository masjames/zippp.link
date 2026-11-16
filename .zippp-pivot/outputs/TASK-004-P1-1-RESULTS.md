# TASK-004 — P1.1 Verification Results

**Date:** 2026-11-15  
**Baseline:** `v2` at `9799859786d238c3796910cbacbe01cb62d51d78`  
**Status:** PASS — P1.1 verified with synthetic fixtures; focused tests, full tests, typecheck, and isolated production build passed.

## Completed checks

| Command | Exit | Result |
|---|---:|---|
| `node --experimental-transform-types --loader ./scripts/ts-loader.mjs --test src/lib/cashflow/model.test.ts` | 0 | 4 passed, 0 failed. Synthetic values only. |
| `npm test` | 0 | 83 passed, 0 failed, 0 skipped, including the new model tests. |
| `npx tsc --noEmit` | 0 | Passed. |

Tests/typecheck used the SHA-256-verified temporary Node.js 23.9.0/npm 10.9.2 toolchain, an isolated environment, and offline mode. Missing locked packages were temporarily supplied for typecheck and unlinked afterward. The build used a disposable workspace; npm install accessed the package registry with lifecycle scripts disabled, and the build itself ran offline.

## Build

| Command / setup | Exit | Result |
|---|---:|---|
| `npm ci --ignore-scripts --no-audit --no-fund` in disposable workspace | 0 | Installed 242 packages from the lockfile; lifecycle scripts disabled. |
| `npm run build` in disposable workspace | 0 | Next.js 16.3.8 Turbopack production build completed and emitted the route summary. |

The workspace excluded `.env*`, `.vercel`, `.npmrc`, `.git`, `node_modules`, and the existing `.next`. The original checkout's `.next` and `node_modules` were preserved.

Two setup attempts did not reach a successful build: an external `node_modules` symlink was rejected by Turbopack; a later npm cache on tmpfs ran out of space (`ENOSPC`). The final disposable workspace kept dependencies and the npm cache on the project filesystem and passed. No deployment, payment, Google Sheets, Drive, or customer-data operation occurred.

## Change boundary

P1.1 adds pure domain types/guards and synthetic tests, and registers the test in `package.json`. No Sheet, API, persistence, UI, cache, auth, billing, OAuth/Drive, or production changes.
