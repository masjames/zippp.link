---
id: FEAT-111
type: feature
title: Software Factory
status: done
assignee: adit
relations:
  blocks: []
  implements: []
  depends_on: []
verification:
  target_files: ["tools/factory/daemon/verifier.go"]
  test_command: "go -C tools/factory/daemon test ./..."
  prod_endpoint: ""
---

# What it is

The local-first Zippp Software Factory: a Go daemon that indexes markdown entities, a React command center, a local SVG diagram renderer, and a verifier that checks specs against code.

# Goal

Give the coding agent a task board that shows the real spec, the real diagram, the grooming gaps, and the gap between planned and current.

# Context

- `spec/themes/03-zippp-software-factory/zippp-factory-pi-brief.md`
- `spec/themes/03-zippp-software-factory/zippp-software-factory-master-spec-mac.md`
- `spec/themes/03-zippp-software-factory/zippp-context-for-claude.md` section 16.

# Acceptance criteria

- [ ] The daemon indexes only the four entity subdirectories.
- [ ] The watcher rescans on every debounced change.
- [ ] The WebSocket sends snapshot and diff messages with sequence numbers.
- [ ] The verifier runs static, model, test, and prod checks.
- [ ] The UI shows Tasks, Design, and Gap.
- [ ] The detail pane shows Spec, Diagram, Groom, and Gap.
- [ ] The Design view shows live and planned system, ERD, and user flow.
- [ ] The grooming tab reports required and recommended gaps.

# Verification

- Static trace ID: `// @implements FEAT-111`
- Target files: `tools/factory/daemon/verifier.go`
- Test: `go -C tools/factory/daemon test ./...`
- Production: none. The factory is local only.

# Out of scope

- Postgres, SQLite, Redis, or a cloud queue for factory state.
- Editing product code from the factory.
- A hosted multi-user deployment.

# Definition of done

The factory runs locally, shows the task board, renders the live and planned diagrams, grooms a spec, and verifies an entity from `verify` to `done`.

# Notes

The factory is built and committed. The next step is the human tactile test.
