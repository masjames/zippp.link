# Zippp Software Factory

This directory is the workspace for the next-generation Zippp Software Factory:
a local-first Product OS that turns markdown entities into a live graph and
verifies them against the real codebase.

**Authoritative design:** [`zippp-software-factory-master-spec-mac.md`](./zippp-software-factory-master-spec-mac.md)  
**Self-contained handoff:** [`zippp-context-for-claude.md`](./zippp-context-for-claude.md)

## What lives here

```text
spec/themes/03-zippp-software-factory/
├── README.md
├── zippp-context-for-claude.md
├── zippp-software-factory-master-spec-mac.md
├── entities/
│   ├── README.md
│   ├── direction/     # DIR-* — north star (Direction tab)
│   ├── decisions/     # DEC-* — locked calls
│   ├── roadmap/       # ROAD-* — phased path
│   ├── features/      # FEAT-*
│   ├── bugs/          # BUG-*
│   ├── stories/       # STORY-*
│   ├── diagrams/      # DIAG-* / FLOW-* / ERD-*
│   └── threads/       # grooming (not indexed)
└── templates/
    ├── entity.md
    └── strategy.md
```

## UI tabs

| Tab | Entity types | Job |
|---|---|---|
| **Direction** | `direction`, `decision`, `roadmap` | Where we are going — read before Tasks |
| **Tasks** | `feature`, `bug`, `story` | Build and verify work |
| **Design** | `diagram` | Flows and system maps |

## Indexing convention

The master spec says every markdown file in `spec/` carries YAML frontmatter.
For usability, the factory indexes **only**:

```text
spec/themes/03-zippp-software-factory/entities/{direction,decisions,roadmap,features,bugs,stories,diagrams}/**/*.md
```

Long-form product specs, architecture docs, session logs, reviews, and archives
remain prose. They are linked from the entity body when needed. This prevents
every large spec from becoming a Kanban card.

This is an intentional implementation convention. If the Go indexer is later
required to scan all of `spec/`, add frontmatter to the prose docs at that time.

## Entity contract

Every entity file starts with:

```yaml
---
id: FEAT-012
type: feature # direction | decision | roadmap | feature | bug | story | diagram
title: Short human title
status: todo # todo | in-progress | blocked | verify | done
assignee: adit # or pi-agent
relations:
  blocks: []
  implements: []
  depends_on: []
verification:
  target_files: []
  test_command: ""
  prod_endpoint: ""
---
```

Then the markdown body. Tasks: [`templates/entity.md`](./templates/entity.md).  
Strategy cards (DIR/DEC/ROAD): [`templates/strategy.md`](./templates/strategy.md).

## Verification contract

When an entity moves to `status: verify`, the Go verifier must:

1. Read `verification.target_files`.
2. Scan those files for a trace ID comment such as `// @implements FEAT-012`.
3. Run `verification.test_command` and require exit code `0`.
4. If `verification.prod_endpoint` is set, make an HTTP GET and require 200 or
   the expected JSON shape.
5. Only then rewrite frontmatter to `status: done`.

## Factory topology (from the master spec)

- **Backend:** Go, `fsnotify` / macOS FSEvents, WebSocket `ws://localhost:8080/ws`.
- **Frontend:** React + Vite + Tailwind + DaisyUI.
- **Diagrams:** `eraserlabs/eraser-diagrams` from ` ```eraser ` blocks.
- **Terminal bridge:** WebSocket message focuses the file in Neovim inside Herdr.
- **State:** local files only. No Postgres, SQLite, or Redis for factory state.

## Build order for Pi

1. Go daemon skeleton + `fsnotify` + WebSocket static payload.
2. React Vite 3-pane UI (list, Kanban, markdown).
3. Eraser diagram renderer.
4. `verifier.go` with shell execution and trace-ID scanning.
5. Dummy entity proving static, dynamic, and production verification.

## Non-goals

- No external database.
- No cloud queue.
- No factory state in Redis.
- No product receipt data in factory entities.
