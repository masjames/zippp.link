# Zippp Software Factory: Master Architecture & Agent Execution Specification
**Version:** 4.0.0
**Target Environment:** macOS, Herdr terminal multiplexer, Neovim
**Target Agents:** Claude (for synthesis), Pi via DeepSeek API (for autonomous execution)
**Project Context:** A local-first, zero-dependency Product OS to orchestrate the development, verification, and deployment of the Zippp (zippp.link) Android Companion and Telegram pivot.

## 1. System Vision & Claude Synthesis Directive
**Directive for Claude:** You are receiving this document alongside the entire existing Zippp codebase and current markdown specifications. Your objective is to synthesize these inputs into one exhaustive, deterministic master implementation document. That document will be fed to the Pi coding agent (powered by DeepSeek) to autonomously build this "Zippp Software Factory". 

The Factory must not only track tasks but act as an **active verification engine** that reads the specs and ERDs, and deterministically verifies them against the actual TypeScript codebase and production environments.

## 2. Core Architecture Topology
The Factory operates strictly on a local-first philosophy, utilizing the macOS file system as the database to ensure AI coding agents can natively read and mutate state without API barriers.

### A. The Database Layer (Local File System)
*   **Location:** `spec/` directory.
*   **Format:** Markdown files (`.md`) with strict YAML frontmatter (OpenSpec format).
*   **No External DB:** Postgres, SQLite, and Redis are strictly prohibited for the internal factory state.

### B. The Go Watcher & Verification Daemon (Backend)
*   **Runtime:** Go (latest).
*   **Responsibilities:**
    1.  **Graph Indexing:** Recursively crawls `spec/` to build a relational in-memory graph of Features, Bugs, and User Stories from YAML frontmatter.
    2.  **File Watching:** Uses `fsnotify` (which leverages macOS FSEvents natively) to detect saves in Neovim or modifications by Pi, triggering instant re-indexing.
    3.  **Real-Time Sync:** Runs a WebSocket server (`ws://localhost:8080/ws`) to broadcast graph state diffs to the web frontend.
    4.  **Spec-to-Code Verification Engine:** (Detailed in Section 4).

### C. The React Web Command Center (Frontend)
*   **Runtime:** React (Vite), Tailwind CSS, DaisyUI.
*   **Responsibilities:**
    1.  **Read-Heavy Visualization:** Subscribes to the WebSocket to render Kanban boards, dependency trees, and entity lists.
    2.  **Docs-as-Code Rendering:** Parses ````eraser` markdown blocks to render system maps and ERDs natively via `eraserlabs/eraser-diagrams`.
    3.  **Terminal Bridge:** Provides an "Edit in Terminal" action that sends a WebSocket message back to the Go daemon to focus the file in Neovim running within Herdr.

## 3. Data Schema & Frontmatter Contract
Every markdown file in the `spec/` directory MUST conform to this YAML schema. Pi will use this to manage state.

```yaml
---
id: string          # e.g., FEAT-012, BUG-089, ERD-001
type: string        # ENUM: feature, bug, story, spec, diagram
title: string       # Human-readable title
status: string      # ENUM: todo, in-progress, blocked, verify, done
assignee: string    # e.g., adit, pi-agent
relations:          
  blocks: []string      
  implements: []string  
  depends_on: []string  
verification:       # NEW: Contract for the Verification Engine
  target_files: []string   # e.g., ["src/lib/mobile-auth.ts"]
  test_command: string     # e.g., "npm test -- mobile-auth"
  prod_endpoint: string    # e.g., "https://api.zippp.link/health"
---
# Markdown body and ```eraser blocks go here
```

## 4. The Spec-to-Code Verification Engine (Crucial Component)
The Factory is not just a UI; it is an active auditor. The Go daemon must implement a `verifier.go` module.

### A. Static Code Verification
When a spec file transitions to `status: verify`, the Go daemon triggers the Verification Engine:
1.  It reads the `verification.target_files` array from the YAML frontmatter.
2.  It scans those actual source files (e.g., `.ts`, `.tsx`, `.kt`) looking for explicit trace IDs (e.g., a comment like `// @implements FEAT-012`).
3.  If the spec defines an ERD (using Eraser syntax), the verifier performs a lightweight AST or regex scan on the target Prisma/GORM schema or TypeScript interfaces to ensure the defined models exist in the code.

### B. Dynamic Test Verification
1.  The Go daemon executes the `verification.test_command` via a local macOS shell process.
2.  It captures `stdout` and `stderr`.
3.  If the exit code is `0`, the spec is verified locally.

### C. Production Verification (Health/State Checks)
1.  If `verification.prod_endpoint` is defined, the Go daemon makes an HTTP GET request to the endpoint.
2.  It verifies standard 200 OK responses or specific JSON payloads to confirm the feature is live in the Zippp production or preview environment.
3.  If A, B, and C pass, the Go daemon autonomously rewrites the YAML frontmatter to `status: done` and broadcasts the update to the React UI.

## 5. Pi Agent Autonomous Execution Contract
This section defines the rules of engagement for the Pi coding agent (running on the DeepSeek API). Claude will format the final document to strictly enforce this loop.

**The Spec-First, TDD Loop:**
1.  **Read:** Pi reads the synthesized master spec.
2.  **Scaffold:** Pi implements the Go daemon and React frontend according to the architecture topology.
3.  **Execute:** Pi runs the internal macOS build commands (`go build`, `npm run build`).
4.  **Evaluate:** If compilation or tests fail, Pi reads the terminal `stderr` output.
5.  **Iterate:** Pi leverages DeepSeek's reasoning capabilities to autonomously rewrite the failing code without human intervention.
6.  **Verify:** Pi must successfully run the Go Verification Engine against a dummy spec to prove the `spec-to-code` audit works.
7.  **Halt & Handover:** Pi only returns control to the developer for the final manual one-pass tactile test once the autonomous test suite achieves a 100% pass rate. 

## 6. Implementation Milestones for Pi
*   **Milestone 1:** Go Daemon skeleton + `fsnotify` (using macOS FSEvents) + WebSocket broadcasting a static JSON payload.
*   **Milestone 2:** React Vite frontend receiving WS payload and rendering the 3-pane layout (List, Kanban, Markdown).
*   **Milestone 3:** Integration of the Eraser diagram renderer in the React frontend.
*   **Milestone 4:** The Go Verification Engine (`verifier.go`) capable of executing macOS shell commands and parsing target source code for trace IDs.
