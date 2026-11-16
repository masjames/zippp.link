# TASK-008 — Preserve Unknown Receipt Dates

**Status:** WEB VERIFIED — synthetic tests, typecheck, build, and browser review passed. Android source changed; native build/device verification is deferred to the owner's Mac.

## Problem
Before this task, web and Android review filled a missing receipt date with the capture/current date. An unknown date must remain empty unless the user supplies it.

## Scope
- Keep missing receipt dates empty through web and Android review and submission; keep user-entered dates.
- On web restoration, clear old automatically assumed dates while preserving dates the user edited.
- Update correction telemetry, remove obsolete assumed-date UI/copy, and update the canonical context contract.
- No Sheet migration, real-user data access, billing, OAuth, or deployment changes.

## Verification

See `.zippp-pivot/outputs/TASK-008-UNKNOWN-RECEIPT-DATES-RESULTS.md` for commands, synthetic browser evidence, and the deferred Android verification.
