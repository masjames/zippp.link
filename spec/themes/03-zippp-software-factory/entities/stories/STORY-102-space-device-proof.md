---
id: STORY-102
type: story
title: Zippp Space device proof
status: todo
assignee: adit
relations:
  blocks: ["FEAT-110"]
  implements: ["DIR-001", "ROAD-001"]
  depends_on: ["FEAT-113", "FEAT-114", "FEAT-115", "ROAD-001"]
verification:
  target_files: []
  test_command: ""
  prod_endpoint: ""
---

# What it is

Manual E2E on a real device under the **Space** north star: auth → record (scan or notify prompt) → confirm → Space/Sheet → usage visible.

# Goal

Prove the product path before Production mobile enable (FEAT-110).

# Context

- Replaces companion-only STORY-101 as the gate that matters
- `ROAD-001` Phase 7

# Acceptance criteria

- [ ] Sign in on Android via Google or magic link
- [ ] Record a spend via camera OR notification prompt → manual/camera
- [ ] Confirm; row/record visible in Space (and Sheet if connected)
- [ ] Usage % or entitlement status updates as designed
- [ ] Failures logged with device, app version, ids, error codes

# Verification

- Manual checklist recorded in the story thread or a short report note.

# Out of scope

- Production `MOBILE_API_ENABLED=true` (FEAT-110 after this passes)

# Definition of done

Checklist green on one real phone against Preview; FEAT-110 may unpark.
