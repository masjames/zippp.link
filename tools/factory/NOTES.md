# Factory notes

One line per decision. Contracts live in the Pi brief.

- M0: baseline is 43 passing tests and a clean root `tsc`.
- M0: port 8080 is free; the smoke test can use it.
- M0: `tsconfig.json` is clean, so the one-line `tools/factory` exclude is staged explicitly. The brief's commit helper omits it.
- M0: the web package will commit `package-lock.json` for reproducible installs.
- M0: the theme 3 prose specs are pre-existing untracked user files. Only `entities/` is staged.
- Decision: when a human changes an entity status during verification, do not overwrite it. Log the race, store the result with `wrote_status: false`, and broadcast it so the UI clears the running state.
- Decision: omit the `model` check when the body has no ERD entities. This matches the expected three-check e2e for entities without an ERD.
- Decision: an ERD field passes when it appears in at least one target file where the entity declaration matched. Fields are not scoped to the declaration. This known limit is intentional.
- M4: the native Eraser probe returned 404 for both `@eraserlabs/eraser-diagrams` and `eraser-diagrams`. Ship the local SVG renderer only.
- M7: a read timeout corrupts a gorilla WebSocket connection. The e2e reconnects after the 2 second no-retrigger window before sending the manual verify message.
- Post-M7: added a Debug panel with copy report, resync, reconnect, clear log, WebSocket event log, and window error capture.
- Post-M7: the indexer now only reads features, bugs, stories, and diagrams. `entities/README.md` and other prose files are not parsed as entities.
- Post-M7 UI: removed the left entity list and the Dependencies view. Tasks is the only Kanban view, with search. Detail tabs are Spec, Diagram, and Gap. The Gap tab and Gap view show planned vs current. The Diagram tab shows the real eraser block and a relation map. Edit in Terminal is now Open spec in Neovim, with a hint.
- Post-M7 design: added DIAG-001, ERD-001, and FLOW-001 with live and planned blocks. The Design view compares live and planned. The Detail pane has Spec, Diagram, Groom, and Gap tabs. The nvim button is removed from the UI and the markdown reader is the Spec tab. Added a flow renderer and a spec grooming checklist. Enriched every seed task with what it is, goal, context, acceptance, verification, out of scope, and definition of done.
- Post-M7: removed the Neovim terminal bridge, the editor config block, the hub edit messages, and the web editor_result type. The UI reads markdown inline and the user edits files in Zed.
- Post-M7 diagrams: added Mermaid as a web dependency. DIAG-001, ERD-001, and FLOW-001 now use Mermaid live and planned blocks. All 15 cards pass spec grooming.
- Post-M7 UI: the detail pane can expand to full width and collapse. Every diagram frame has a Full screen toggle, with Escape to close.
- Post-M7 UI: detail controls moved to a left arrow rail. Fullscreen diagrams scale to fit the viewport and do not scroll.
- Post-M7 UI: the detail pane starts collapsed. Clicking outside a task card clears the selection and collapses the pane. Task cards and Gap rows keep the selection.
- Post-M7 grooming assistant: local LLM chat in the Groom tab. Threads persist at entities/threads/<ID>.md. Lines starting with DECISION: become decision blocks. The key is read from tools/factory/.factory-key or ZIPPP_FACTORY_LLM_API_KEY. The key file is ignored. Fixed a React StrictMode socket ref race.
- Post-M7: Groom is one header button. The Groom tab is a chat thread with user, assistant, and decision bubbles. The assistant must not write placeholder decisions. The initial FEAT-112 thread is committed.
- Post-M7 Kanban: blocked cards moved to a separate section above the flow. The flow columns are todo, groomed, in-progress, verify, done. The groomed column contains todo cards that pass spec grooming.
- Post-M7 grooming score: the primary percentage is required readiness. The overall percentage includes recommended items, so a ready card can show 100% required and under 100% overall.
- Post-M7: FEAT-102 has a Mermaid review flow diagram, so it now scores 100% overall. The Groom button is shown only for un-groomed cards; groomed cards show a groomed badge instead. The Groom tab chat remains available for follow-up questions.
