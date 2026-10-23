# Zippp Software Factory

Local-first Product OS for zippp. Markdown entities on disk, a Go daemon, and a
React command center.

## Layout

```text
daemon/   Go indexer, watcher, WebSocket hub, verifier
web/      React and Vite command center
scripts/  check.sh, check-daemon.sh, check-web.sh
```

Entities are indexed only from
`spec/themes/03-zippp-software-factory/entities/`.

## Run

```bash
tools/factory/scripts/check.sh
cd tools/factory/web && npm run dev
tools/factory/bin/factory -config tools/factory/factory.config.json
```

Terminal bridge:

```bash
nvim --listen /tmp/zippp-nvim.sock
```

Open `http://127.0.0.1:5173`. A card reaches `done` only when every configured
check passes and the daemon rewrites the status.

## Config

`factory.config.json` owns the repo root, entities root, listen address,
allowed origins, verification limits, editor socket, and reports directory.
