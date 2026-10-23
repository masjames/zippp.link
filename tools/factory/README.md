# Zippp Software Factory

Local-first Product OS. Markdown entities on disk, a Go daemon, a React UI.

## Check

```bash
tools/factory/scripts/check.sh
```

## Run

Terminal A: `nvim --listen /tmp/zippp-nvim.sock`
Terminal B: `tools/factory/bin/factory -config tools/factory/factory.config.json`
Terminal C: `cd tools/factory/web && npm run dev`

Build the daemon first:

```bash
cd tools/factory/daemon && go build -o ../bin/factory .
```

Open http://127.0.0.1:5173.

## Config

`factory.config.json`: `repo_root`, `entities_root`, `listen`,
`allowed_origins`, `verify` limits and commands, `editor` socket and focus
command, `reports_dir`.

## Done

Move an entity to `status: verify` in Neovim. The daemon checks trace markers,
ERD models, the test command, and the prod endpoint. Only when every configured
check passes does it rewrite the status to `done`. A failure keeps the card in
`verify`; fix the code and click Re-verify.

Only `spec/themes/03-zippp-software-factory/entities/` is indexed.
