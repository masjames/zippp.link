# Factory entities

**How to find anything (Covert):** name → group → sequence.  
**How to not think (Krug):** open **Direction** first.

| Folder | Type | Prefix | Job |
|---|---|---|---|
| `direction/` | direction | `DIR-*` | Where we are going (one north star) |
| `decisions/` | decision | `DEC-*` | Locked calls (one decision each) |
| `roadmap/` | roadmap | `ROAD-*` | Ordered phases |
| `features/` | feature | `FEAT-*` | Build work |
| `bugs/` | bug | `BUG-*` | Defects |
| `stories/` | story | `STORY-*` | Proof / E2E |
| `diagrams/` | diagram | `DIAG-*` / `ERD-*` / `FLOW-*` | Maps |

```text
Direction  →  Decisions  →  Roadmap  →  Tasks  →  Design / Gap
```

Only files in these entity subfolders are indexed. This README is not an entity.

Use `../templates/entity.md` for FEAT/BUG/STORY. Strategy cards stay short: Destination / Locked call, Why, Locked, Non-goals, Done when.

Do not put long-form specs, meeting notes, or archives here — those live elsewhere under `spec/`.

`threads/` holds grooming chats and is not indexed.

**Current north star:** `direction/DIR-001-zippp-space.md`
