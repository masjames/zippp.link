# 09 — Migration Roadmap: Small, Verifiable Vertical Slices

**Do not skip Phase 0.** Each slice is one focused work order, usually one-to-three code areas with explicit tests. Depend on observed code, not exact file names invented here. Use existing feature IDs for traceability when relevant; the new slice numbers are a migration plan, not claims of current implementation.

## Milestone M0 — Freeze and discover

| Slice | Deliverable | Exit gate |
|---|---|---|
| P0.1 | Read-only local repo inventory + versioned AS-BUILT.md, route map, branch/dirty status | Owner can identify what is shipped, unverified, missing; no code changed |
| P0.2 | Snapshot critical current flows, schema fixtures, existing test results, deployment topology | Repeatable baseline; sensitive data redacted |
| P0.3 | Architecture decision record: RN migration path, Sheets workbook strategy, OAuth/Drive scope, commercial continuity | Owner approves disputed changes |

## Milestone M1 — Ledger correctness before interface

| Slice | Deliverable | Exit gate |
|---|---|---|
| P1.1 | Pure domain models: Money, Account, Transaction, Transfer, Pending, CashflowCycle | Golden accounting unit tests |
| P1.2 | Read-only adapter from existing personal-expense Sheet to canonical transactions | No duplicate totals from line items, date and amount fixtures pass |
| P1.3 | Correct balance projection and review of opening balances/reconciliations | Balance invariant, multi-account, reserved savings tested |
| P1.4 | Cache contract and server summary endpoint for Home | Redis loss/rebuild, user isolation, freshness tests |
| P1.5 | Idempotent write behavior and legacy bug fix (including refund mismatch) | Network retry tests prove one write and one charge |

## Milestone M2 — React Native app shell and Home

| Slice | Deliverable | Exit gate |
|---|---|---|
| P2.1 | Expo/Tamagui compatibility spike, Android+iOS+web build on chosen SDK | All platforms launch with minimal custom component |
| P2.2 | Auth integration and Google grant flow with existing backend | Google identity and token isolation tested; device sign-in works |
| P2.3 | Three-tab shell: Home, Capture, Cash flow + account/sync header | Back navigation, deeplink, accessibility |
| P2.4 | Home Today/Week/Balance, record controls, Latest spending | Real sandbox Sheet data displays; no invented data |
| P2.5 | Activity/Accounts and Show savings | Drilldowns work and totals reconcile |

## Milestone M3 — Quick capture and robust inbox

| Slice | Deliverable | Exit gate |
|---|---|---|
| P3.1 | Camera one-button capture with photo-picker fallback | Actual-device capture, denied permission |
| P3.2 | Encrypted local receipt draft persistence/inbox | 10 drafts survive process kill |
| P3.3 | OCR adapter and background job lifecycle | Camera remains usable; no Sheet tokens in OCR path |
| P3.4 | Review editable fields, flags and explicit approval | No unapproved draft creates spending |
| P3.5 | Drive draft and approved proof synchronization | Recoverability across disconnect and grants |

## Milestone M4 — Manual entry, sync, and cash-flow planning

| Slice | Deliverable | Exit gate |
|---|---|---|
| P4.1 | Manual income and expense forms sharing ledger contract | Indonesian number parsing, duplicate-proof save |
| P4.2 | Pending outbox, manual Sync control, status, conflict policy | Offline replay and stale external edits verified |
| P4.3 | Cash flow adjustable month cycle and bill/invoice scheduling | Period edge-case tests and opt-in reminders |
| P4.4 | Savings accounts/transfers and subdued encouragement | Everyday vs reserved balances correct; no expense for transfer |
| P4.5 | Finishing states, localized copy, accessibility, deletion and account recovery | Device UAT with target audience |

## Milestone M5 — Beta and rollout

| Slice | Deliverable | Exit gate |
|---|---|---|
| P5.1 | Web launch on new Expo client, backend compatibility and dual-route monitoring | Public UX regressions absent |
| P5.2 | Android beta, then iOS TestFlight; native OCR/offline camera reality check | Real device and Google auth tested |
| P5.3 | Error monitoring/privacy review/cost profiling/Google API quota study | Documented support, compliance, pricing risk |
| P5.4 | Launch migration with rollback switch and data-safe feature flags | Can revert client without losing ledger data |

## Guiding sequencing decisions

- Do **not** begin Tamagui component polish before accounting and permission contracts. Design is meaningful only with real, accurate state.
- Do not rewrite proven OCR providers while building camera; isolate with adapter.
- Do not turn on automatic Drive draft backup before consent behavior and grant feasibility are verified.
- Do not make the unfinished Kotlin app disappear until parity is verified on a real device and owner authorizes retirement.
- Do not change billing mechanics and migration architecture in the same slice; maintain subscription continuity and separate pricing decision.
- A goal- or Space-specific migration is parked until after MVP baseline and user demand; preserve user records.

## Release and rollback

Create a dedicated pivot branch from a **known clean baseline** (after preserving current dirty work). Keep server APIs backward-compatible during migration, feature-flag new client endpoints when reasonable, back up test workbooks before schema migration, retain old client until Google-grant success and no data loss are demonstrated. Roll back UI routing first; never delete newly committed Sheet records to roll back a front-end release.
