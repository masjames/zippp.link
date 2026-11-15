# TASK-001 — Establish an Evidence-Based Local Baseline

**Phase:** P0.1  
**Mode:** READ ONLY. NO code, Git index, branch, remote, cloud or data changes.  
**Allowed writes:** `.zippp-pivot/outputs/TASK-001-AUDIT.md`, `.zippp-pivot/omp/STATE.md` only.  
**Goal:** distinguish currently implemented, locally uncommitted and merely specified capabilities before any React Native migration.

## Inputs (minimum)

- `.zippp-pivot/omp/AGENT-RULES.md`
- `.zippp-pivot/omp/STATE.md`
- `.zippp-pivot/docs/02-EXISTING-SYSTEM.md`, headings relevant to an audit
- `.zippp-pivot/docs/12-DECISIONS.md`, conflicts section
- Root `AGENTS.md` and root `package.json` as **read-only current state**
- Current source files as needed; do not wholesale dump code to context

## Step 1 — Non-destructive orientation

- Confirm `git rev-parse --show-toplevel` is the expected repository; capture current branch/commit and `git status --short`, ignoring untracked secrets contents.
- Discover top-level directories and package/workspace manifests. Check presence of `src/`, `android/`, `spec/`, `.omp/`, tests, workflows, and any Expo/RN code.
- Collect versions: `node --version`, `npm --version`, `git --version`, available `bun`/`gradle`/`java` where relevant. If tools missing, record, do not install.
- Check Git remotes, but do not fetch/pull/push. Record hashes/remote names; redact user information or signed tokens if embedded.

## Step 2 — Targeted implementation map

Inspect exact files/functions for the following capabilities, recording **paths and evidence**, not copying huge files:

1. Sign-in and Google Sheets/Drive grant (web + Android/mobile bearer).
2. Sheet discovery/creation/append, row schema and `scanId` idempotency.
3. Existing OCR/provider chain, receipt review, local drafts, handling of failures.
4. Summary API/aggregation, Redis cache and account/balance support.
5. Current Android/Kotlin code, web/Next route structure, any Expo/React Native code.
6. Billing/subscription and Android paid-route restrictions.
7. Tests, local commands, known defects from `reference/legacy/00-audit-and-defects.md` and current code.

Label each capability **Implemented and directly evidenced**, **Partly implemented**, **Specified only**, **Unknown**, or **Broken/contradicted**. Do not infer deployment status from a comment.

## Step 3 — Evidence and safe report

- Run only read-only, bounded checks that cannot mutate app/data: for example targeted grep and `git diff --stat`. **Do not run build, npm install, auto-fix, database migrations, or tests with side effects in P0.1.** Record commands that would be needed for a later baseline verification.
- Compare at least the new target flows from `.zippp-pivot/docs/01-PRODUCT.md` with current capability. Mark **reuse**, **adapter**, **new feature**, or **retire later**, each with confidence.
- List critical blockers: dirty worktree, missing OAuth, old API divergence, unknown Sheet mapping, mobile redirect mismatch, mistaken billing assumptions and security risks.
- Recommend the narrowest P0.2 baseline verification plan (not code changes).

## Output format

Write `.zippp-pivot/outputs/TASK-001-AUDIT.md`:

```markdown
# TASK-001 Local Baseline
Date / repo root / branch / commit / status (redacted)
## What exists (table: capability | implementation paths | evidence | confidence)
## What is only specified
## Conflicts with pivot and old specs
## Existing working assets to preserve
## Defects and high-risk unknowns
## Safe baseline verification commands for P0.2
## Recommendation / required owner approvals
```

Update `.zippp-pivot/omp/STATE.md` with status `AWAITING OWNER REVIEW`, path to output and explicit blocker. No modifications elsewhere. Finish by reporting ≤250 words with what was inspected, result file, unresolved issues and requested approval.

## Acceptance criteria

- No application code or Git state changes.
- Report separates evidence from assumptions; exact implementation paths listed.
- No secret values or user finance data leaked.
- 6 capability groups above covered; if a group cannot be inspected, mark **Unknown**.
- Safe P0.2 task proposed; nothing deployed or migrated.
