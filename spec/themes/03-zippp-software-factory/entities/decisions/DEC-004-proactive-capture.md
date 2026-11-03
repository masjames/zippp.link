---
id: DEC-004
type: decision
title: Capture — notify, then record
status: done
assignee: adit
relations:
  blocks: []
  implements: []
  depends_on: ["DIR-001", "DEC-003"]
verification:
  target_files: []
  test_command: ""
  prod_endpoint: ""
---

# Locked call

Zippp **proactively reminds** the user to record a transaction. Primary signal = **Notification Listener** (opt-in). User then records via camera scan or manual entry.

# Why

People forget. Bank apps already shout “you paid.” Zippp should catch that moment, not wait for a dedicated open.

# Locked

- [x] Opt-in `NotificationListenerService` for payment / bank-like alerts
- [x] Parse on-device → prompt “Catat di Zippp Space?” → camera | manual | dismiss
- [x] Do not silently upload raw notification dumps
- [x] Camera scan + manual entry remain first-class
- [x] Accessibility service is **out** for launch
- [x] Play listing must disclose notification access as expense capture

# Non-goals

- Reading every notification category on day one (start with payment-like sources)
- Auto-booking without user confirm
- Sideload-only forever (Play path must stay honest)

# Done when

A device with listener enabled can show a record prompt after a bank-style notification, without requiring the user to open Zippp first.
