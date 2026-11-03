---
id: DEC-002
type: decision
title: Monetization — monthly fair-use, web pay
status: done
assignee: adit
relations:
  blocks: []
  implements: []
  depends_on: ["DIR-001"]
verification:
  target_files: []
  test_command: ""
  prod_endpoint: ""
---

# Locked call

**Monthly subscription** with a **usage % meter** (Claude Pro / Max style). Checkout stays **web-only**. Android never sells.

# Why

Credits trained “buy scans.” Subscription + fair-use fits a full finance OS. Web pay protects Play posture.

# Locked

- [x] No prepaid credit packs as the primary model
- [x] Fair-use shown as usage percentage / remaining allowance
- [x] Top-up / subscribe / manage plan = web only
- [x] Android may show plan status + usage %, never checkout

# Non-goals

- Final IDR/USD price points (separate pricing DEC later)
- Exact fair-use caps per tier (product can tune after meter ships)
- Play Billing / IAP

# Done when

Billing specs and Android copy stop saying “1 credit = 1 Terima” as the north-star model.
