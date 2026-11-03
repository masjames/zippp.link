---
id: ROAD-001
type: roadmap
title: Zippp Space phases
status: in-progress
assignee: adit
relations:
  blocks: []
  implements: ["DIR-001"]
  depends_on: ["DIR-001", "DEC-001", "DEC-002", "DEC-003", "DEC-004", "DEC-005"]
verification:
  target_files: []
  test_command: ""
  prod_endpoint: ""
---

# What it is

The only ordered path from the companion spike to Zippp Space.

# Why

Without phases, every FEAT looks equally urgent.

# Phases

1. **Orient** — DIR/DEC/ROAD visible in Factory. **Done.**
2. **Rewrite contracts** — living specs + backlog match DIR. **Done.**
3. **Auth + Space spine** — FEAT-113, FEAT-114.
4. **Capture loop** — FEAT-102 (reshape), FEAT-115; camera + manual + notify prompt.
5. **Assets + goals** — FEAT-116.
6. **Fair-use meter** — FEAT-117 (web checkout; Android status only).
7. **Device proof → prod** — STORY-102, then FEAT-110.

# Locked

- [x] Phase 1 Orient
- [x] Phase 2 living-spec rewrite + DEC-005 backlog disposition applied
- [x] Do not ship Phase 5–6 before Phase 4 works on a phone
- [x] Do not enable Production mobile before STORY-102
- [x] Phase 3 Auth + Space started (backend + Android sign-in shell; Google Credential Manager + web Space UI still open)

# Non-goals

- Date commitments
- Accessibility bank scrape
- Expanding ICP back to resto/sales

# Done when

Phase checkboxes move in order; Direction tab always matches reality.
