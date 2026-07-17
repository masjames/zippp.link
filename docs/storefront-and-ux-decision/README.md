# Storefront & UX Decisions

This folder is the design source of truth for the two surfaces that carry **moat leg 2 (best-looking seller shop)**: the buyer-facing storefront (`zippp.link/<slug>`) and the seller-facing app (editor + dashboard). See `../business-concept.md` section 14 for why design is a moat leg, not decoration.

## Why this folder exists

The moat has three legs: routing (functional), best-looking seller (emotional), 0 percent fees (structural). Legs 1 and 3 are covered by `business-concept.md`. Leg 2 is a design and UX problem that needs its own depth, because it is the one a solo builder can actually win on: not by breadth, but by taste on a few things, tuned to the niche. Bento got acquired by Linktree for exactly this.

## The thesis in one line

Everyone else ships a link list. We ship a **shop that looks like a $200 Shopify theme**, from a Google Sheet, in five minutes, with fair routing and 0 percent fees.

## Files

- `01-design-principles.md` — the taste bar and rules (Refactoring UI, Abby Covert IA, the landing-page-taste skill applied to product). Brand tokens. The ban list.
- `02-storefront-page.md` — anatomy, layout, components, and states of the buyer catalog page.
- `03-storefront-flow.md` — the buyer flow end to end (land, browse, pick, order, WhatsApp handoff) with edge cases.
- `04-templates-and-themes.md` — the 3 to 4 niche selling templates, the theme token system, and the free/paid split.
- `05-editor-and-dashboard-ux.md` — the seller editor (preset chips + live preview) and dashboard IA, tuned for a 5-minute setup.

## How these relate to the other docs

```
business-concept.md   → what/who/price/moat (strategy)
roadmap.md            → gate sequence, when to build
storefront-and-ux/    → HOW leg 2 looks and feels (this folder)
landing/index.html    → the smoke test (pre-product)
```

## Status

Pre-build (Gate 1 smoke test in progress). These are decisions to hold, not yet implemented. Build begins only if Gate 1 passes. Nothing here should be built before a paying-intent signal exists.

## Rule for editing this folder

Every entry is a decision with a reason. When a decision changes, update the file and note what changed and why. Do not add features here that fail the `business-concept.md` section 14 matrix (no full theme editor, no CRM, no bg-image library).
