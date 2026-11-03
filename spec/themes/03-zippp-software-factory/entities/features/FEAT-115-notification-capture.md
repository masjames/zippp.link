---
id: FEAT-115
type: feature
title: Notification Listener capture prompt
status: todo
assignee: adit
relations:
  blocks: []
  implements: ["DEC-004"]
  depends_on: ["DIR-001", "DEC-004", "FEAT-113", "ROAD-001"]
verification:
  target_files: []
  test_command: ""
  prod_endpoint: ""
---

# What it is

Opt-in Android Notification Listener. On payment-like notifications, prompt to record in Zippp Space via camera or manual entry. On-device parse; no raw dump upload.

# Goal

Proactive remind — user does not have to remember to open Zippp after paying.

# Context

- `DEC-004`, `ROAD-001` Phase 4
- Play disclosure required before store release

# Acceptance criteria

- [ ] User can enable/disable listener in Settings with clear copy
- [ ] Payment-like notification shows “Catat di Zippp Space?”
- [ ] Camera and manual paths both work from the prompt
- [ ] Dismiss does nothing
- [ ] No Accessibility service
- [ ] Privacy policy / Play declaration notes drafted

# Verification

- Manual: post a test notification from a bank-like package allowlist → prompt → manual save.

# Out of scope

- Auto-book without confirm
- Reading all notification categories on day one

# Definition of done

Prompt path works on a real device with listener enabled.
