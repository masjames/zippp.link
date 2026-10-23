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

## Done

Move an entity to `status: verify` in your editor. The daemon checks trace
markers, ERD models, the test command, and the prod endpoint. Only when every
configured check passes does it rewrite the status to `done`. A failure keeps
the card in `verify`; fix the code and click Re-verify.

Only `spec/themes/03-zippp-software-factory/entities/` is indexed.
