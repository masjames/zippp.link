# 11 — OhMyPi Setup for ZIPPP

**Status:** operational guide; verify commands against installed OhMyPi version.  
**Execution constraint:** a single model, `openai-codex/gpt-6-luna`, authenticated with the user's own ChatGPT/Codex account. No API-key fallback, auto-switched providers, or multi-agent fan-out.

## Prerequisites

- Existing, backed-up ZIPPP local repository and Git installed.
- `omp` installed and visible on `PATH` (`command -v omp`; `omp --version`). Install using the current official instructions at https://github.com/can1357/oh-my-pi#install, if necessary. Do not run arbitrary installers without reviewing them first.
- Sign into OhMyPi with the Codex provider: start `omp`, run `/login`, select **OpenAI Codex** (provider ID `openai-codex`), and finish its OAuth flow. Provider UI and login syntax may change by version.
- Verify model discovery, for example `omp models refresh` followed by `omp models openai-codex`. **Confirm the exact model selector exists.** The presence of the model in the catalog does not guarantee the account can generate; run a small inference smoke test.
- Example smoke test (no repository data): `omp --no-session --no-tools --no-title -p --model 'openai-codex/gpt-6-luna' --thinking low 'Reply with the word OK only.'`. If an installed version lacks a flag, consult `omp --help`. Do not silently switch to direct OpenAI API billing or another model.

## Strict single-model project settings

The kit includes `omp/omp-config.example.yml` for the project's `.omp/config.yml`, **but the installer does not replace any existing `.omp/config.yml`**. Use this example only after comparing it with the current project settings. In particular:

```yaml
modelRoles:
  default: openai-codex/gpt-6-luna
  smol: openai-codex/gpt-6-luna
  slow: openai-codex/gpt-6-luna
  plan: openai-codex/gpt-6-luna
  commit: openai-codex/gpt-6-luna
  task: openai-codex/gpt-6-luna
retry:
  modelFallback: false
  fallbackChains:
    default: []
    smol: []
    slow: []
    plan: []
    commit: []
    task: []
advisor:
  enabled: false
cycleOrder:
  - default
```

**Important:** This minimizes switching for *chat roles*, but OMP may have separately configured tool-kind roles (web/image/search) and local services. For strict one-model work, the agent must not spawn subagents, invoke adviser/AI reviewers, or invoke model-based media/search tools. Plain shell, git, typecheck, tests and local docs remain permitted. The launch command explicitly pins the model even if the config is not installed.

Use `omp config list` to check current settings and `omp --model 'openai-codex/gpt-6-luna' --thinking medium` to start an interactive session. Paste the contents of `.zippp-pivot/omp/START-PROMPT.md` into that session. `omp`'s project instructions may also load the pre-existing root `AGENTS.md`; the pivot starts read-only specifically to expose conflicts before editing that file.

## Installation of the kit

1. Unzip the kit anywhere outside the existing repo.
2. From the kit folder run `bash scripts/install-into-repo.sh /absolute/path/to/your/zippp`. This only copies the kit to `<repo>/.zippp-pivot/` and refuses to overwrite an existing installation.
3. `cd /absolute/path/to/your/zippp`; inspect `.zippp-pivot/README.md` and optionally run `bash .zippp-pivot/scripts/check-repo.sh`.
4. Start OMP using the exact selector above; paste `START-PROMPT.md`.
5. The **first task is read-only**. The agent must write an audit *only inside* `.zippp-pivot/outputs/` after verifying current git status and the real code. Do not approve a migration, commit, deploy or destructive action automatically.

## Guardrails and failure handling

- If Codex OAuth fails, resolve that first. ChatGPT subscription use is subject to plan access and limits; it is not guaranteed free/unlimited API use.
- If the repository has uncommitted work, record filenames and status without printing contents; **no clean/reset/stash/branch checkout** without permission.
- Do not echo `.env`, credentials, JWT, OAuth tokens, personal Google Sheet IDs, real receipt content, or signed URLs.
- Do not read the 1,864-line legacy context file on every task; consult specific sections when required.
- Make **no production writes** to Sheets, Drive, billing or database during the first audit.
- Work in a dedicated pivot branch only after a clean baseline has been captured and the user approves its creation.

## Token efficiency, empirically

Track actual per-slice prompt/output usage when OMP exposes it, rework cycles, time to verified acceptance and defect escape rate. Single-model and small files reduce repeated-context overhead but **are hypotheses** about overall efficiency, not proof that fewer tokens will be consumed.

### Reference URLs
- OpenGSD phase loop: https://docs.opengsd.net/core/concepts/workflow
- OMP installation and CLI: https://github.com/can1357/oh-my-pi
- OMP config and roles: https://github.com/can1357/oh-my-pi/blob/main/docs/settings.md
- OMP provider auth: https://github.com/can1357/oh-my-pi/blob/main/docs/providers.md
