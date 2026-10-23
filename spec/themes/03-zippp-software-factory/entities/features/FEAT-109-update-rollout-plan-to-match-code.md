---
id: FEAT-109
type: feature
title: Update rollout plan to match code
status: todo
assignee: adit
relations:
  blocks: []
  implements: []
  depends_on: []
verification:
  target_files: []
  test_command: ""
  prod_endpoint: ""
---

# What it is

A documentation pass that makes the Android rollout plan match the code that actually exists.

# Goal

Remove stale checkboxes and stale contracts so the next coding agent does not build from an old plan.

# Context

- `spec/themes/02-android-telegram-pivot/android-rollout-plan.md`
- `spec/themes/02-android-telegram-pivot/reviews/session-log-2026-10-22.md` section 13.

# Acceptance criteria

- [ ] Completed lanes and tasks are checked.
- [ ] Pairing, JWT, device revoke, append, Telegram, and web UI status match the code.
- [ ] Stale claims are removed: `photoUrl`, the `=HYPERLINK` whitelist, DataStore, and max 5 attempts per code.
- [ ] Every lane has a clear exit gate.
- [ ] Open items link to the owning feature task.

# Verification

- Manual: review the plan against the code map and the session log.
- Static trace ID: not required for this documentation task.
- Production: none.

# Out of scope

- New code.
- Changing the product contracts.

# Definition of done

A new agent can read the rollout plan and know exactly what is done, what is partial, and what is next.

# Notes

This task exists because the plan still contains stale claims from the review.
