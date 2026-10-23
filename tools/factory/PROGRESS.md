# Factory progress

## Baseline

- 2026-10-23 `npm test`: 43 passing, 0 failing.
- 2026-10-23 `npx tsc --noEmit`: pass, no output.
- Host: Go 1.26.6, Node 23.9.0, npm 10.9.2, nvim 0.11.3, port 8080 free.
- Branch: `factory/software-factory`.

## Milestones

- [x] M0 Preflight
- [x] M1 Daemon skeleton
- [x] M2 Spec index
- [ ] M3 Web UI
- [ ] M4 Eraser renderer
- [ ] M5 Verifier
- [ ] M6 Terminal bridge
- [ ] M7 Self-test and handover

## Gate log

M0: pass. Baseline recorded. Root `tsc` matches baseline. Commit f3f08ee.
M1: pass. `DAEMON OK`. Health 200, bad Host 403, bad Origin 403. Commit 7d75fa0.
M2: pass. `DAEMON OK`. Parse, store, diff, rewrite, and WebSocket lifecycle tests pass. Commit 4df56a5.
