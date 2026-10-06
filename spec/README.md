# zippp specs

Index of the documentation. Active specs describe what zippp is and how it is
built today; `archived/` holds superseded material kept for history.

## Active

| File | Owns |
|---|---|
| [`REVISION-1.md`](./REVISION-1.md) | **Proposed** capture + batch-review revision (from user feedback): auto-snap, blur blocks, one screen, Accept/Edit, IndexedDB persistence |
| [`SPEC.md`](./SPEC.md) | What Phase 1 is: scope, requirements, data contract, privacy, definition of done |
| [`USER-FLOW.md`](./USER-FLOW.md) | Who does what, in order (screens, snap queue, fail paths) |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | How it is built: stack, extraction pipeline, stores, env |
| [`TEMPLATES.md`](./TEMPLATES.md) | Sheet column dictionary (resto-inventory, personal-expense, custom) |
| [`PRICING.md`](./PRICING.md) | Pricing and the privacy line |
| [`OFFER.md`](./OFFER.md) | Selling brief |
| [`COGS.md`](./COGS.md) | Cost of goods / unit economics |
| [`LATER.md`](./LATER.md) | Parked ideas, explicitly out of scope for now |
| [`wording.md`](./wording.md) | **Single source of truth for every user-visible string** (EN/ID). Parsed by the app at runtime — edit values only. |

## Archived (inactive)

| File | Why archived |
|---|---|
| [`archived/IMPLEMENTATION_SUMMARY.md`](./archived/IMPLEMENTATION_SUMMARY.md) | Delegation-experiment artifact; described the app before the Sheets pivot |
| [`archived/user-flow.html`](./archived/user-flow.html) | Old flow prototype, superseded by the shipped 5-screen UI (`USER-FLOW.md`) |
| [`archived/CLAUDE.md`](./archived/CLAUDE.md) | Claude Code / delegation context, no longer used |
| [`archived/delegation.md`](./archived/delegation.md) | Delegation workflow, no longer used |

## Notes

- The root [`README.md`](../README.md) is the entry point and stays at the repo root.
- `spec/wording.md` is consumed at runtime (`src/lib/content.ts`) and traced into
  the serverless bundle (`next.config.ts`). Moving it requires updating both.
