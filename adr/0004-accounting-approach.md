# ADR-0004: Manual bookkeeping pre-revenue, defer a custom ledger

Date: 2026-07-12
Status: Accepted

## Context

Neither PRD.md nor SPEC.md addresses expenses or formal books at all, the only financial mechanism specified is the Polar.sh webhook that updates a user's `plan` and `paid_amount`. That covers revenue recognition inside the product, but not business-level bookkeeping (infra costs, any paid tools, reconciling what actually landed in the bank after Polar.sh's fee).

## Decision

Track revenue via the Polar.sh dashboard/API (already the source of truth for `checkout.completed` events). Track expenses (Vercel, Neon, R2, any paid tools, domain) manually in Wave (free) or a spreadsheet, reconciled monthly against Polar.sh payouts. No custom internal ledger gets built pre-revenue.

## Alternatives considered

- **Build an internal finance dashboard on Neon** pulling Polar.sh transactions + expense rows into one view: reasonable v2 once revenue is consistent, but building it now is solving a problem (formal books) before there's meaningful money to track, same trap as building load testing pre-launch.
- **Formal double-entry accounting software (Xero/QuickBooks) from day one:** overkill in cost and setup time for pre-revenue volume; revisit once there's recurring revenue and it's worth a bookkeeper's or accountant's time.

## Consequences

Bookkeeping stays lightweight and manual until there's real, recurring revenue to justify more structure. The tradeoff is monthly manual reconciliation instead of an automated view, acceptable at current volume. Revisit this ADR once monthly revenue is consistent enough that manual reconciliation becomes a time cost worth automating.
