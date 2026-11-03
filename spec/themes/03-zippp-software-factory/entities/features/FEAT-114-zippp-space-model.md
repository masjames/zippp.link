---
id: FEAT-114
type: feature
title: Zippp Space membership model
status: done
assignee: adit
relations:
  blocks: []
  implements: ["DEC-001", "DIR-001"]
  depends_on: ["DIR-001", "DEC-001", "ROAD-001"]
verification:
  target_files:
    - "src/lib/space/space-store.ts"
    - "src/lib/space/invite-store.ts"
    - "src/app/api/spaces/route.ts"
  test_command: "npm test -- --run src/lib/space/space-store.test.ts"
  prod_endpoint: ""
---

# What it is

Server + web + Android model for a **Zippp Space**: create, invite, join, leave. Copy never says “family” by default.

# Goal

Two people can share one personal-finance space with clear membership.

# Context

- `DEC-001`, `ROAD-001` Phase 3
- Starts minimal: membership + ownership; ledger schema can follow

# Acceptance criteria

- [x] User can create a Space with a display name
- [x] Owner can invite by link or email
- [x] Invitee can join; both see the same Space
- [x] Member can leave; owner can remove
- [x] Wording keys use Space — no family default strings

# Verification

- Manual: two Google accounts share one Space on web; Android lists the Space after FEAT-113.

# Out of scope

- Full asset/goals UI (FEAT-116)
- Billing seats / per-member pricing

# Definition of done

Space CRUD + invite join leave works on web; Android can list membership.
