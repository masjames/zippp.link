# TASK-002 — P0.2 Baseline Verification

**Date:** 2026-11-15  
**Checkout:** `v2` / `9799859786d238c3796910cbacbe01cb62d51d78`  
**Result:** PASS after temporary local toolchain setup. Initial host checks could not run tests because Node.js/npm were unavailable; follow-up runs passed 79 unit tests and typecheck.

## Baseline evidence

| Command | Exit | Observed result |
|---|---:|---|
| `git status --short --branch` | 0 | `## v2...origin/v2`; no modified or untracked files reported. |
| `git diff --stat` | 0 | Empty; no tracked working-tree diff. |
| `git --version` | 0 | `git version 2.47.3` |
| `node --version`, `npm --version` | 127 initially | Neither command was initially on PATH; follow-up used temporary Node.js `v23.9.0` and npm `10.9.2` from the official release archive, SHA-256 verified. |
| `npm test` | 127 initially; 0 follow-up | Initial run could not start. Follow-up passed all 79 tests, 0 failed. |
| `npx tsc --noEmit` | 127 initially; 0 follow-up | Initial run could not start. Follow-up typecheck passed. |

The host has no Node.js/npm, `tsc`, Java, or Gradle on PATH. To unblock only the local baseline checks, Node.js `v23.9.0` and bundled npm `10.9.2` were unpacked under `/tmp` after verifying the official archive SHA-256. Existing `node_modules` lacked eight packages required by `tsc`; exact package-lock versions were installed to a separate temporary prefix with lifecycle scripts disabled, and temporary symlinks were removed after typecheck. Test and typecheck commands ran with an isolated environment (`env -i`) and npm offline mode. The 79 unit tests passed using local test fixtures. No application, architectural, or configuration files or package lock were changed. No deployment, payment, Google Sheets, Drive, or customer-data operation was performed.

## Follow-up execution

| Command / setup | Exit | Observed result |
|---|---:|---|
| Official Node archive SHA-256 verification | 0 | `node-v23.9.0-linux-x64.tar.xz` verified against the release `SHASUMS256.txt`. |
| `node --version` / `npm --version` | 0 | `v23.9.0` / `10.9.2`, temporary runtime under `/tmp`. |
| `npm test` (isolated environment, offline mode) | 0 | 79 passed, 0 failed, 0 skipped. |
| `npx tsc --noEmit` (isolated environment, offline mode) | 0 | Passed with temporary package links; links removed on exit. |

The first typecheck attempt exited 1 because those eight locked packages were absent from the existing `node_modules`; the successful follow-up supplied them only from a temporary dependency prefix.

## Baseline identity note

TASK-001 records `feat/121-import-statements` at `04268ef273ec40680a43f15a95b0be6f0e69f3c1`. The P0.2 checks above were run against the current `v2` checkout at `9799859786d238c3796910cbacbe01cb62d51d78`, following the requested v2 work context. Results are specific to that commit and do not verify the TASK-001 commit.

## Next action

Owner confirmed `v2` at `9799859786d238c3796910cbacbe01cb62d51d78` as the canonical baseline and accepted the P0.3 planning directions. P1.1 now proceeds under the separately authorized `.zippp-pivot/omp/TASK-004-P1-1-DOMAIN-MODELS.md`.
