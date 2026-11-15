# TASK-001 Local Baseline

**Date:** 2026-11-15  
**Repository root:** `/Users/mm/Dev/adit/zippp`  
**Branch / commit:** `feat/121-import-statements` / `04268ef273ec40680a43f15a95b0be6f0e69f3c1`  
**Status:** `git status --short` reported untracked `.zippp-pivot/`, `ZIPPP-Pivot-Kit/`, and `tools/parity-audit/`. No tracked modifications were reported. Their contents were not treated as committed baseline. This report and state update are the only intended writes.

## What exists

| Capability | Implementation paths | Evidence | Confidence |
|---|---|---|---|
| Sign-in and Google grants | `src/app/api/auth/login/route.ts`, `callback/route.ts`, `mobile/google/route.ts`, `magic-link/{request,consume,verify}/route.ts`, `pair/{generate,claim}/route.ts`, `src/lib/google/{oauth,token-store,session}.ts`, `src/lib/auth/{mobile-auth,device-store}.ts`, `android/.../SignInScreen.kt`, `SecureTokenStore.kt` | Web OAuth callback resolves user and stores tokens; bearer mobile auth/pair/magic-link routes are guarded by `MOBILE_API_ENABLED`; Android token uses Keystore AES-GCM. | Implemented and directly evidenced locally; provider config/runtime availability unverified. |
| Sheets discovery, creation, append, row schema, `scanId` | `src/app/api/sheets/{connect,map,workspace,append}/route.ts`, `src/lib/google/{sheets,templates,workspace-store}.ts`, `src/types/receipt.ts` | Workspace stores spreadsheet/tab/template/column mappings. Append requires parsed receipt and workspace; mobile `scanId` must be server-issued; result cache keyed by user+scanId and credit spending uses `scan:${userId}:${scanId}`. `appendRows` appends. | Implemented and directly evidenced locally for receipt-row workflow. No normalized cash ledger, accounts, income/transfer schema or migration adapter found in inspected route/contracts. |
| OCR, review, drafts, failures | `src/app/api/extract/route.ts`, `src/lib/extract-pipeline.ts`, `src/lib/verify-receipt.ts`, `src/components/app/AppProvider.tsx`, `src/lib/review-ops.ts`, `android/.../CameraScreen.kt`, `BatchStore.kt`, `ReviewScreen.kt` | Extraction issues `scanId`; receipt append rejects empty line items; web `sendOne` appends only explicit items and retains failed items. Android has camera/review and an in-memory `BatchStore`; no persistence is implemented in that store. | Web receipt workflow implemented; Android workflow exists but draft durability is not verified and shown store is memory-only. |
| Summary API/aggregation, Redis cache, account/balance | `src/app/api/billing/balance/route.ts`, `src/lib/billing/{ledger,redis,plan}.ts`, `src/app/api/sheets/append/route.ts` | Billing balance/credit ledger exists; Redis is used for credit/order-related state and append-result cache. No target cash-flow summary, transaction aggregation, accounts or canonical balance route identified in the route inventory. | Legacy credits implemented. Pivot summary/account feature missing from inspected local routes; additional code not evidenced. |
| Android/Kotlin, Next routes, Expo/RN | `android/app/src/main/...`, `src/app/**`, `package.json` | Android Gradle project uses Kotlin, Compose and CameraX. Next.js App Router has `/app`, settings/snap/topup, API routes including auth, extract, sheets, billing and spaces. No Expo/RN manifest or code found in repository search. | Kotlin and Next.js directly evidenced. Expo/RN not found. |
| Billing/subscription and paid-route restrictions | `src/app/api/billing/{balance,plan,subscribe}/route.ts`, `src/app/api/topup/**`, `src/app/api/{paddle,doku,kasera}/**`, `src/lib/billing/**`, `src/app/api/sheets/append/route.ts` | Prepaid credit ledger, top-up/payment routes and plans exist. Append checks/spends credits and has scan idempotency. | Implemented locally; live payment configuration/behavior not tested. Pivot billing changes remain approval-gated. |

## What is only specified

The pivot target in `.zippp-pivot/docs/01-PRODUCT.md` calls for multi-account balances, income/expense and transfer entries, cycle-aware aggregates, bills, receipt inbox drafts with deferred approval, Drive proof, encrypted offline queue, and sync state. The inspected implementation is a receipt-to-user-Sheet product and does not demonstrate these cash-flow domain features. `.zippp-pivot/docs/02-EXISTING-SYSTEM.md` and legacy specs describe design intent and historical defects, not current runtime proof. No deployment claims are made.

## Conflicts with pivot and old specs

- Root `AGENTS.md` asserts receipt intake, prepaid credits and Sheet as receipt record; pivot decision doc targets cash-flow management and a normalized confirmed ledger. Preserve compatibility until approvals.
- Kotlin Compose exists; pivot proposes Expo/RN. Do not retire Kotlin absent approval (D-02).
- Existing append contract maps receipt rows into template-specific columns, not versioned accounts/transaction legs. Schema/write-order approval required (D-01, D-06).
- Existing paid entitlements and prepaid path are implemented; pivot monetization is unresolved (D-04).
- Pivot says drafts must not affect totals; current web/Android draft paths are receipt review flows, not proof of this target ledger rule.

## Existing working assets to preserve

Next.js route/service layer; Google OAuth and token stores; user-specific workspace mappings; append-only Sheets integration; receipt validation and extraction; server-issued mobile sessions/device revocation; atomic/idempotent credit ledger; Android client and web IndexedDB draft path. These are local code findings, not deployed-service assertions.

## Defects and high-risk unknowns

- Untracked paths make the checkout locally non-pristine; do not stage or discard them. Confirm intended branch/commit and ownership with the owner.
- Android batch drafts shown in `BatchStore.kt` are in-memory; process-death durability is not present in that class.
- No pivot accounts, normalized transaction schema, cash-flow summary routes or cross-account transfer contract identified.
- Actual OAuth scopes/configuration, live integrations, deployment state and account/data segregation cannot be verified from this read-only local inspection. Do not connect or exercise external systems.
- Existing Sheet layouts and historical user data mapping are unknown; no workbook was accessed.
- Known legacy defects in `.zippp-pivot/docs/02-EXISTING-SYSTEM.md` are historical reports only; none were tested here.

## Safe baseline verification commands for P0.2

After owner approves branch/commit: `git status --short`, `git diff --stat`, `node --version`, `npm --version`, `git --version`, then `npm test` and `npx tsc --noEmit` in the approved local checkout. Android verification requires owner-provided Java/Android SDK setup; no dependency installation. Do not run deployment, payment, Sheet, Drive, or user-data operations as baseline checks.

## Recommendation / required owner approvals

Owner review and explicit approval of audited baseline branch/commit, untracked-path ownership, and protected data boundaries (Checkpoint A). Then P0.2 should be limited to approved local baseline verification and documented results; no code changes. Before any later Sheet writes, approve versioned schema/migration/write ordering and conflict recovery (Checkpoint B). Current tool inventory: Node v23.9.0, npm 10.9.2, Git 2.39.3; Bun, Java and Gradle unavailable on PATH. No build, tests, install, deployment or external integration checks were run per P0.1 read-only constraints.
