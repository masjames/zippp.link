# ADR-0003: Reliability and testing stack, sized for a solo/two-person team

Date: 2026-07-12
Status: Accepted

## Context

SPEC.md commits to "Strict TDD" and 98% confidence before shipping, but names no enforcement mechanism, no error tracking, no uptime monitoring, and no load testing plan. There is no dedicated SRE, so the answer has to be automated guardrails rather than a person watching dashboards.

## Decision

- **CI gate:** GitHub Actions runs the Jest + Playwright suite (already planned per PRD.md's testing stack) on every pull request. Nothing merges to `main` with a red build. This is the regression/integration test net referenced in SPEC.md's acceptance criteria.
- **Error tracking:** Sentry (free tier) on both the Next.js app and API routes, catches unhandled exceptions in production in real time.
- **Uptime monitoring:** BetterStack or UptimeRobot (free tier), pings the production URL and alerts on an outage.
- **Load testing:** explicitly deferred. Revisit with k6 or Artillery once there's real signup volume to justify it.

## Alternatives considered

- **Hire or contract an SRE:** not justified at current stage; automated tooling covers the actual risk (silent breakage, downtime) without headcount.
- **Load-test pre-launch:** rejected for now, building load simulation for traffic that doesn't exist yet is effort spent on a problem we don't have, which conflicts with the "ship beats think" rule in ARCHITECTURE_CONSTITUTION.md.
- **Rely on Vercel/Neon uptime alone with no external check:** rejected, a serverless function can 500 silently without either vendor's own dashboard surfacing it to us.

## Consequences

Automated tests and monitoring catch most regressions and outages without manual oversight, but nothing here replaces a human occasionally reading the Sentry/uptime dashboards. Load testing stays a known gap until real traffic makes it worth building, flag this ADR for revisit once monthly active stores cross a few hundred.
