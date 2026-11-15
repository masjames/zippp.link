# ZIPPP Pivot Kit — Executable OhMyPi Handoff

**Version:** 2026-11-15 executable handoff | **Scope:** preparing and safely auditing the **existing** ZIPPP repository, not pretending the migration has been implemented.

This archive contains 14 focused product/architecture/workflow documents (`docs/00` through `docs/13`), legacy reference specifications, the approved v0.8 HTML visual reference, and operational OMP setup including a non-destructive installer, single-model settings example, first read-only task, and exact start prompt.

## Three steps

1. **Unzip**, then run `bash scripts/install-into-repo.sh /absolute/path/to/existing/zippp`. It will only create `<repo>/.zippp-pivot/`; it refuses to overwrite that folder and does not edit app code, the root `AGENTS.md`, the repo's `.omp/config.yml`, or Git refs.
2. `cd /absolute/path/to/existing/zippp`. Read `.zippp-pivot/docs/11-OMP-SETUP.md`, sign into Codex in OhMyPi, and verify `openai-codex/gpt-6-luna` is actually working with a small no-tools smoke test.
3. Start `omp --model 'openai-codex/gpt-6-luna' --thinking medium` and paste `.zippp-pivot/omp/START-PROMPT.md`. The agent's first task is an **audit only**. It writes its audit under `.zippp-pivot/outputs/` and waits for your review.

To preview installer actions: `bash scripts/install-into-repo.sh --dry-run /absolute/path/to/existing/zippp`.

## The safety promise

- **No destructive repo mutation** from the installer. No automatic overwrites. No hidden OAuth, sheet, billing, or deployment actions.
- **No live code changes in the first OMP task**. Existing ZIPPP contains Google auth, receipt/OCR and billing code and old Android UI; it must be inventoried before migration.
- **No fake validation claims**. Installer and static package were tested in the assembly environment. User's local app, devices, model credentials, Sheet data and deployed services have not been tested from this archive.

## Workflow source

Inspired by OpenGSD's five-stage loop: https://docs.opengsd.net/core/concepts/workflow . ZIPPP substitutes one small serial slice for multi-agent planning fan-out to reduce redundant context. OMP references: https://github.com/can1357/oh-my-pi .

## Most important files

- `docs/00-START-HERE.md` — reading order
- `docs/01-PRODUCT.md` — current ZIPPP vision and scope
- `docs/04-LEDGER-SYNC.md` — durable money and sync contract
- `docs/09-ROADMAP.md` — phased migration
- `docs/10-LEAN-GSD.md` — efficient loop
- `docs/11-OMP-SETUP.md` — actual OMP setup
- `docs/12-DECISIONS.md` — conflicts and owner gates
- `docs/13-CONTRACTS.md` — future ledger invariants
- `omp/START-PROMPT.md` — paste this into OMP
- `omp/TASK-001-AUDIT.md` — first safe executable task

**Do not run a mass repo rewrite.** Start with an evidence-based audit and protect user financial records.
