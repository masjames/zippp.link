# P0.3 — Architecture and Continuity Decision Record

**Status:** Owner accepted the low-risk directions below for planning on 2026-11-15. This is not implementation authorization; production, data, billing, OAuth-scope, and release gates remain closed.  
**Canonical baseline:** `v2` at `9799859786d238c3796910cbacbe01cb62d51d78`, confirmed by the owner. P0.2 was run on this commit. TASK-001 audited the earlier `feat/121-import-statements` commit `04268ef273ec40680a43f15a95b0be6f0e69f3c1`.

## Decision requests

| Topic | Options | Low-risk proposal for owner decision | Approval boundary |
|---|---|---|---|
| Client migration (D-02, D-10) | Keep Kotlin/Next.js; isolated Expo compatibility spike; commit to full RN migration | Preserve current clients and server APIs. Permit only an isolated compatibility spike before choosing a rollout. | No production rollout, client retirement, or user-data migration until separately approved. |
| Ledger workbook (D-01, D-06) | Extend legacy workbook; versioned tables in same workbook; separate versioned workbook | Define a versioned canonical schema and a read-only legacy adapter first. Do not write or migrate until the owner chooses workbook strategy and approves migration/write order, backups, and conflict recovery. | Checkpoint B: no canonical Sheet writes or migrations without approval. |
| OAuth and receipt proof (D-03, D-08) | Local-only drafts; optional Drive proof after approval; broader Drive sync | Keep unapproved images in local encrypted storage. Investigate minimum scopes and explicit consent before any upload; keep Google credentials server-side. | Checkpoint C: no broader scope, account-linking change, or unapproved-photo upload. |
| Commercial continuity (D-04) | Preserve current paid behavior; change to subscription units; simplify later | Preserve existing prepaid/subscription entitlements while researching; no price, paywall, refund, or usage-unit changes in migration slices. | Checkpoint D: owner approval before billing behavior changes. |
| Date, cycle, and currency (D-05, D-09) | Local-date-first; instant-only; conversion/aggregation approaches | Store event instant, declared timezone, and local calendar date; keep everyday balance distinct from savings; do not sum currencies without a sourced conversion. No historical date rewrite. | Confirm edge rules before historical imports or balance changes. |
| Release/rollback (D-10) | Replace current app; parallel rollout; feature-flagged migration | Keep the existing web/server behavior available; use a reversible client rollout and preserve rollback path. | Checkpoint E: no production traffic or store release changes without approval. |

## Owner-approved planning directions

- **Client migration:** preserve Kotlin/Next.js; only an isolated Expo compatibility spike is a planning direction. No rollout or client retirement approved.
- **Ledger workbook:** versioned schema and read-only legacy adapter before any write or migration. Exact workbook strategy and Checkpoint B approvals remain open.
- **OAuth/Drive:** local encrypted drafts first; investigate minimum scopes and explicit consent. No scope changes or photo uploads approved.
- **Commercial continuity:** preserve current entitlements; defer pricing/paywall changes. No billing changes approved.
- **Dates/currency:** retain event instant, timezone, and local date provenance; separate savings from everyday balance; no mixed-currency sum without sourced conversion. No historical rewrite approved.
- **Release/rollback:** plan a parallel reversible rollout. No production traffic or store release changes approved.

## Next task

`.zippp-pivot/omp/TASK-004-P1-1-DOMAIN-MODELS.md` is separately authorized for a pure domain-model slice with synthetic tests only. The accepted planning directions do not authorize work outside that task or open protected approval gates.
