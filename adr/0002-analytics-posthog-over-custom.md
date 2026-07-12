# ADR-0002: Use PostHog instead of building custom internal analytics

Date: 2026-07-12
Status: Accepted, supersedes the "Custom Internal Analytics via Neon Postgres" line in PRD.md and SPEC.md

## Context

PRD.md originally proposed building event tracking (`user_signed_up`, `store_created`, `popup_shown`, etc.) directly on Neon Postgres, with Mixpanel free tier as an optional fallback. That means building and maintaining our own event pipeline, funnel math, and dashboard, plus we still have no answer for A/B testing, session replay, or feature flags, which the original plan didn't cover at all.

## Decision

Use PostHog (free tier) as the single analytics tool: event tracking, funnels, session replay, A/B testing, and feature flags all in one place. Fire the same events already listed in PRD.md (`user_signed_up`, `store_created`, `product_added`, `popup_shown`, `popup_yes`, `checkout_completed`, page views, WA clicks) into PostHog instead of a hand-rolled Neon table.

## Alternatives considered

- **Build it ourselves on Neon** (original plan): full data ownership, but means building funnel logic, retention math, and a dashboard from scratch, time spent on infrastructure instead of the product.
- **Mixpanel free tier** (original fallback): covers events and funnels but not A/B testing or feature flags, so we'd still need a second tool for those.
- **PostHog + separate A/B tool**: rejected on the "one main tool" rule, no reason to run two SaaS tools that overlap.

## Consequences

We give up full data ownership of raw event data (it lives in PostHog, not our own Postgres) in exchange for funnels, replay, and A/B testing on day one with no build time. PostHog data can be exported later if full ownership becomes a requirement. Revisit if PostHog's free tier volume limits are hit.
