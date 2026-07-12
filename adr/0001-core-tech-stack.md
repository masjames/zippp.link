# ADR-0001: Core tech stack

Date: 2026-07-12
Status: Accepted

## Context

Zippp.link needs to ship fast, solo/two-person team, international-first, no ops headcount. SPEC.md already assumes this stack; this ADR formalizes the reasoning so it isn't silently baked into code no one chose to defend.

## Decision

- **Framework:** Next.js App Router, one codebase for marketing site, dashboard, and public store pages.
- **Database:** Neon Postgres + Drizzle ORM, serverless Postgres, branches per environment, typed queries.
- **Auth:** NextAuth with Google provider only, buyers and sellers alike sign in with one tap, no password reset flows to build or support.
- **Storage:** Cloudflare R2, S3-compatible, no egress fees, matters once product images and store traffic scale internationally.
- **Billing/MoR:** Polar.sh, handles VAT and cross-border payout as Merchant of Record, so no entity setup per country is needed to accept payment.
- **Deploy:** Vercel, native Next.js support, branch preview deploys double as our iteration/QA loop (see ARCHITECTURE_CONSTITUTION.md).

## Alternatives considered

- **Supabase** instead of Neon: passed on for this project since Neon's branching model fits the preview-deploy workflow better; Supabase remains in use on other projects.
- **Stripe** instead of Polar.sh: Stripe isn't available as a payout rail in Indonesia/Nigeria/India directly for this use case; Polar.sh's MoR model removes that blocker.
- **Self-hosted Postgres**: rejected, adds ops burden with no upside at this stage.

## Consequences

Fast to ship, low ops burden, but locked into Vercel/Neon/Polar.sh pricing and limits as the business scales. Revisit this ADR if any of the three hit a hard ceiling (Vercel function limits, Neon connection limits, Polar.sh fee structure at higher volume).
