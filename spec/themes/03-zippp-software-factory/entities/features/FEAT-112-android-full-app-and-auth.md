---
id: FEAT-112
type: feature
title: Android full app and auth
status: blocked
assignee: adit
relations:
  blocks: []
  implements: ["DEC-003"]
  depends_on: ["DIR-001", "DEC-003", "ROAD-001"]
verification:
  target_files: []
  test_command: ""
  prod_endpoint: ""
---

# What it is

Android as a first-class Zippp Space client (auth + product parity). **Blocked** until Phase 2–3 under ROAD-001; decisions live in DEC-003.

# Goal

Ship Android that matches the personal finance product — not the old companion spike.

# Context

- Owns: `entities/direction/DIR-001-zippp-space.md`
- Auth/surfaces: `entities/decisions/DEC-003-surfaces-and-auth.md`
- Capture: `entities/decisions/DEC-004-proactive-capture.md`
- Old companion specs are historical, not north star.

# Acceptance criteria

- [ ] Google sign-in and/or magic link work on Android
- [ ] Device bind/revoke still works
- [ ] Product surfaces match DEC-003 (no Android checkout)
- [ ] Card body no longer describes web-first companion as the goal

# Verification

- Manual: reopen after ROAD-001 Phase 3 starts; split into smaller FEATs before coding.

# Out of scope

- Play Billing
- Admin

# Definition of done

Unblocked under ROAD-001, split into buildable FEATs, device proof story defined.
