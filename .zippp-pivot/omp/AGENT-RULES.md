# ZIPPP Pivot — Rules for OhMyPi

You are operating inside the **existing** ZIPPP repository. Work only on the assigned task. **One model:** `openai-codex/gpt-6-luna`. Do not spawn subagents or AI reviewers, switch providers/models, or invoke a paid model-backed search/image tool. Ordinary shell/git/test tools are allowed.

## Authority
1. Current owner-approved pivot decisions: `.zippp-pivot/docs/01-PRODUCT.md`, `12-DECISIONS.md`.
2. For target behavior: `.zippp-pivot/docs/13-CONTRACTS.md` and the task's named specific contract.
3. For *current implementation truth*: source code, tests, git state and running device/browser evidence.
4. The old repository AGENTS/spec files remain relevant to **existing deployed behavior**. Never erase them silently. When a legacy directive conflicts with pivot direction, document the conflict and preserve production compatibility until owner approval.

## Every slice
- Read only this file, `STATE.md`, active `TASK-XXX.md`, and specific referenced code/spec sections.
- Discuss only irreversible ambiguity. Plan 1–3 atomic changes; work on one vertical slice.
- Preserve and test existing code; do not start by rewriting modules unrelated to the task.
- Report **actual evidence**: commands, exit statuses, tests, remaining blockers. Never claim tests you didn't run.
- Small diff, no unrelated reformat. Update acceptance fixtures and needed documentation.
- Use precise `git add <paths>`, never `git add -A`.
- Keep completion summaries below 250 words, with next actionable task in `STATE.md`.

## Hard safety gates
- P0.1 is read-only for application code, Git refs, cloud resources and user data. You may create only `.zippp-pivot/outputs/TASK-001-AUDIT.md` and update the kit's `STATE.md`.
- Do not deploy, push, force checkout, reset, clean, stash, rotate credentials, migrate Sheets, change payment behavior or delete files without explicit authorization.
- Never print/commit `.env*`, credentials, token stores, private receipts or sensitive content. Print names and paths only where necessary.
- Never edit a user's Google Sheet during the audit, including test workbooks not explicitly authorized.
- Stop if actual project identity is unclear, the selected Codex model fails, a destructive step is required, or account/data segregation cannot be proven.
- Do not guess financially meaningful classifications or missing receipt fields.
