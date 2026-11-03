# Zippp Software Factory

Local-first Product OS. Markdown entities on disk, a Go daemon, a React UI.

## Check

```bash
tools/factory/scripts/check.sh
```

## Run

```bash
cd tools/factory/daemon && go build -o ../bin/factory .
tools/factory/bin/factory -config tools/factory/factory.config.json
```

In another terminal:

```bash
cd tools/factory/web && npm run dev
```

Open http://127.0.0.1:5173.

## Config

`factory.config.json`: `repo_root`, `entities_root`, `listen`,
`allowed_origins`, `verify` limits and commands, `llm` provider, `reports_dir`.
The Groom tab uses the key in `.factory-key` or `ZIPPP_FACTORY_LLM_API_KEY`.

## Build this

1. Groom a feature/bug/story (or open an `in-progress` / `verify` card).
2. Click **Build this** (Direction “Next buildable” or the detail header).
3. Daemon writes `tools/factory/.briefs/<ID>.md`, flips `todo`/`verify` →
   `in-progress`, opens **Ghostty** → **omp** (**DeepSeek Flash**).
4. When the card hits `verify`/`done`/`blocked`, Factory **stops omp** (stop
   file + SIGTERM) and auto-runs the verifier. Pass → `done`; fail → stays
   `verify` with **Build again**.
5. UI shows agent phase from `.briefs/<ID>.status.json`.

Uses `tools/factory/.factory-key` as `DEEPSEEK_API_KEY`. Writes
`~/.omp/agent/models.yml` on first run (DeepSeek tool/thinking compat).

Manual fallback:

```bash
tools/factory/scripts/spawn-build.sh FEAT-113
tools/factory/scripts/run-omp-build.sh FEAT-113
```

Factory orchestrates only — it does not edit `src/` or `android/`.

## Done

Move an entity to `status: verify` in your editor. The daemon checks trace
markers, ERD models, the test command, and the prod endpoint. Only when every
configured check passes does it rewrite the status to `done`. A failure keeps
the card in `verify`; fix the code and click Re-verify.

Only `spec/themes/03-zippp-software-factory/entities/` is indexed.
