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
- [x] M3 Web UI
- [x] M4 Eraser renderer
- [x] M5 Verifier
- [x] M6 Terminal bridge
- [x] M7 Self-test and handover

## Gate log

M0: pass. Baseline recorded. Root `tsc` matches baseline. Commit f3f08ee.
M1: pass. `DAEMON OK`. Health 200, bad Host 403, bad Origin 403. Commit 7d75fa0.
M2: pass. `DAEMON OK`. Parse, store, diff, rewrite, and WebSocket lifecycle tests pass. Commit 4df56a5.
M3: pass. `FACTORY CHECK OK`. Root `tsc` and 43 tests match baseline. Commit bc37517.
M4: pass. `FACTORY CHECK OK`. Local SVG ERD renderer. Native packages 404. Commit a4b1d83.
M5: pass. `DAEMON OK`. Static, model, test, prod, queue, reports, and race tests pass. Commit 939d6d5.
M6: pass. `DAEMON OK`. nvim remote bridge, focus command, and path guard tests pass. Commit 95777b9.
M7: pass. `FACTORY CHECK OK`. Root tsc pass, 43 tests, build pass. Live FEAT-900 reached done and was restored to todo. Commit eeb2a3a.

Post-M7: debug panel. FACTORY CHECK OK. Web tests 27 pass. Root tsc pass, 43 tests pass. Commit 7f0023d.
Post-M7 fix: index only entity subdirs. FACTORY CHECK OK. Root tsc pass, 43 tests pass. Commit 38fb761.
Post-M7 UI: task-first Kanban with search, Spec/Diagram/Gap detail tabs, system Gap view. FACTORY CHECK OK. Web tests 34 pass. Root tsc pass, 43 tests pass. Commit 3276980.
Post-M7 design: live/planned system, ERD, and user flow entities. Design view, Spec/Diagram/Groom/Gap tabs, flow renderer, and enriched task specs. FACTORY CHECK OK. Web tests 49 pass. Root tsc pass, 43 tests pass. Commit 3d353d2.
Post-M7: removed the Neovim terminal bridge and editor config. Markdown is read inline. FACTORY CHECK OK. Web tests 49 pass. Root tsc pass, 43 tests pass. Commit 3bcd509.
Post-M7 diagrams: Mermaid live/planned system, ERD, and user flow. All 15 cards pass grooming. FACTORY CHECK OK. Web tests 52 pass. Root tsc pass, 43 tests pass. Commit 8084c9d.
Post-M7 UI: collapsible and full-width detail pane. Full screen toggle on every diagram. FACTORY CHECK OK. Web tests 52 pass. Root tsc pass, 43 tests pass. Commit c9857de.
Post-M7 UI: left arrow rail for detail controls. Fullscreen diagrams fit the viewport without scroll. FACTORY CHECK OK. Web tests 52 pass. Root tsc pass, 43 tests pass. Commit ea30e08.
Post-M7 UI: detail pane starts collapsed. Clicking outside a task card clears the selection and collapses the pane. FACTORY CHECK OK. Web tests 52 pass. Root tsc pass, 43 tests pass. Commit 6d05e28.
