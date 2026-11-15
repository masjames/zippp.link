# 02 — Existing ZIPPP System: Findings, Risks, and Reuse

**Source classification:** `ATTACHED` means stated in the 16 uploaded documents. `PUBLIC` means fetched from the GitHub repository's public `main`. `TO VERIFY` means neither source proves the present local checkout's state. Do not convert specification status to runtime fact.

## Evidence read

- Full attachments dated mostly November 5, 2026: `zippp-context-for-claude.md`; `00-audit-and-defects.md`; `01-shell-and-navigation.md`; `02-capture.md`; `03-review-sheet.md`; `04-settings.md`; `05-space.md`; `06-sheet-choose-and-sign-in.md`; `07-home-dashboard.md`; `08-flows-system-wireframes.md`; `09-bearer-route-slice.md`; `10-pairing.md`; `11-manual-entry.md`; `12-google-grant.md`; `13-plans-and-usage-units.md`; `14-spreadsheet-library-research.md`.
- PUBLIC: `masjames/zippp.link`, main; `AGENTS.md`, `README.md`, `package.json` fetched 2026-11-15. Public repository records a last push on 2026-10-20; attached November docs describe local branches many commits ahead and some uncommitted work.
- USER: interactive prototype `ZIPPP-Complete-Screens-v0.8.html` represents newer experience requirements, **not** shipped React Native code.

## Legacy backend to preserve unless audited unsafe

| Existing element | Evidence | Proposed pivot disposition |
|---|---|---|
| Next.js App Router, Google OAuth, Sheets APIs | PUBLIC and ATTACHED | **KEEP** for API/service layer initially. Do not port the backend to mobile. |
| OCR pipeline: PP-OCRv6 → DeepSeek → deterministic verifier → Gemini fallback | ATTACHED, §7.7–7.8 | **KEEP/ADAPT** without leaking Sheet data into OCR path; re-evaluate cost, logs and reliability. |
| Server-issued `scanId` and ownership, append idempotency | ATTACHED §7.10 | **KEEP/FIX** for confirmed receipt; extend to general transaction operation IDs. |
| Google token encryption and storage | ATTACHED §6, §12 Google grant | **KEEP/AUDIT** refresh and grant scope, rotation, revocation, encryption and least-privilege. |
| Web/mobile bearer auth, pairing and device registry | ATTACHED §§7.3–7.6 | **REUSE** after tests; adapt transport to Expo. Never share raw secrets with client. |
| Current Kotlin Compose/CameraX client | ATTACHED Android specs | **REFERENCE/MIGRATE** to React Native only after actual working feature inventory and parity tests. |
| Template-specific personal-expense append rows | ATTACHED §4 | **BRIDGE** old Sheet rows to a normalized ledger; do not silently change old user's spreadsheet. |
| Upstash Redis session/credits/billing data | ATTACHED | **RETAIN** server auth/billing state; add separately namespaced disposable read-model caches. |
| Product Drive receipt photo proof | ATTACHED marked FEAT-103 not done | **BUILD** with user Drive and retry-safe Drive file id; no ZIPPP image archive. |
| Software Factory (Go daemon / React Kanban) | ATTACHED §16 | **PAUSE** as orchestration dependency; do not migrate it into product. Reuse inventory outputs if useful. |
| Legacy prepaid credit scheme | PUBLIC & ATTACHED (later subscription design) | **ISOLATE**, do not rip out revenue path before migration compatibility is proved. |
| Shared Spaces and goals | ATTACHED built/in verification | **PARK** user-facing product, preserve dormant data/API until migration decisions. |
| Telegram, WhatsApp legacy | ATTACHED | **NO NEW FEATURES**. Isolate from MVP and decide archival in separate task. |
| `spec/wording.txt` as source of UI copy | PUBLIC & ATTACHED | **PRESERVE** as compatibility source until replacing with cross-platform typed i18n. |

## Confirmed historical defects to test again, not assume still broken

1. A phone APK previously used production `https://zippp.link` where mobile APIs were disabled; apex redirected to `www` and dropped Authorization across host redirect. `00-audit-and-defects.md`.
2. Flash icon did not illuminate preview, some touch targets were below 48dp, and home previously opened scan; old mobile shell requires replacement.
3. `11-manual-entry.md` identifies payload with no `line_items`, causing `RECEIPT_EMPTY`; and Indonesian `25.000` parsed as 25.0, not 25,000.
4. Retrying manual entry could generate a new `scanId`, duplicating expense rows and usage charges.
5. Attached context §11 identifies a refund idempotency key mismatch (`scan:${userId}:${scanId}` spent vs refund without user id). Audit before enabling flaky-network retries.
6. Android in-memory draft store could lose receipts after process death, while web persisted IndexedDB drafts; new queue persistence is mandatory.
7. Google grant was not yet available for first-time native users; `12-google-grant.md` and `09-bearer-route-slice.md` describe needed route and OAuth flow.
8. App docs disagree on status and authority (e.g. `zippp-context...` says Sheet is a future landing surface, current product says authoritative ledger). Resolve before any code change.

## Target differences that need explicit migration

| Historical direction | Latest direction | Migration |
|---|---|---|
| Android first-class Kotlin; Next.js web | React Native + Expo for Android/iOS/web | Incremental parallel new client; keep existing API online while proving client parity. |
| Web `/app` opens capture | Home opens three cash-flow summaries | Change nav and deep links; browser route redirects after tests. |
| Scan directly into review, accept immediately | Capture → Inbox → review later → approved ledger | Add persistent draft objects and background extraction states. |
| Home today + last spending, sheet/quota/Space cards | Today, week, balance, latest spending | New aggregates from authoritative normalized records, with completeness indicators. |
| Investment/Space OS vision | Cash-flow-first app | Hide, retain backend until deprecation plan is authorized. |
| Old template row-per-line item | Explicit transaction and account ledger | Adapt schema and versioning; avoid repeating `total` across receipt lines for aggregates. |
| Manual expense consumes quota under older spec | Desired low-friction record action | Preserve existing billing until owner confirms revised pricing, then introduce policy migration. |

## Required local discovery output (TASK-001)

Produce `pivot/audit/AS-BUILT.md` with: current HEAD and branch, dirty paths (without secrets), runtime/package versions, exact mobile/web routes and schema contracts, test results, active deployments, per-feature actual state, a code/reuse map and risks. Mark each capability `verified`, `exists but unverified`, `missing`, or `broken`. Nothing gets deleted in this phase. Also save an old screenshot/API fixture as a parity baseline when available.

## Source-of-truth rule for code

A current file or endpoint plus a reproducible test can prove as-built behavior. A specification can only prove what was designed or observed at its snapshot. Do not let an old design instruction suppress an explicit new user requirement, but do not destroy legacy customer data while changing it.
