---
id: FEAT-117
type: feature
title: Fair-use subscription meter + web checkout
status: verify
assignee: adit
relations:
  blocks: []
  implements: ["DEC-002"]
  depends_on: ["DIR-001", "DEC-002", "ROAD-001"]
verification:
  target_files:
    - "src/lib/billing/plan.ts"
    - "src/app/api/billing/subscribe/route.ts"
    - "src/components/app/PlanCard.tsx"
  test_command: "npm test"
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

- [x] Server tracks entitlement + usage %
- [x] Web can subscribe / manage plan (subscribe + status; cancel still in Paddle)
- [x] Android shows plan + usage %, never checkout
- [x] Capture blocked or soft-warned per fair-use policy when exhausted
- [ ] Legacy credit paths deprecated or migrated

# Verification

- Manual: subscribe on web → Android shows % → burn usage → see meter move.

# Out of scope

- Final marketing prices (separate DEC)
- Play Billing

# Definition of done

A subscribed user sees usage % on web and Android; unpaid/exhausted behavior is defined and tested.

Implementation note (2026-11-03): `plan.ts` holds the period, included captures, and a per-period usage counter. Append blocks with `PLAN_LIMIT` at the cap and records one capture on success; credit spend is skipped only while a plan is active. Checkout uses a Paddle price id from env (`PADDLE_PLAN_PRICE_ID`), so no price is hardcoded. Web PlanCard shows the meter and opens checkout; Android shows usage only. Legacy credits still run for accounts without a plan, so migration is not done yet. Four plan tests cover activation, idempotency, cap, cancellation, and zero usage.
