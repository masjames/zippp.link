# zippp specs

Index of the documentation. Active specs describe what zippp is and how it is
built; `archived/` holds superseded material. Revision 2 brief:
[`AUDIT-2026-10.md`](./AUDIT-2026-10.md) — **start here for the next build**.

## Active

| File | Owns |
|---|---|
| [`AUDIT-2026-10.md`](./AUDIT-2026-10.md) | **Start here (Revision 2)** — findings, decisions, task order for implementer |
| [`SPEC.md`](./SPEC.md) | What zippp is: personas, requirements, data contract, privacy, definition of done |
| [`USER-FLOW.md`](./USER-FLOW.md) | Who does what, in order (landing, guard, snap, top-up, ops per template) |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | How it is built: stack, pipeline, stores, billing, sheet-layout modules |
| [`TEMPLATES.md`](./TEMPLATES.md) | Five templates, columns, month tabs, daily block, photo proof |
| [`PRICING.md`](./PRICING.md) | Credits, IDR presets (Rp 15.000 = 100), referral, privacy line |
| [`OFFER.md`](./OFFER.md) | Selling brief |
| [`COGS.md`](./COGS.md) | Cost of goods / unit economics |
| [`LATER.md`](./LATER.md) | Parked ideas, out of scope for Revision 2 |
| [`wording.md`](./wording.md) | **Every user-visible string** (EN/ID). Parsed at runtime — edit values only. |
| [`zippp-ship-plan.md`](./zippp-ship-plan.md) | Older Phase 1 task log; Revision 2 tasks live in the audit §10 |
| [`./discussions/zippp-overview.md`](./discussions/zippp-overview.md) | External review brief (extraction / eval) |

## Archived (inactive)

| File | Why archived |
|---|---|
| [`archived/HANDOFF.md`](./archived/HANDOFF.md) | Session handoff; superseded by active specs + audit |
| [`archived/REVISION-1.md`](./archived/REVISION-1.md) | Capture revision; shipped behaviour is in `USER-FLOW.md` |
| [`archived/IMPLEMENTATION_SUMMARY.md`](./archived/IMPLEMENTATION_SUMMARY.md) | Pre-Sheets pivot |
| [`archived/user-flow.html`](./archived/user-flow.html) | Old flow prototype |
| [`archived/CLAUDE.md`](./archived/CLAUDE.md) | Delegation context, unused |
| [`archived/delegation.md`](./archived/delegation.md) | Delegation workflow, unused |

## Notes

- Root [`README.md`](../README.md) stays at the repo root.
- `spec/wording.md` is loaded by `src/lib/content.ts` and traced in
  `next.config.ts`. Moving it requires updating both.
- Personas live in `SPEC.md` / `USER-FLOW.md` / `TEMPLATES.md` — no separate
  `PERSONAS.md`.
