# zippp specs

**North star:** Factory `DIR-001` Zippp Space (`themes/03-zippp-software-factory/entities/direction/`).  
Living theme docs may describe **legacy as-built** (Sheet rows, credits, companion spike). Read their top banner; DIR/DEC/ROAD win on product destiny.

The active specs are grouped into three themes. Start with the context file,
then open the theme that owns the area you are changing.

## Start here

| File | Owns |
|---|---|
| [`zippp-context-for-claude.md`](./themes/03-zippp-software-factory/zippp-context-for-claude.md) | **Overarching LLM context** — product, code, deployment, risks, factory, next steps |
| [`themes/README.md`](./themes/README.md) | Theme index |
| [`wording.txt`](./wording.txt) | **Every user-visible string** (EN/ID), parsed at runtime |
| [`archives/README.md`](./archives/README.md) | Archive policy and historical material |

## Themes

### 1. MVP

[`themes/01-mvp/`](./themes/01-mvp/)

Zippp Space web product (operable specs + legacy mill/credit as-built notes).

| File | Owns |
|---|---|
| [`SPEC.md`](./themes/01-mvp/SPEC.md) | Personas, requirements, data contract, privacy, definition of done |
| [`USER-FLOW.md`](./themes/01-mvp/USER-FLOW.md) | Landing, guard, capture, review, top-up, ops |
| [`ARCHITECTURE.md`](./themes/01-mvp/ARCHITECTURE.md) | Stack, pipeline, stores, billing, sheet layout |
| [`TEMPLATES.md`](./themes/01-mvp/TEMPLATES.md) | Five templates, columns, month tabs, daily block, photo proof |
| [`PRICING.md`](./themes/01-mvp/PRICING.md) | Sub direction + legacy credits (code today) |
| [`OFFER.md`](./themes/01-mvp/OFFER.md) | Selling brief |
| [`COGS.md`](./themes/01-mvp/COGS.md) | Cost of goods and unit economics |
| [`LATER.md`](./themes/01-mvp/LATER.md) | Parked ideas and out-of-scope work |
| [`AUDIT-2026-10.md`](./themes/01-mvp/AUDIT-2026-10.md) | Revision 2 decisions and task order |
| [`verification/`](./themes/01-mvp/verification/) | Google OAuth verification evidence |

### 2. Android + Telegram pivot

[`themes/02-android-telegram-pivot/`](./themes/02-android-telegram-pivot/)

Historical Android/Telegram spike — read with `DIR-001` / `DEC-003` override.

| File | Owns |
|---|---|
| [`SPEC-ANDROID-COMPANION.md`](./themes/02-android-telegram-pivot/SPEC-ANDROID-COMPANION.md) | Android/Telegram architecture and contracts |
| [`android-rollout-plan.md`](./themes/02-android-telegram-pivot/android-rollout-plan.md) | Recovery map (sequencing: `ROAD-001`) |
| [`reviews/`](./themes/02-android-telegram-pivot/reviews/) | DeepSeek/Grok reviews + session log |

### 3. Zippp Software Factory

[`themes/03-zippp-software-factory/`](./themes/03-zippp-software-factory/)

The local-first Product OS: Go watcher, React command center, verifier, and
entity graph.

| File | Owns |
|---|---|
| [`README.md`](./themes/03-zippp-software-factory/README.md) | Workspace, indexing convention, entity contract |
| [`zippp-software-factory-master-spec-mac.md`](./themes/03-zippp-software-factory/zippp-software-factory-master-spec-mac.md) | Authoritative factory design |
| [`templates/entity.md`](./themes/03-zippp-software-factory/templates/entity.md) | Entity frontmatter/body template |
| [`entities/README.md`](./themes/03-zippp-software-factory/entities/README.md) | DIR/DEC/ROAD + FEAT/BUG/STORY/diagram rules |

Factory UI: **Direction** tab (DIR/DEC/ROAD) + **Tasks** (FEAT/BUG/STORY) + Design (diagrams).

Indexed entity paths:

```text
spec/themes/03-zippp-software-factory/entities/{direction,decisions,roadmap,features,bugs,stories,diagrams}/**/*.md
```

Long-form specs remain prose.

## Archives

[`archives/README.md`](./archives/README.md)

| Folder | Holds |
|---|---|
| [`archives/legacy/`](./archives/legacy/) | Pre-pivot handoffs, implementation summaries, old flows |
| [`archives/whatsapp/`](./archives/whatsapp/) | WhatsApp-era plans, handoffs, cost models |
| [`archives/plan-history/`](./archives/plan-history/) | Finished Phase 1/2 plans and ship plan |
| [`archives/discussions/`](./archives/discussions/) | Older reviews, handoffs, sessions |

## Rules

- `spec/wording.txt` stays at `spec/wording.txt`; `src/lib/content.ts` and
  `next.config.ts` trace that exact path.
- Active specs live under `spec/themes/<theme>/`.
- Active reviews/evidence live inside the owning theme.
- Superseded material moves to `spec/archives/`, never deleted.
- Root [`README.md`](../README.md) is the public repo README.
- `AGENTS.md` is the implementer rulebook.
