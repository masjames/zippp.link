# Zippp Software Factory: Pi Build Brief

**Version:** 1.0 | **Date:** 2026-10-23 | **Executor:** Pi on DeepSeek | **Host:** macOS
**Repo:** `github.com/masjames/zippp.link` | **Local:** `/Users/mm/Dev/adit/zippp`

If you lose context: re-read `tools/factory/PROGRESS.md`, then continue at the first unchecked milestone. If a copy of this brief exists at `spec/themes/03-zippp-software-factory/zippp-factory-pi-brief.md`, re-read the section you need, not the whole file.

---

## 0. Mission

Build the **Factory** inside the zippp repo at `tools/factory/`.

The Factory is a local-first Product OS with three parts:

1. **Go daemon.** Indexes markdown entity files, watches them, broadcasts state over WebSocket, and runs a spec-to-code verification engine.
2. **React web UI.** Kanban, list, dependency tree, markdown detail, ERD diagrams, verification results, "Edit in Terminal".
3. **Verifier.** When an entity moves to `status: verify`, it checks trace IDs in code, runs a test command, optionally calls a live URL, and only then rewrites the entity to `status: done`.

The Factory only **reads** product code. It never edits `src/` or `android/`.

**Done means:** every gate in section 6 passes, the self-test e2e passes, and you stop for the human tactile test (section 8). Nothing else.

---

## 1. Rules of engagement (binding)

| # | Rule |
|---|---|
| R1 | One milestone at a time. Do not start M(n+1) until M(n) gate passes and is committed. |
| R2 | Write complete files. No placeholders, no `TODO`, no `// rest unchanged`, no `...`. |
| R3 | Save tokens. Do not re-read files you just wrote. Do not `cat` big files. Pipe logs through `tail -n 40`. Re-run only the failing test first (`go test -run Name`). |
| R4 | Fix loop. Read the first 40 lines of the error. Fix the root cause. Re-run. Same error 3 times: change approach (see section 7). 6 fix cycles in one milestone: write `tools/factory/BLOCKED.md` (what failed, exact error, what you tried) and stop. |
| R5 | Contracts in section 5 are law. If a contract is silent, pick the simplest option, add one line to `tools/factory/NOTES.md`, and continue. Do not ask questions unless blocked. |
| R6 | Dependencies: only those listed in section 2. No other `go get` or `npm i`. |
| R7 | Scope fence. You may edit only: `tools/factory/**`, `spec/themes/03-zippp-software-factory/entities/**`, and one line in root `tsconfig.json` (the `exclude` array). If the root test runner picks up factory tests, you may add one exclude line to its config. Nothing else. |
| R8 | Never touch: `src/`, `android/`, `spec/wording.txt`, `.env*`, root `scripts/`, `vercel*`, root `package.json`, `next.config.ts`, Production env. |
| R9 | Git: work on branch `factory/software-factory`. Commit with explicit pathspecs only. Never `git add -A`, `git add .`, `--no-verify`, `reset --hard`, `clean`, or `push`. The worktree already has uncommitted pivot work that is not yours. Leave it alone. |
| R10 | Secrets: never read or print `.env*`, tokens, or the Vercel Preview bypass value. Network allowed only for npm and Go module downloads and `127.0.0.1`. |
| R11 | Update `tools/factory/PROGRESS.md` after each gate (3 lines max: milestone, result, commit hash). |
| R12 | Honesty. Report exact gate output. Never write "done" if any gate fails. |
| R13 | Style. `gofmt`. Go stdlib first. TypeScript `strict`. No `any` except for parsed JSON at the boundary. No em dashes in any text, comment, or UI string. |
| R14 | Long-running processes (daemon, vite): start with `&`, save the PID, kill it when the check ends. Never leave one running. |

---

## 2. Ground truth

| Item | Value |
|---|---|
| Product | zippp: photograph a receipt, extract fields, human checks, append rows to the user's own Google Sheet. |
| Product code (read-only for you) | TypeScript in `src/` (Next.js, e.g. `src/types/receipt.ts`, `src/lib/**`), Kotlin in `android/app/src/main/java/link/zippp/app/**` |
| Factory code (yours) | `tools/factory/` |
| Entity files | `spec/themes/03-zippp-software-factory/entities/{features,bugs,stories,diagrams}/**/*.md` |
| Daemon | Go >= 1.22, flat `package main`, module name `zippp-factory`, listens on `127.0.0.1:8080` |
| Web | Vite 5, React 18, TypeScript 5, Tailwind 3, DaisyUI 4, Vitest 2, Node >= 18.18 |
| Editor | Neovim in Herdr (macOS) |
| Root baseline (snapshot) | `npm test`: 43 passing. `npx tsc --noEmit`: pass. `npm run build`: pass. |

**Allowed dependencies (exact):**

```text
Go:  github.com/fsnotify/fsnotify@v1.7.0
     github.com/gorilla/websocket@v1.5.3
     gopkg.in/yaml.v3@v3.0.1
Web: react@18 react-dom@18 react-markdown@9 remark-gfm@4
     dev: vite@5 @vitejs/plugin-react@4 typescript@5 @types/react@18 @types/react-dom@18
          tailwindcss@3 postcss autoprefixer daisyui@4 vitest@2
```

**Factory state rule:** state is markdown files on disk. No Postgres, SQLite, Redis, or any database.

---

## 3. Corrections to the master spec (these override it)

| # | Master spec says | Do this instead |
|---|---|---|
| 1 | fsnotify uses macOS FSEvents. | False. On macOS fsnotify uses **kqueue**, is **not recursive**, and opens one fd per watched dir and file. Add every directory yourself. Add new dirs on Create events. On every debounced event do a **full rescan** of the entities root. No incremental logic. |
| 2 | Daemon crawls `spec/` recursively. | Index **only** `entities_root`. Long prose specs are not entities. |
| 3 | 4 milestones (context file says 5). | Use M0 to M7 in section 6. Mapping: master M1 = M1, M2 = M3, M3 = M4, M4 = M5, context M5 = M7. M2, M6 are supporting steps. |
| 4 | `test_command` runs in a shell. | Run as **argv, no shell**. Allowlist of first tokens. Reject shell operators. Same deterministic result, no injection. |
| 5 | Failure behavior is unspecified. | On any failed check: status stays `verify`, report is written, UI shows it, no auto retrigger. Human fixes code and clicks Re-verify. |
| 6 | Empty `verification` is unspecified. | An entity with no checks defined must **never** pass. Result: failed, message "nothing to verify". |
| 7 | "Focus the file in Neovim in Herdr". | The Herdr CLI is unknown. Do **not** guess it. Use `nvim --server <sock> --remote <abs path>`. Add an optional `focus_command` argv in config, default empty. |
| 8 | Render with `eraserlabs/eraser-diagrams`. | That package is unverified and the hosted Eraser renderer may need an API key. Ship a **local SVG ERD renderer** first (M4). The native package is an optional, time-boxed probe at the end of M4. |
| 9 | ERD scan targets Prisma/GORM. | Zippp has neither. Scan TypeScript `interface`/`type`/`class`, Kotlin `class`/`object`, Go `struct`, Prisma `model` by regex (section 5.8). |
| 10 | Browser is read-heavy. | Browser may send only `resync`, `verify`, `edit`. It can never write entity files. |
| 11 | WebSocket on localhost. | Bind loopback only. Check `Host` and `Origin` on every request. Otherwise any web page could trigger local commands. |
| 12 | `prod_endpoint` check. | Vercel Preview is SSO protected, so preview URLs return 401. Never add the bypass header. Mobile routes return 404 in Production while dark. That is correct behavior. Leave `prod_endpoint` empty for mobile features. |
| 13 | Zippp copy lives in `spec/wording.txt`. | That rule is for the product. Factory UI strings are exempt. Keep them plain English, no hype words. |

---

## 4. Target file tree

```text
tools/factory/
├── factory.config.json
├── README.md          run instructions (max 40 lines)
├── NOTES.md           decision log, one line per decision
├── PROGRESS.md        milestone checklist
├── .gitignore         bin/  .reports/  web/node_modules/  web/dist/
├── scripts/           check.sh  check-daemon.sh  check-web.sh
├── testdata/selftest/ trace-target.ts  ok.js              (M7)
├── daemon/
│   ├── go.mod  go.sum
│   ├── main.go        flags, calls NewApp, http.Server, graceful shutdown
│   ├── app.go         NewApp, Handler, Start, Close, rescan loop wiring
│   ├── config.go      Config, LoadConfig
│   ├── server.go      routes, hostGuard, /healthz, /api/snapshot
│   ├── hub.go         WebSocket hub, clients, Broadcast
│   ├── watcher.go     recursive kqueue-safe watcher + debounce
│   ├── spec.go        Entity types, ParseEntity, fmRe
│   ├── store.go       Store, Rescan, Diff, results
│   ├── rewrite.go     replaceStatus, SetStatus (atomic)
│   ├── eraser.go      block extraction, ERD entity parse, norm
│   ├── verifier.go    Verifier, checks, runCommand, parseCommand   // @implements FEAT-111
│   ├── editor.go      OpenInEditor
│   └── *_test.go
└── web/
    ├── package.json  tsconfig.json  vite.config.ts  tailwind.config.js
    ├── postcss.config.js  index.html
    └── src/
        ├── main.tsx  index.css  App.tsx  types.ts  state.ts  state.test.ts
        ├── useFactorySocket.ts
        ├── lib/tree.ts  tree.test.ts  eraser.ts  eraser.test.ts
        └── components/ StatusBar EntityList KanbanBoard DepTree DetailPane
                        VerifyPanel MarkdownView EraserBlock ErrorBoundary

spec/themes/03-zippp-software-factory/entities/{features,bugs,stories,diagrams}/   (.gitkeep each)
```

---

## 5. Contracts

### 5.1 Entity file

````markdown
---
id: FEAT-900
type: feature
title: Factory selftest
status: todo
assignee: pi-agent
relations:
  blocks: []
  implements: []
  depends_on: []
verification:
  target_files: ["tools/factory/testdata/selftest/trace-target.ts"]
  test_command: "node tools/factory/testdata/selftest/ok.js"
  prod_endpoint: "http://127.0.0.1:8080/healthz"
---
Markdown body. Eraser blocks use a fenced block with the language `eraser`.
````

### 5.2 Validation (parse errors are per file, never fatal)

| Field | Rule |
|---|---|
| frontmatter | Must match `fmRe` (below). Else error "missing frontmatter". |
| yaml | Must parse. Else error with the yaml message. |
| `id` | Required. Regex `^[A-Z][A-Z0-9]*-[0-9]+$`. |
| `type` | One of `feature bug story spec diagram`. |
| `status` | One of `todo in-progress blocked verify done`. |
| `title` | Required, non-empty. |
| `assignee` | Optional string. |
| `relations.*`, `verification.target_files` | Optional. `null` becomes `[]`. Dangling relation ids are allowed. |
| duplicate `id` | Sort files by path. First wins. Others get error "duplicate id X (also in <path>)". |

Shared regexes (Go). Use `fmRe` in both `ParseEntity` and `replaceStatus`:

```go
var fmRe = regexp.MustCompile(`(?s)\A---\r?\n(.*?)\r?\n---[ \t]*\r?(?:\n|\z)`)
// group 1 = frontmatter text. body = raw[loc[1]:]
var statusRe = regexp.MustCompile(`(?m)^status:[ \t]*[^\r\n]*`)
var idRe = regexp.MustCompile(`^[A-Z][A-Z0-9]*-[0-9]+$`)
```

### 5.3 JSON shapes

JSON slices must never be `null`. Always initialize to `[]`. The UI assumes arrays.

```jsonc
// Entity
{ "id":"FEAT-900", "type":"feature", "title":"", "status":"todo", "assignee":"",
  "relations":{"blocks":[],"implements":[],"depends_on":[]},
  "verification":{"target_files":[],"test_command":"","prod_endpoint":""},
  "path":"spec/themes/.../entities/features/FEAT-900.md",   // repo-relative, forward slashes
  "body":"...", "hash":"<first 12 hex of sha256 of file bytes>" }

// ParseError
{ "path":"...", "message":"..." }

// Result
{ "id":"FEAT-900", "started_at":"RFC3339 UTC", "finished_at":"RFC3339 UTC",
  "passed":true, "wrote_status":true, "message":"",
  "checks":[ { "name":"static|model|test|prod", "status":"pass|fail|skip",
               "detail":"", "output":"", "duration_ms":0 } ] }
```

### 5.4 WebSocket protocol (`ws://127.0.0.1:8080/ws`)

Server to client:

| type | seq | fields |
|---|---|---|
| `snapshot` | current | `entities[]`, `errors[]`, `verifications{id:Result}`. Sent automatically on connect and on `resync`. |
| `diff` | new | `upserts[]` (Entity), `removed[]` (ids), `errors[]` (full current list). Idempotent. |
| `verification_started` | new | `id` |
| `verification` | new | `result` (Result) |
| `editor_result` | none | `ok`, `message` |
| `error` | none | `message` |

Client to server: `{"type":"resync"}`, `{"type":"verify","id":"X"}`, `{"type":"edit","id":"X"}`. Unknown type: reply `error`.

Sequencing: `Hub.Broadcast` assigns `seq` under the hub mutex at send time, so seq order equals send order. Client rule: `seq <= last` ignore. `seq > last+1` send `resync`. Messages without seq are never checked.

Hub requirements: per-client buffered send chan (64), drop client when full, ping every 30s, read limit 64 KB, follow the gorilla chat example (readPump, writePump).

### 5.5 HTTP

| Route | Result |
|---|---|
| `GET /healthz` | `{"ok":true,"entities":N,"seq":S}` |
| `GET /api/snapshot` | Same body as the WS snapshot. |
| `GET /ws` | Upgrade. |

Guards on every route:

```go
func hostGuard(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h, _, err := net.SplitHostPort(r.Host)
		if err != nil { h = r.Host }
		h = strings.Trim(h, "[]")
		if h != "127.0.0.1" && h != "localhost" && h != "::1" {
			http.Error(w, "forbidden host", http.StatusForbidden); return
		}
		next.ServeHTTP(w, r)
	})
}
// Upgrader.CheckOrigin: allow empty Origin (non-browser clients), else Origin must be in allowed_origins.
```

Hostname only is checked (not port) so tests can use random ports.

### 5.6 Config (`tools/factory/factory.config.json`)

```json
{
  "repo_root": "../..",
  "entities_root": "spec/themes/03-zippp-software-factory/entities",
  "listen": "127.0.0.1:8080",
  "allowed_origins": ["http://localhost:5173","http://127.0.0.1:5173","http://localhost:8080","http://127.0.0.1:8080"],
  "verify": {
    "timeout_seconds": 120,
    "http_timeout_seconds": 10,
    "max_output_bytes": 65536,
    "allowed_commands": ["npm","npx","node","go","./gradlew","./android/gradlew"]
  },
  "editor": { "nvim_server": "/tmp/zippp-nvim.sock", "focus_command": [] },
  "reports_dir": "tools/factory/.reports"
}
```

`LoadConfig(path)`: `repo_root` is relative to the config file's directory. `entities_root` and `reports_dir` are relative to `repo_root`. Resolve all to absolute paths. Reject a `listen` host that is not `127.0.0.1`, `localhost`, or `::1`. Apply defaults for missing numbers. Create the four entity subdirs if missing.

### 5.7 Verification semantics

Trigger: Store detects `status == verify` and the previous status was not `verify`. New file appearing already in `verify` counts. The **first scan at startup never triggers**. Manual `verify` message is allowed only when the entity is currently `verify`.

Queue: one worker goroutine, queue size 32, dedupe by id. Per-entity cap 5 minutes.

Checks run in order. If `static` or `model` fails, `test` and `prod` are `skip` with detail "skipped: earlier check failed".

| Check | Runs when | Pass condition |
|---|---|---|
| `static` | `target_files` non-empty | Every file exists, is a regular file, <= 2 MB, resolves inside `repo_root`, and contains a trace marker listing this entity id. |
| `model` | body has an eraser block with entities | `target_files` non-empty (else fail "ERD defined but no target_files"). Every ERD entity and every field is found per 5.8. |
| `test` | `test_command` non-empty | `parseCommand` ok, argv[0] in `allowed_commands`, exit code 0 within `timeout_seconds`. |
| `prod` | `prod_endpoint` non-empty | URL scheme http or https, status exactly 200, and if the body is a JSON object with an `ok` key then `ok` is `true`. Body read limit 1 MB. |

`passed = no check failed AND at least one check passed`.

Trace marker regex (match entity id exactly, comma lists allowed):

```go
var traceRe = regexp.MustCompile(`@implements\s+([A-Za-z][A-Za-z0-9]*-[0-9]+(?:\s*,\s*[A-Za-z][A-Za-z0-9]*-[0-9]+)*)`)
// split group 1 on ",", TrimSpace each, compare == entity.ID
```

On pass, `process(id)`: re-read the file, re-parse, require same id and `status == verify`, then `SetStatus(...,"done")` atomically. If the human changed it meanwhile, discard the result and log. Write the report to `<reports_dir>/<id>.json`. Broadcast `verification`. The next rescan broadcasts the status `diff`.

Command execution (copy this):

```go
const denyChars = ";|&<>$`\n\r\\"

func parseCommand(s string) ([]string, error) {
	if strings.ContainsAny(s, denyChars) { return nil, errors.New("shell operators are not allowed") }
	var args []string
	var cur strings.Builder
	var quote rune
	has := false
	for _, r := range s {
		switch {
		case quote != 0:
			if r == quote { quote = 0 } else { cur.WriteRune(r) }
		case r == '"' || r == '\'':
			quote = r; has = true
		case r == ' ' || r == '\t':
			if has || cur.Len() > 0 { args = append(args, cur.String()); cur.Reset(); has = false }
		default:
			cur.WriteRune(r)
		}
	}
	if quote != 0 { return nil, errors.New("unterminated quote") }
	if has || cur.Len() > 0 { args = append(args, cur.String()) }
	if len(args) == 0 { return nil, errors.New("empty command") }
	return args, nil
}

type tailBuf struct{ max int; b []byte }
func (t *tailBuf) Write(p []byte) (int, error) {
	t.b = append(t.b, p...)
	if len(t.b) > t.max { t.b = t.b[len(t.b)-t.max:] }
	return len(p), nil
}

func runCommand(ctx context.Context, dir string, argv []string, timeout time.Duration, maxOut int) (string, int, error) {
	ctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()
	cmd := exec.CommandContext(ctx, argv[0], argv[1:]...)
	cmd.Dir = dir
	cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
	cmd.Cancel = func() error { return syscall.Kill(-cmd.Process.Pid, syscall.SIGKILL) }
	cmd.WaitDelay = 3 * time.Second
	tb := &tailBuf{max: maxOut}
	cmd.Stdout, cmd.Stderr = tb, tb
	err := cmd.Run()
	if ctx.Err() == context.DeadlineExceeded { return string(tb.b), -1, fmt.Errorf("timed out after %s", timeout) }
	var ee *exec.ExitError
	if errors.As(err, &ee) { return string(tb.b), ee.ExitCode(), nil }
	if err != nil { return string(tb.b), -1, err }
	return string(tb.b), 0, nil
}
```

Status rewrite (copy this). Only the `status:` line changes. All other bytes stay identical:

```go
func replaceStatus(raw []byte, to string) ([]byte, error) {
	loc := fmRe.FindSubmatchIndex(raw)
	if loc == nil { return nil, errors.New("no frontmatter") }
	s, e := loc[2], loc[3]
	fm := raw[s:e]
	if !statusRe.Match(fm) { return nil, errors.New("no status line") }
	newFM := statusRe.ReplaceAllLiteral(fm, []byte("status: "+to))
	out := make([]byte, 0, len(raw))
	out = append(out, raw[:s]...)
	out = append(out, newFM...)
	out = append(out, raw[e:]...)
	return out, nil
}
// SetStatus: read, ParseEntity, check id and from-status, replaceStatus,
// write to ".factory-tmp-<rand>" in the same dir with the original file mode, os.Rename over the target.
```

### 5.8 Eraser subset and ERD matching

Block extraction: a line starting with ```` ```eraser ```` opens a block. The next line starting with ```` ``` ```` closes it.

Grammar (Go and TypeScript parsers must both follow it):

| Line | Regex | Meaning |
|---|---|---|
| entity open | `^\s*([A-Za-z_][A-Za-z0-9_]*)\s*(\[[^\]]*\])?\s*\{\s*$` | start entity |
| entity close | `^\s*\}\s*$` | end entity |
| field (inside entity) | first token = name, second token = type (optional), tokens `pk`/`fk` flag | field |
| relation (TS only) | `^\s*([A-Za-z0-9_]+)(?:\.([A-Za-z0-9_]+))?\s+(<>\|<\|>\|-)\s+([A-Za-z0-9_]+)(?:\.([A-Za-z0-9_]+))?\s*$` | edge |
| anything else | ignore (comments `//`, `direction`, groups) | |

Relation ops: `<` one-to-many, `>` many-to-one, `-` one-to-one, `<>` many-to-many.

Name matching (copy this). Apply `norm` to both sides:

```go
func norm(s string) string {
	s = strings.ToLower(strings.NewReplacer("_", "", "-", "", " ", "").Replace(s))
	switch {
	case strings.HasSuffix(s, "ies") && len(s) > 4:
		return s[:len(s)-3] + "y"
	case strings.HasSuffix(s, "ss"):
		return s
	case strings.HasSuffix(s, "s") && len(s) > 3:
		return s[:len(s)-1]
	}
	return s
}
```

Declared names in code: `\b(?:interface|type|class|enum|struct|model|object)\s+([A-Za-z_]\w*)`. An ERD entity passes if `norm(entity)` equals `norm(declared)` for some declared name in any target file. A field passes if `norm(field)` equals `norm(token)` for some identifier token `[A-Za-z_]\w*` anywhere in the same target file where the entity matched. Known limit: fields are not scoped to the declaration. Document it in NOTES.md.

---

## 6. Milestones

Gate scripts (created in M0). Use them in every gate:

```bash
# tools/factory/scripts/check-daemon.sh
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../daemon"
test -z "$(gofmt -l .)" || { echo "gofmt needed:"; gofmt -l .; exit 1; }
go vet ./...
go test -race -count=1 ./... 2>&1 | tail -40
echo "DAEMON OK"
```

```bash
# tools/factory/scripts/check-web.sh
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../web"
npm run build 2>&1 | tail -25
npm test 2>&1 | tail -25
echo "WEB OK"
```

```bash
# tools/factory/scripts/check.sh   (runs both; web part only if web/package.json exists)
#!/usr/bin/env bash
set -euo pipefail
d="$(dirname "$0")"
"$d/check-daemon.sh"
[ -f "$d/../web/package.json" ] && "$d/check-web.sh"
echo "FACTORY CHECK OK"
```

Commit helper for every milestone (explicit pathspecs):

```bash
git add tools/factory spec/themes/03-zippp-software-factory/entities
git commit -m "factory: M<N> <name>"
```

---

### M0. Preflight (no feature code)

1. `git status --short | head -20; git branch --show-current; git log -1 --oneline`. Dirty files are the user's pivot work. Do not touch them.
2. `go version; node -v; npm -v; git --version; (nvim --version | head -1 || true); lsof -nP -iTCP:8080 -sTCP:LISTEN || true`. Need Go >= 1.22 and Node >= 18.18, else `BLOCKED.md`. If port 8080 is busy, do not kill it. Note it in `NOTES.md`. Tests use random ports.
3. Baseline at repo root: `npm test 2>&1 | tail -8` and `npx tsc --noEmit 2>&1 | tail -8`. Record results in PROGRESS.md. Do not fix failures here.
4. `git switch -c factory/software-factory` (or switch if it exists).
5. Create the entity dirs with `.gitkeep`, `tools/factory/` skeleton, the 3 scripts (`chmod +x`), `factory.config.json` (5.6), `.gitignore`, `PROGRESS.md` (checklist M0 to M7), `NOTES.md`, a short `README.md`.
6. Root `tsconfig.json`: run `git diff --quiet tsconfig.json`. Add `"tools/factory"` to `exclude` (keep existing entries). If the file had uncommitted edits before yours, do not stage it and note that in PROGRESS.md. Re-run `npx tsc --noEmit`. Result must equal baseline.

**Gate M0:** baseline recorded. Root `tsc` equals baseline. `git status --short -- tools spec/themes/03-zippp-software-factory tsconfig.json` shows only your files. Commit.

---

### M1. Daemon skeleton, watcher, static WebSocket (master M1)

Create: `go.mod` (`go mod init zippp-factory`, then `go get` the 3 pinned deps), `config.go`, `server.go`, `hub.go`, `watcher.go`, `app.go`, `main.go`.

Build notes:
- `NewApp(cfg *Config) (*App, error)`. `App.Handler() http.Handler` (with `hostGuard`). `App.Start(ctx)` starts watcher and loops. `App.Close()`. `main.go` only parses `-config` (default `../factory.config.json`), calls `NewApp`, runs `http.Server`, handles SIGINT/SIGTERM with a 5s graceful shutdown. Tests use `httptest.NewServer(app.Handler())`.
- Hub takes a `snapshotFn func() map[string]any`. In M1 it returns one static entity `FEAT-000` ("Hello factory", status `todo`) plus empty `errors` and `verifications`.
- Watcher: `NewWatcher(root string, debounce time.Duration, onChange func()) (*Watcher, error)` and `Close()`. Walk root and `Add` every dir. On Create of a dir, add it and its subdirs. Ignore Chmod. Ignore events whose base name starts with `.` or ends with `~`. Debounce with `time.AfterFunc` reset under a mutex (150 ms in prod). Call `onChange` in its own goroutine.
- In M1 `onChange` broadcasts an empty `diff` (`upserts:[]`, `removed:[]`, `errors:[]`).

Tests (must exist):
- `config_test.go`: relative path resolution, rejects non-loopback `listen`, defaults applied, dirs created.
- `server_test.go`: `/healthz` ok; bad `Host: evil.com` gives 403.
- `hub_test.go`: WS client receives `snapshot` with `seq >= 1` and entity `FEAT-000`; bad `Origin` is rejected; empty Origin allowed; `resync` returns a snapshot; unknown type returns `error`; seq increases across two broadcasts.
- `watcher_test.go` (poll up to 5s, never fixed sleeps): write file in subdir fires; new subdir then file fires; atomic save (write `.x.tmp` then rename to `a.md`) fires; dotfile alone does not fire within 500 ms.

**Gate M1:** `tools/factory/scripts/check-daemon.sh` prints `DAEMON OK`. Smoke:

```bash
cd tools/factory/daemon && go build -o ../bin/factory . && cd ../../..
tools/factory/bin/factory -config tools/factory/factory.config.json & echo $! > /tmp/factory.pid
sleep 1
curl -s 127.0.0.1:8080/healthz
curl -s -o /dev/null -w '%{http_code}\n' -H 'Host: evil.com' 127.0.0.1:8080/healthz          # expect 403
curl -si -H 'Connection: Upgrade' -H 'Upgrade: websocket' -H 'Sec-WebSocket-Version: 13' \
  -H 'Sec-WebSocket-Key: dGhlc2FtcGxlbm9uY2U=' -H 'Origin: http://evil.com' 127.0.0.1:8080/ws | head -1   # expect 403
kill $(cat /tmp/factory.pid)
```

Commit `factory: M1 daemon skeleton`.

---

### M2. Spec index: parse, store, diff, status rewrite (supporting)

Create: `spec.go`, `store.go`, `rewrite.go`. Edit `app.go`, `server.go`.

Build notes:
- Types per 5.3. Entity has both `json` and `yaml` tags. `Path`, `Body`, `Hash` are `yaml:"-"`. Normalize nil slices to empty.
- `ParseEntity(relPath string, raw []byte) (*Entity, error)` per 5.2.
- Store: `NewStore(cfg)`, `Rescan() (Diff, []string)` where the second value is ids that **became** `verify`. `Diff{Upserts []*Entity; Removed []string; Errors []ParseError; Changed bool}`. `Snapshot()`, `Get(id)`, `SetResult(Result)`, `Results()`.
- `Rescan` walks `entities_root` with `filepath.WalkDir`. Only `.md` files. Skip dirs starting with `.`. Sort by path. Compare with the previous state by `id` and `hash`. A rename (same id, new path) is an upsert, not a removal. A file that turns invalid removes its entity id and adds an error. The first call initializes state and returns `became == nil`. `Changed` is true when upserts or removals exist or the error list differs.
- `app.go` rescan loop: watcher `onChange` does a non-blocking send to a size-1 channel. One goroutine receives, calls `Rescan`, and if `Changed` broadcasts a real `diff`. Only that goroutine calls `Rescan`. `NewApp` does the initial `Rescan`. The hub's `snapshotFn` now reads the Store. Add `GET /api/snapshot`.

Tests:
- `spec_test.go` (table): valid; CRLF file; no frontmatter; bad yaml; bad `type`; bad `status`; bad `id`; null relations; body preserved exactly.
- `store_test.go`: initial scan; add; edit; delete; file turns invalid; duplicate id (first path wins); rename; `became` fires on `todo` to `verify`, on new file in `verify`, and **not** on first scan.
- `rewrite_test.go`: replace `status: verify # note` and keep every other byte; CRLF preserved; a `status:` inside the body is untouched; no status line gives error; `SetStatus` refuses when current status is not `from`; refuses on id mismatch; leaves no `.factory-tmp-` file behind.
- `integration_test.go`: temp repo, `NewApp`, `httptest`, WS client. Write entity file: expect `diff` upsert in 5s. Edit title: upsert. Delete: `removed`. Write garbage file: `errors` non-empty.

**Gate M2:** `check-daemon.sh` prints `DAEMON OK`. Commit `factory: M2 spec index`.

---

### M3. React web UI (master M2)

Scaffold by hand. Do not run interactive `npm create`.

```bash
cd tools/factory/web
npm init -y >/dev/null
npm i react@18 react-dom@18 react-markdown@9 remark-gfm@4
npm i -D vite@5 @vitejs/plugin-react@4 typescript@5 @types/react@18 @types/react-dom@18 tailwindcss@3 postcss autoprefixer daisyui@4 vitest@2
```

Exact config files:

`package.json` scripts and type (merge into the generated file):

```json
{ "name": "zippp-factory-web", "private": true, "type": "module",
  "scripts": { "dev": "vite --host 127.0.0.1 --port 5173 --strictPort",
               "build": "tsc --noEmit && vite build",
               "test": "vitest run" } }
```

`tsconfig.json`:

```json
{ "compilerOptions": { "target": "ES2020", "lib": ["ES2020","DOM","DOM.Iterable"],
  "module": "ESNext", "moduleResolution": "bundler", "jsx": "react-jsx", "strict": true,
  "noEmit": true, "skipLibCheck": true, "isolatedModules": true, "types": ["vite/client"] },
  "include": ["src"] }
```

`vite.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
export default defineConfig({ plugins: [react()], test: { environment: 'node', include: ['src/**/*.test.ts'] } })
```

`tailwind.config.js`:

```js
import daisyui from 'daisyui'
export default { content: ['./index.html', './src/**/*.{ts,tsx}'], plugins: [daisyui], daisyui: { themes: ['light', 'dark'] } }
```

`postcss.config.js`: `export default { plugins: { tailwindcss: {}, autoprefixer: {} } }`
`src/index.css`: the three `@tailwind base; @tailwind components; @tailwind utilities;` lines.
`index.html`: `<div id="root">` plus `<script type="module" src="/src/main.tsx">`.

Build notes:
- `types.ts`: Entity, ParseError, Result, CheckResult, ServerMsg (discriminated union on `type`), per 5.3 and 5.4.
- `state.ts`: pure reducer. State: `connected, seq, entities (Record<id,Entity>), errors, verifications, running (Record<id,boolean>), needResync`. Rules: `snapshot` replaces everything and sets seq and clears `needResync`. `diff` applies upserts and removals idempotently. If `msg.seq <= state.seq` ignore. If `msg.seq > state.seq + 1` set `needResync` and do not apply. `verification_started` sets running. `verification` stores the result and clears running.
- `useFactorySocket.ts`: URL from `import.meta.env.VITE_FACTORY_WS ?? 'ws://127.0.0.1:8080/ws'`. Reconnect with backoff 500 ms doubling to 5 s. Close the socket in effect cleanup (React StrictMode runs effects twice in dev). Send `resync` when `needResync`. Expose `send(msg)` and a callback for `editor_result` and `error`.
- `lib/tree.ts`: `buildDepForest(entities: Entity[]): DepNode[]` with `DepNode = {id: string; children: DepNode[]; cycle?: boolean}`. `prereq(B)` = ids A that exist where `B.depends_on` includes A, or `A.blocks` includes B. Roots = entities with empty prereq, sorted by id. Children of A = entities B with A in `prereq(B)`, sorted by id. DFS with a path set. A repeat inside the current path becomes `{id, children: [], cycle: true}`. Max depth 12. Entities never visited (pure cycles) are appended as extra roots, sorted. Dangling ids are ignored in the tree and shown as "missing" chips in the detail pane.
- Layout: `App.tsx` is a 3-pane grid. Left: `EntityList` (search box on id and title, type filter chips, parse-error count with expandable list). Center: tabs `Kanban | Dependencies`. Kanban has 5 columns in order `todo, in-progress, blocked, verify, done`, horizontal scroll, no drag. Cards show id, title, assignee, type chip, verification badge (running, passed, failed). Right: `DetailPane` with metadata, relation chips (click selects), `VerifyPanel`, "Edit in Terminal" button, and `MarkdownView`.
- `VerifyPanel`: shows each check with status color and detail, collapsible `output` in a `<pre>`. "Re-verify" button only when `status === 'verify'`.
- `MarkdownView`: `react-markdown` with `remark-gfm`. No raw HTML. Custom `code` component: class `language-eraser` renders `<EraserBlock source=... />` (in M3 render a `<pre>` placeholder, M4 replaces it).
- `StatusBar`: connection badge ("connected" or "disconnected, retrying"), entity count, last seq.
- Tailwind: use complete class names in maps. Never build class names by string concatenation (they get purged).

Tests (vitest, pure functions only): `state.test.ts` (snapshot, diff, ignore stale, gap sets `needResync`, resync clears, verification flow). `tree.test.ts` (chain, `blocks` equals `depends_on`, cycle, isolated, dangling ignored, extra roots).

Smoke (no visual check needed):

```bash
tools/factory/bin/factory -config tools/factory/factory.config.json & echo $! > /tmp/factory.pid
(cd tools/factory/web && npm run dev >/tmp/factory-web.log 2>&1 & echo $! > /tmp/factory-web.pid)
sleep 3
curl -s http://127.0.0.1:5173/ | grep -c 'id="root"'     # expect 1
kill $(cat /tmp/factory.pid) $(cat /tmp/factory-web.pid)
```

**Gate M3:** `tools/factory/scripts/check.sh` prints `FACTORY CHECK OK`. From repo root `npx tsc --noEmit` and `npm test` still match the M0 baseline (if the root runner picked up factory tests, add one exclude line per R7). Commit `factory: M3 web ui`.

---

### M4. Eraser diagrams (master M3)

Local renderer first. It must work with zero network and no API key.

`lib/eraser.ts`:
- `parseEraser(src: string): { entities: {name: string; fields: {name: string; type: string; pk: boolean; fk: boolean}[]}[]; relations: {from: {entity: string; field?: string}; op: '<'|'>'|'-'|'<>'; to: {entity: string; field?: string}}[] }` per 5.8.
- `layoutErd(model)`: columns = `ceil(sqrt(n))`. Box width 220. Header 28 px. Row 20 px. Gap 60 px. Entities fill the grid row by row in source order. Returns box rects and, for each relation, a straight line from the right or left edge of the source box at the source field row y to the target box at the target field row y (use header center when no field). End labels: `<` gives "1" at from and "N" at to. `>` gives "N" and "1". `-` gives "1" and "1". `<>` gives "N" and "N".
- `EraserBlock.tsx`: `<svg viewBox>` with `currentColor` strokes and text (works in both DaisyUI themes), monospace text, `pk` fields bold. If no entities parsed, show the raw source in a `<pre>`. Wrap in `ErrorBoundary`: any render error shows the raw `<pre>`. A diagram must never crash the app.

Tests (`eraser.test.ts`): two entities with a relation; each op; unknown lines ignored; empty block; fields with and without types; layout is deterministic (same input, same rects); grid size for n = 1, 2, 5.

**Optional native probe (one attempt, max 15 minutes, only after the gate passes):**
`npm view @eraserlabs/eraser-diagrams version`, then `npm view eraser-diagrams version`. If one exists, read `npm view <pkg> readme | head -80`. Use it only if the README documents a client-side render with no API key and no network. Put it behind `VITE_ERASER_NATIVE=1`, default off, with fallback to the local renderer on any error. If it is not trivially working on the first try, delete the attempt and add one line to `NOTES.md`.

**Gate M4:** `check.sh` prints `FACTORY CHECK OK`. Commit `factory: M4 eraser renderer`.

---

### M5. Verifier (master M4)

Create: `eraser.go`, `verifier.go`. Edit `app.go`, `hub.go`, `store.go`.

Build notes:
- First line comment in `verifier.go`: `// @implements FEAT-111`.
- API:
  `NewVerifier(cfg *Config, store *Store, broadcast func(typ string, fields map[string]any)) *Verifier`
  `Enqueue(id string) error` (errors: unknown id, status not `verify`, queue full)
  `Run(ctx context.Context)` (worker loop)
  `VerifyNow(ctx context.Context, e *Entity) Result` (runs checks, writes nothing, used by tests)
  `process(ctx, id)` (calls `VerifyNow`, stores result, writes report, `SetStatus` on pass, broadcasts)
- Broadcast `verification_started` before checks and `verification` after.
- Path safety: reject absolute paths and any path that after `filepath.Clean` and `filepath.EvalSymlinks` is outside `repo_root`. Failure detail: "path escapes repo".
- `eraser.go`: `ExtractEraserBlocks(body string) []string`, `ParseERDEntities(block string) []ERDEntity{Name string; Fields []string}`, `norm` (5.8).
- App wiring: rescan loop calls `Enqueue` for each id in `became`. Hub `verify` message: look up entity, call `Enqueue`, reply `error` on failure. Hub gets handler fields `OnVerify`, `OnEdit` set by `NewApp`.
- Copy `parseCommand`, `runCommand`, `replaceStatus`, `traceRe` from section 5.7 exactly.
- Verification result messages sent to clients must not contain more than `max_output_bytes` of output per check.

Tests (`eraser_test.go`, `verifier_test.go`, temp repo per case; use `httptest.NewServer` for prod checks):

| Case | Expect |
|---|---|
| marker present, no other checks | `static` pass, overall pass |
| marker missing | `static` fail, `test` and `prod` skip |
| marker for a different id | fail |
| `FEAT-1` vs marker `FEAT-12` | fail (exact match) |
| comma list marker including the id | pass |
| target path `../../etc/passwd` | fail "path escapes repo" |
| absolute target path | fail |
| missing target file | fail |
| ERD entities and fields all in a `.ts` interface | `model` pass |
| ERD entity missing in code | `model` fail |
| ERD field missing | `model` fail |
| ERD defined, no target_files | `model` fail |
| plural/singular (`line_items` vs `LineItem`) | pass |
| Kotlin `data class`, Go `type X struct`, Prisma `model X {` | each pass |
| test_command `node -e "process.exit(0)"` (allowlist includes node) | `test` pass |
| exit code 3 | fail, output captured |
| command not in allowlist (`rm -rf x`) | fail, nothing executed |
| `echo hi; rm x` | fail "shell operators" |
| sleep longer than timeout (use 1s timeout in test) | fail "timed out", child killed |
| prod 200 `{"ok":true}` | pass |
| prod 200 plain text | pass |
| prod 200 `{"ok":false}` | fail |
| prod 500 / 404 | fail |
| prod URL `file:///etc/passwd` | fail |
| all three empty | overall fail "nothing to verify" |
| `process` on pass | file now `status: done`, other bytes identical, report file exists |
| `process` on fail | file still `verify` |
| human changed status during run | status not overwritten |
| `Enqueue` on a `todo` entity | error |

**Gate M5:** `check-daemon.sh` prints `DAEMON OK`. Commit `factory: M5 verifier`.

---

### M6. Terminal bridge

Create: `editor.go`. Edit `hub.go`, `app.go`.

- `type Runner func(ctx context.Context, name string, args ...string) ([]byte, error)`.
- `OpenInEditor(ctx, cfg *Config, run Runner, absPath string) (string, error)`:
  1. `os.Stat(cfg.Editor.NvimServer)` fails: return an error containing `start nvim with: nvim --listen /tmp/zippp-nvim.sock` (use the configured path).
  2. Run `nvim --server <sock> --remote <absPath>` with a 5 s timeout.
  3. If `focus_command` is non-empty, run it as argv afterwards (no shell). If it fails, still return ok with a warning in the message.
- Hub `edit`: look up the id in the Store. Only indexed entity paths are ever passed. Reply `editor_result`.
- Do not guess any Herdr command.

Tests (`editor_test.go`, fake Runner): missing socket gives the hint; correct argv; focus command runs after; focus failure is a warning; unknown id returns `error` over WS; a path outside the index is never passed.

**Gate M6:** `check-daemon.sh` prints `DAEMON OK`. Commit `factory: M6 terminal bridge`.

---

### M7. Self-test, e2e, seed backlog, handover (context M5)

**A. Fixtures (real, in repo):**
- `tools/factory/testdata/selftest/trace-target.ts`:
  ```ts
  // @implements FEAT-900
  export interface SelftestEntity { id: string; title: string }
  ```
- `tools/factory/testdata/selftest/ok.js`: `process.exit(0)`.
- `entities/features/FEAT-900-factory-selftest.md`: the 5.1 example, status `todo`, body with an eraser block:
  ````text
  selftest_entities {
    id string pk
    title string
  }
  ````
  Verification: `target_files` as in 5.1, `test_command: "node tools/factory/testdata/selftest/ok.js"`, `prod_endpoint: "http://127.0.0.1:8080/healthz"`.
- `entities/features/FEAT-111-software-factory.md`: type `feature`, status `in-progress`, assignee `adit`. Verification: `target_files: ["tools/factory/daemon/verifier.go"]`, `test_command: "go -C tools/factory/daemon test ./..."`, `prod_endpoint: ""`. Do **not** set it to `verify`. The human decides.

**B. `e2e_test.go`** (skip with `t.Skip` if `node` is not on PATH). Temp repo with its own `trace-target.ts`, `ok.js`, config allowing `node`. Start `NewApp` with `httptest`, point `prod_endpoint` at the test server's `/healthz`. Connect a WS client. Then:
1. Write entity `todo`. Expect `diff` upsert.
2. Rewrite status to `verify` via `os.WriteFile`. Expect, in order: `diff` (verify), `verification_started`, `verification` with `passed:true` and 3 checks (`static`, `test`, `prod`; `model` also when the body has an ERD), then `diff` with status `done`.
3. Assert the file on disk contains `status: done`.
4. Negative: second entity whose target file lacks the marker. Expect `verification` with `passed:false`, `static` fail, file still `verify`, and **no** further automatic verification within 2 s.
5. Send WS `verify` for the failing entity after fixing the file: expect pass and `done`.
Use polling with a 10 s timeout. No fixed sleeps.

**C. Seed backlog** (all `todo` unless stated, `assignee: adit`, empty `verification`, body = the one-line description; source: zippp context "Next tasks"):

| id | type | title | note |
|---|---|---|---|
| STORY-101 | story | End-to-end device test | pair, capture, extract, review, Terima, verify Sheet row, verify credit decrement |
| FEAT-102 | feature | Android review contract | staff, outlet, payment, purpose, customer ops; correction telemetry; assumed date; full line-item Ubah |
| FEAT-103 | feature | Photo proof via Drive | server-side Drive upload, linked photo cell, trash and refund on append failure |
| FEAT-104 | feature | Month tabs and daily totals | one tab per month, Summary tab, hide tabs older than 12 months |
| FEAT-105 | feature | Sideload OTA | `/api/app-version`, SHA-256, APK signer continuity, PackageInstaller |
| FEAT-106 | feature | Play In-App Updates | `play` flavor only |
| FEAT-107 | feature | QR pairing scanner and steady detection | |
| FEAT-108 | feature | Offline queue and EXIF stripping | |
| FEAT-109 | feature | Update rollout plan to match code | |
| FEAT-110 | feature | Enable mobile in Production | status `blocked`, `depends_on: [STORY-101]` |

Do not add `target_files` to seeds. Do not invent facts beyond the note column.

**D. README.md** (max 40 lines): build, run, the `nvim --listen /tmp/zippp-nvim.sock` step, config keys, how a card reaches `done`.

**E. Final gates (run all, report exact output tails):**

```bash
tools/factory/scripts/check.sh
npm test 2>&1 | tail -8          # repo root, expect 43 passing
npx tsc --noEmit 2>&1 | tail -8  # repo root
npm run build 2>&1 | tail -15    # repo root, run once here
```

Live check: start the daemon and `npm run dev`. `curl -s 127.0.0.1:8080/api/snapshot | head -c 400` shows the seeded entities. Copy `FEAT-900` to a scratch name is not needed: set its status to `verify` with `sed -i '' 's/^status: todo/status: verify/'`, wait up to 20 s, confirm the file says `status: done`, then restore it: `sed -i '' 's/^status: done/status: todo/'`. Kill both processes.

**Gate M7:** all of E pass, `git status --short -- tools spec/themes/03-zippp-software-factory` is clean after commit, FEAT-900 is back to `todo`. Commit `factory: M7 selftest and seed`. Then go to section 8 and stop.

---

## 7. Failure playbook

| Symptom | Fix |
|---|---|
| Watcher misses changes after Neovim saves | Neovim writes a temp file and renames. Watch **directories**, not files. Rescan fully on any event. |
| `too many open files` | kqueue opens an fd per watched file. Run `ulimit -n 4096` in the shell, and keep test trees small. |
| New subdirectory not watched | On Create of a dir, `Add` it and walk its children. |
| Browser WS rejected | Check `Origin` is in `allowed_origins`. Empty Origin must be allowed. Upgrader needs a custom `CheckOrigin`. |
| UI crashes on `null` | A Go nil slice marshals as `null`. Initialize every slice to `[]` before marshaling. |
| Flaky tests | Poll with a deadline. Never `time.Sleep` to wait for a watcher. Use `-race` and `-count=1`. |
| `go vet` copylocks | Pass structs holding a mutex by pointer. |
| Port 8080 busy during tests | Tests must use `httptest` or `127.0.0.1:0`. Only the manual smoke uses 8080. |
| Verification loops forever | Triggers only on a transition into `verify`. Do not trigger from the daemon's own `done` write. Dedupe queued ids. |
| `exec: "./gradlew": not found` | Relative argv[0] resolves against `cmd.Dir`. Use `./android/gradlew -p android :app:assembleDebug`. |
| Child process survives timeout | Set `Setpgid`, kill the negative pid. See `runCommand`. |
| Tailwind classes missing | Use full class strings in lookup maps. Check `content` globs. |
| React shows duplicate sockets in dev | StrictMode double-runs effects. Close the socket in cleanup. |
| react-markdown `code` has no language | Block code arrives with `className="language-eraser"`. Inline code has no className. |
| Vite port in use | `--strictPort` fails fast. Stop the old process, do not change the port. |
| TS `moduleResolution: bundler` error | Needs TypeScript 5. Check `npx tsc -v`. |
| Root `npm test` now runs factory tests | Add one exclude line to the root runner config (R7). Re-check count is 43. |
| YAML error on tabs | YAML forbids tabs. Use two spaces. |
| `go test` can't find node | The e2e test must `t.Skip` when `exec.LookPath("node")` fails. |
| Anything repeating 3 times | Stop retrying the same fix. Re-read the contract in section 5 for that component, rewrite the smallest unit, retest. |

---

## 8. Handover

**Stop condition:** all M7 gates pass. Do not continue to extra features.

Your final message must contain only:

1. A table of gates: command, exact last line of output, pass or fail.
2. Files created (count and top-level dirs), commits (hashes), branch name.
3. Deviations from this brief and why (copy from `NOTES.md`).
4. Open issues (port 8080 busy? Eraser native probe result? baseline failures?).
5. The human tactile test below, unchanged.

**Human tactile test (one pass, about 5 minutes):**

1. Terminal A: `nvim --listen /tmp/zippp-nvim.sock` (in Herdr).
2. Terminal B: `tools/factory/bin/factory -config tools/factory/factory.config.json`
3. Terminal C: `cd tools/factory/web && npm run dev`, open `http://127.0.0.1:5173`.
4. Expect: 12 cards (10 seeds, FEAT-900, FEAT-111), badge "connected".
5. Click FEAT-900. Expect the ERD box `selftest_entities` with 2 fields.
6. Click "Edit in Terminal". Expect the file opens in Neovim.
7. In Neovim change `status: todo` to `status: verify`, save. Expect the card to move to Verify, then to Done within seconds, with 4 green checks (static, model, test, prod).
8. Break it: remove the `// @implements FEAT-900` line in `trace-target.ts`, set the entity back to `verify`. Expect a red `static` check and the card staying in Verify. Restore the line, click "Re-verify". Expect Done.
9. Put FEAT-900 back to `todo`.

If any step fails, report the step number and what you saw. Do not claim success.
