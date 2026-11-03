---
id: FEAT-117
type: feature
title: Fair-use subscription meter + web checkout
status: todo
assignee: adit
relations:
  blocks: []
  implements: ["DEC-002"]
  depends_on: ["DIR-001", "DEC-002", "ROAD-001"]
verification:
  target_files: []
  test_command: ""
  prod_endpoint: ""
---

# What it is

Replace credit-pack north star with monthly subscription, usage % meter, web checkout. Android shows status + usage only.

# Goal

Monetize the OS without Play IAP or prepaid scan packs as the story.

# Context

- `DEC-002`, `ROAD-001` Phase 6
- Exact tier caps can ship as config after meter exists

# Acceptance criteria

- [ ] Server tracks entitlement + usage %
- [ ] Web can subscribe / manage plan
- [ ] Android shows plan + usage %, never checkout
- [ ] Capture blocked or soft-warned per fair-use policy when exhausted
- [ ] Legacy credit paths deprecated or migrated

# Verification

- Manual: subscribe on web → Android shows % → burn usage → see meter move.

# Out of scope

- Final marketing prices (separate DEC)
- Play Billing

# Definition of done

A subscribed user sees usage % on web and Android; unpaid/exhausted behavior is defined and tested.
