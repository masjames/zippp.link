# TASK-007 — Durable Web Draft Recovery

**Status:** COMPLETE — focused/full tests, typecheck, build, and browser verification passed with synthetic data. No Sheets, Drive, OAuth, billing, or production configuration was changed.

## Evidence
Before this task, `AppProvider.tsx` restored interrupted reads as `ready` without receipt data and could strand accepted items. `batch-db.ts` resolved writes before IndexedDB transaction commit.

## Scope
- Restore interrupted reads to the extraction queue and interrupted/accepted sends to explicit review, without automatically sending.
- Treat storage operations as successful only after their IndexedDB transaction commits; preserve existing records and schema.
- Add deterministic regression coverage for recovery and transaction abort handling.
- Show a localized warning when draft storage fails, so users know drafts may not persist after leaving the page.
- Do not claim encrypted offline storage or account isolation; those remain unresolved.

## Verification

See `.zippp-pivot/outputs/TASK-007-DRAFT-RECOVERY-RESULTS.md` for commands, browser evidence, and remaining limitations.
