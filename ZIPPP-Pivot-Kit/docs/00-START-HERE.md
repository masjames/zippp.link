# ZIPPP Pivot Kit — Read This First

**Prepared:** 2026-11-15  
**Status:** execution-ready specifications, **not** a claim of implemented software  
**Target:** single-codebase React Native application for Android, iOS, web; existing Next.js services reused when verified  
**Agent:** OhMyPi, one model only: `openai-codex/gpt-6-luna` when visible under the user's Codex OAuth account

## Start with a decision, not a rewrite

The first task in the existing repository is a **read-only, evidence-based inventory**. The attached November 2026 ZIPPP specifications are rich but represent differing implementation dates and earlier strategies. GitHub `main` last showed an older state than the locally described working branch. Never infer that a specification's “built” label proves the present checkout implements it.

**Product objective:** an exceptionally simple cash-flow application. Users understand money with almost no tracking burden. Home prioritizes **Spent today, This week, Balance, Latest spending**. The primary bottom navigation is **Home / Capture / Cash flow**. Capture is a quick camera viewfinder with one prominent shutter; captured receipts enter an inbox and **do not affect confirmed spending** until approved. Income and expense can also be recorded manually. Savings live in separate accounts and are hidden by default from everyday balance. Google Sheets is the authoritative confirmed ledger; Google Drive stores the user's optional receipt images; Upstash caches disposable projections.

## Reading order for OMP (avoid reloading everything)

1. `omp/AGENT-RULES.md` — standing rules, short and stable.
2. `omp/STATE.md` — current phase, blocker, next task.
3. `omp/TASK-001-AUDIT.md` — first task only.
4. When it is time for the next slice, read its referenced **specific** contract document, not the full kit.
5. `reference/legacy/` is **evidence**, not the new authority. Read a cited old file only for a question about old implementation.

## Document map

| File | Purpose |
|---|---|
| `01-PRODUCT.md` | Updated business/product charter and hard scope boundaries |
| `02-EXISTING-SYSTEM.md` | Historical assets, defects, conflicts, reuse assessment |
| `03-ARCHITECTURE.md` | Target system boundaries and migration architecture |
| `04-LEDGER-SYNC.md` | Authoritative ledger, account model, Google Sync, Redis, offline, conflicts |
| `05-UX-IA.md` | Navigation, full screen inventory, copy, interaction hierarchy |
| `06-RECEIPTS.md` | Capture/inbox/review/OCR/background processing contracts |
| `07-SECURITY.md` | OAuth, encryption, access control, retention, failure handling |
| `08-VALIDATION.md` | Verification matrix, user acceptance, performance and accessibility |
| `09-ROADMAP.md` | Evidence-driven migration milestones and atomic slices |
| `10-LEAN-GSD.md` | Single-model token-efficient development loop and durable artifacts |
| `11-OMP-SETUP.md` | Subscription model setup, role settings, commands, stop conditions |
| `12-DECISIONS.md` | Proposed defaults, explicit conflicts, questions for the owner |
| `13-CONTRACTS.md` | Typed-domain contract examples and accounting invariants |
| `omp/TASK-001-AUDIT.md` | Executable read-only OMP work order |
| `omp/START-PROMPT.md` | Paste this into OMP after placing the kit in the repo |
| `reference/ZIPPP-Prototype-v0.8.html` | Visual reference only, not production React Native code |

## Authority / conflict resolution

1. **User's current decisions as represented here** outrank prior ChatGPT prototypes and older specifications.
2. **Observed source code and tests** decide what is implemented today, not a previous document's status line.
3. `docs/13-CONTRACTS.md` and focused feature specs decide target behavior for new code; `docs/12-DECISIONS.md` marks unapproved architecture changes.
4. Existing released API behavior must be preserved or explicitly versioned; do not silently change a live contract.
5. Every externally observable claim requires a test, source inspection, or device/browser evidence.

## Known limits of the kit

This package was prepared from the 16 user-uploaded Markdown sources, earlier product decisions and a read-only glimpse of public GitHub `main`, **not** a copy of the user's latest local repository. It cannot certify local git status, private branches, deployment state, real model entitlements, Google account configuration, or current build health. OMP TASK-001 establishes those facts before writing code.

## Success criterion for the pivot

A new user can connect a personal Google Sheet, record income, scan receipts into an inbox, approve expenses, and see truthful cash-flow totals. A returning user can understand today/week/balance immediately, with clear pending/offline status. No duplicate writes, no fabricated data, no unapproved receipt in the ledger, and no dependency on Google Drive or Redis being perfectly available at all times.
