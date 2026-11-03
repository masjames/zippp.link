---
id: DEC-003
type: decision
title: Surfaces + auth — full app, web pay
status: done
assignee: adit
relations:
  blocks: []
  implements: []
  depends_on: ["DIR-001", "DEC-002"]
verification:
  target_files: []
  test_command: ""
  prod_endpoint: ""
---

# Locked call

Android is a **first-class Zippp client**, not a reduced companion. Same product capabilities as web except **payment**. Auth = Google and/or magic link; device bind stays for revoke/security.

# Why

“Web-first + pairing only” made Android feel bolted on. Users already live in Google identity.

# Locked

- [x] Parity target = personal finance product (spend, Space, assets, goals, account status)
- [x] Payment / plan manage = web only
- [x] Auth paths = Google sign-in and email magic link on Android
- [x] Pairing code/QR = optional fast device bind when already signed in on web
- [x] Admin stays web-only

# Non-goals

- Rebuilding billing ledger in the first Android sprint
- Dropping device registry / revoke

# Done when

FEAT-112 and companion docs are rewritten or parked to match this DEC — no competing “companion-only” north star.
