# Zippp.link, Architecture Constitution

This is the master doc. Read this first, every session, before touching code or other docs.

## Doc hierarchy, who owns what

| Doc | Audience | Answers |
|---|---|---|
| `SPEC.md` | Everyone | What are we building, who's it for, how does it work, pricing model, data model, tech stack, local dev setup, deployment strategy, acceptance criteria |
| `DESIGN.md` | Design-facing | What does it look like, colors, type, spacing, wireframes |
| `adr/*.md` | Engineering-facing | Why we picked X over Y, and whether that's still true |
| `llms.txt` | External AI crawlers | What is this product, in a form AI answer engines can summarize correctly |

Rule: if a change contradicts SPEC.md, don't silently drift. Either update the doc in the same PR, or write a new ADR explaining the deviation and link it from the relevant doc. Docs and code go stale together or not at all.

## When to write an ADR

Write one when a decision is expensive to reverse, or when two reasonable people could disagree on it: choice of a vendor, choice of a data model shape, choice to build vs. buy. Don't write one for routine implementation details, that's what SPEC.md and code comments are for.

Every ADR gets a sequential number. Never renumber or delete a past ADR, if a decision changes, write a new ADR and mark the old one "Superseded by ADR-00XX." The log is the history of why the system looks the way it does; keep it intact.

## Agent roles (multi-agent workflow)

- **Antigravity**: planning, spec-writing, architecture review, ADR drafting. Owns SPEC.md, ADRs.
- **Antigravity CLI**: execution, vertical feature slicing. Instead of splitting by frontend/backend, an agent/CLI owns a full vertical feature (e.g., "Build Store Setup: UI + API + DB schema") to maintain complete context.

Whoever picks up a task reads this file, then the specific doc(s) relevant to the task, before writing code.

## Operating rules

- **Code and Docs Move Together.** When editing real code, the design (`DESIGN.md`) and spec (`SPEC.md`) must be updated accordingly to reflect the changes. If a new ADR is made or an existing one is revised, all related documentation must be updated to maintain a single source of truth. Docs and code go stale together or not at all.
- **Ship beats think.** No second strategy session before execution. Every session's output must be sendable or mergeable the same day.
- **One main tool per problem.** Don't stack three SaaS tools that do overlapping jobs (see ADR-0002 for the analytics example). If you're about to add a new tool, check whether an existing one in the stack already covers it.
- **Nothing merges without green CI.** Jest + Playwright run on every PR via GitHub Actions. This is the regression net, see ADR-0003.
- **Don't build for scale you don't have.** Load testing, custom internal ledgers, and bespoke analytics are all deferred until there's real usage or real revenue to justify them (see ADR-0002, ADR-0003, ADR-0004).
- **Cross-Platform Compatibility.** All development scripts, path resolutions, and CLI commands must run seamlessly on both **macOS (zsh/bash)** and **Windows (PowerShell/cmd)**. Use Node.js scripts for complex dev automation rather than platform-specific shell scripts.

## Current stack at a glance

Next.js (App Router) · Neon Postgres + Drizzle · NextAuth (Google, RBAC) · Cloudflare R2 · Polar.sh (billing) · Resend (email) · Vercel (deploy) · PostHog (analytics/A-B/flags) · Sentry (errors) · BetterStack/UptimeRobot (uptime) · GitHub Actions (CI) · Wave/spreadsheet (books, pre-revenue) · Z-CMS (internal admin dashboard at `/z-cms/`, see ADR-0005) · neuledge/context (AI documentation MCP)

Full rationale for each of these lives in `adr/`.
