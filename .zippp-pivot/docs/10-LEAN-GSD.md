# 10 — LeanGSD for ZIPPP: One Model, Low Token Waste

**Based on:** OpenGSD Core's `Discuss → Plan → Execute → Verify → Ship`, context-management principles and durable artifacts. **Different by design:** no default researcher/planner/verifier subagent fan-out and no repeated whole-project reading. One GPT-6 Luna instance in OMP does small tasks sequentially, with tests as the independent evidence.

## The loop

```text
INTAKE (task id + relevant requirement)
    ↓
DISCUSS only ambiguity that changes code or data integrity
    ↓
PLAN one vertical slice (2–3 atomic substeps)
    ↓
EXECUTE targeted changes (read minimal files)
    ↓
VERIFY commands + goal-backward acceptance
    ↓
SHIP commit + concise STATE / NEXT task
    ↺  fresh OMP conversation for the next slice
```

## Why this can use fewer tokens

OpenGSD's default pipeline may create many broad planning and review contexts. A single-model route avoids overhead for familiar tasks, but **cannot honestly guarantee a lower overall token bill**, since complex mistakes or insufficient research can cost more. The objective is lower average wasted context per *verified outcome*, not maximum compression at the cost of failures.

## Standing context budget (rules of thumb, not enforced counts)

- `omp/AGENT-RULES.md`: approximately 1 page, stable invariant and procedure only.
- `omp/STATE.md`: at most ~120 lines of current status, decisions, blockers, next task, no transcripts.
- One `TASK-*.md` with ≤3 substeps and acceptance, normally ≤150 lines.
- Read domain spec **sections matching task only**, via headings and targeted `sed/rg`, plus exact implementation files.
- Avoid full context file (`zippp-context-for-claude.md`, 1,800+ lines) in every task. It is archived evidence, read on demand.
- Prefer precise shell searches (`rg` exact symbol + narrow surrounding lines), test snippets and diffs rather than entire large files.
- Target a fresh session per slice; no reliance on previous chat. Summarize only changes and next state.

## Default task phases

### A. Discuss (when needed, not perfunctory)
Ask only when a change is irreversible, has multi-way product meaning, changes money classification, requires new OAuth scope, changes billing or privacy policy, or overturns an explicit owner decision. For minor file structure/presentation, use established conventions.

### B. Plan
Specify the user-visible outcome, source-of-truth contract, exact files/symbols likely touched, tests and rollback. Keep to 1–3 small substeps. Add research only if current API/library version unknown.

### C. Execute
Read relevant files, make smallest safe change, maintain import/route contracts and i18n. Avoid speculative refactor and unrelated formatting churn. Update tests with behavior changes. Use controlled shell output and never reveal credentials.

### D. Verify
Run smallest targeted test while iterating, then a broader package gate at task completion. Verify the requested user outcome, not just compile green. For UX tasks take screenshot; for accounting run invariant fixtures; for Google routes use sandbox integration when available.

### E. Ship
Git commit exact paths (`git add file1 file2`, not `git add -A`); include test evidence in a brief `SUMMARY.md`; update `STATE.md` with next slice and blocker. If tests fail, mark `blocked`, do not fabricate “done.”

## STOP rules

- Dirty worktree with unknown uncommitted user changes → do not reset, stash or overwrite automatically. Audit first.
- Proposed `gpt-6-luna` is not actually available under Codex OAuth → stop and ask owner; do not silently use other model/API.
- User Sheet schema ambiguous or migration risk high → read old mapping, write ADR, do not mutate user data.
- Permission boundary unclear or Drive backup unsafe → stop before enabling uploads.
- Repeated two attempts without progress → capture exact failure in `STATE.md`, propose one scoped correction rather than repeated blind retries.
- Production deployment, destructive migration or billing plan change → require separate explicit owner approval.

## Minimal on-disk execution state

```text
omp/AGENT-RULES.md               stable pivot rules
omp/STATE.md                     current position, ≤120 lines
pivot/decisions/ADR-*.md       irreversible product decisions, each one page
pivot/tasks/TASK-XXX.md        work order for next slice
pivot/outputs/TASK-XXX.md      verified result and open failures
pivot/audit/AS-BUILT.md        audited starting point
```

The full reference kit lives outside the hot path. A fresh agent reads `omp/AGENT-RULES.md`, `omp/STATE.md`, and the active task's linked contract; pre-existing root `AGENTS.md` remains visible as legacy constraints.

## Token and context efficiency techniques

1. **Read once per task, not per thought.** Record code paths and signatures in task notes.
2. **Scope grep output.** Search for exact API/identifier before reading files.
3. **Keep tool output bounded.** Avoid dumping giant git diffs or test logs into chat; save full logs to files, show last failure context.
4. **Minimize parallel agents.** One model is enough for atomic slices; specialized research only for actual unknowns, through the same model.
5. **Prefer deterministic scripts/tests to asking the model to reread results.** Write unit tests for money logic instead of mental arithmetic in prompts.
6. **Use stable prompts and contracts** to benefit from prompt caching where available, but do not trigger paid cache warming without checking costs.
7. **Retire obsolete specs into archive** after successful migration; only one authority per contract in active docs.
8. **Do not over-automate execution.** Auto-running unreviewed destructive tasks is expensive and unsafe for a financial product.
9. **Verify token use from actual OMP session stats**, report `tokens per verified slice`, tests passed, files touched and correction cycles.

## Metrics that matter

Tokens or session time are not the definition of success. Monitor: verified slices per 100k consumed tokens, regression rate, production incident rate, user-flow completion quality and rework rate. If a smaller prompt causes repeated mistakes, add exactly the missing contract paragraph rather than returning to enormous monolithic prompts.
