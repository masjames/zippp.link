# 12 — Decisions, Conflicts, and Approval Gates

**Status:** proposed defaults; NOT authorization to change production or account scopes. This document protects the pivot from assuming that old decisions and later product prototypes all agree.

## Confirmed latest product choices

- The initial business is a **cash-flow awareness application**, not a broad financial operating system, stock tracker or restaurant receipt tool.
- Home shows **Spent today, This week, Balance, Latest spending**. The three figures have no internal action buttons. Below them are **Record income** and **Record expense**.
- The bottom bar is **Home / Capture / Cash flow**. Activity is reachable through **Latest spending → View all**.
- Capture is camera-first, one prominent capture control, and creates a Receipt Inbox draft. Reviewing/approving later is allowed. Drafts never change confirmed financial totals.
- Cash flow has a selectable cycle-start day (1, 25 or other), upcoming bills/invoices and user-optional reminders.
- Dedicated savings accounts are distinct from everyday money and hidden by default behind **Show savings**. An own-account transfer is **not spending**.
- User's confirmed ledger is in their Google Sheet; receipts in their Google Drive where enabled; Upstash is disposable projection cache; offline local queue is encrypted.
- Focus on one model in OMP: `openai-codex/gpt-6-luna` via the user's Codex OAuth, subject to actual availability.

## Unresolved decisions — no guessing with permanent effects

| ID | Open decision | Proposed low-risk starting point | Approval trigger |
|---|---|---|---|
| D-01 | New multi-account Sheet schema vs legacy single-row receipt sheet | Version schema; implement read-only legacy adapter first | Any workbook migration or new mandatory columns |
| D-02 | React Native/Expo/Tamagui migration vs keeping current Kotlin app longer | Compatibility spike in isolated directory; no deletion of Kotlin app | Framework rollout or retiring old client |
| D-03 | Backing up **unapproved** receipt photos into Drive | Local encrypted inbox first; investigate explicit consent and grant scopes | Uploading draft photos before approval |
| D-04 | Billing remains Standard/Pro monthly, prepaid, or simpler later? | Preserve all current paid-user entitlements; defer business-model replacement | Prices, paywalls, usage-unit accounting, refunds |
| D-05 | How to show income/spending in local cycles across time zones | Store event instant + local calendar date + declared time zone; test boundaries | Changing existing historical dates |
| D-06 | Google Sheets source-of-truth vs concurrent edits/offline | Server serial reconciliation, stable IDs, outbox with retries, conflict surfacing | Automatic conflict overwrite |
| D-07 | Active coaching and financial-well-being scores | Out of MVP, no made-up threshold | New assessment and notifications |
| D-08 | Identity/grants across web, Android, iOS | Reuse server OAuth if safe; confirm iOS authorization path | New scopes/identity-binding changes |
| D-09 | Savings and accessible balance definitions | Separate display categories, no misleading single total | Changing balance rules of existing accounts |
| D-10 | Public rollout sequence and compliance | Preserve functioning Next.js web while new client runs in parallel | Production app/store deploy |

## Conflicts between old artifacts and the new direction

1. Old root `AGENTS.md` says **prepaid credits**, while newer `13-plans-and-usage-units.md` says **monthly Standard/Pro units**. Neither should be silently erased. Billing is a protected subsystem.
2. Old Android design is Kotlin Compose, while proposed destination is **React Native across Android, iOS, web**. Migration must reuse verified server capabilities rather than rewrite the backend at the same time.
3. Old Home covers today + last spend + Sheet/Space/quota cards. New Home instead prioritizes **today, this week, everyday balance, latest spending**.
4. Old scan flow tends toward immediate review/send. New flow supports **capture-many, defer review, and approve only when ready**.
5. Old product emphasizes Spaces and assets/goals. New product defers shared Spaces and investments; existing user data must not be deleted.
6. Existing Google Sheet may hold receipt line-item rows, which do not directly encode account balances, income, transfers or opening balances. A new domain model and versioned migration are required.
7. Old user-readable texts live in `spec/wording.txt`. Preserve this policy until a shared i18n migration is tested; do not hardcode inconsistent UI copy.

## Owner checkpoints

- **Checkpoint A** after P0.1 audit: approve actual baseline, identify clean branch and protected user data.
- **Checkpoint B** before canonical Sheet writes: approve versioned schema, data migration, write ordering, conflict handling and backup plan.
- **Checkpoint C** before account linking or broader Drive uploads: approve permissions, privacy and deletion behavior.
- **Checkpoint D** before modifying subscriptions or paid entitlement behavior: approve product policy and store compliance.
- **Checkpoint E** before production traffic changes: approve release checklist and rollback.

The agent can make reversible implementation details inside an approved slice without re-asking, but must stop at these boundaries.
