# Proof Profile Prototype (Adit @ AppWorkZ)

Working clickable prototype: a portable professional proof profile hosted on zippp.link.
Static, no build step, no dependencies, same architecture as the landing page.

## Routes (all under `landing/`, deployed as-is by Vercel)

| Route | What it is |
| --- | --- |
| `adit.html` | Public proof profile for Adit Dewantara. Hero, honest aggregates, shipped work with evidence, client verifications, contact draft form. |
| `owner.html` | Owner console (no auth in prototype, page is `noindex`). Manage profile, positioning, availability, CTAs, projects, proof links, payment state, verification requests, inbox, GitHub mock, visibility, export/import/reset. |
| `verify.html` | Client verification journey. No token: request form. With `?token=...`: private confirmation page. |
| `index.html` | Landing page, untouched except two links ("Proof profile" in nav and footer) styled identically to existing links. |

## Architecture

```
landing/assets/profile/
  store.js   mock database: seed data + localStorage persistence (zippp.profile.db.v1)
  api.js     async service layer: every page talks to ZipppApi, never to localStorage
  ui.js      shared helpers: toast, modal, confirm, icons, reveal-on-scroll, formatting
  app.css    design system copied from the landing tokens/components + new components
```

The service layer returns Promises with simulated latency. Swapping in a real backend
means reimplementing the `ZipppApi` interface; pages do not change.

## Data model

- `profile`: name, handle, tagline, location, availability (status/label/note), positioning (headline/intro/focus), contact CTA labels.
- `projects[]`: title, role, status, summary, description, focus tags, payment state, evidence links.
- `evidence[]` (per project): `live` (verified reachable link), `demo` (mock data), `private` (no link), `code`.
- `verifications[]`: client requests with token, status pending/confirmed/declined, answers, optional self-reported value, `isDemo` flag.
- `drafts[]`: contact form messages from the public profile (the prototype's safe communication mechanism).
- `github`: mock connection (handle stored locally, nothing sent).
- `settings`: visibility toggles.

## Honesty rules implemented

- Live evidence links: only `https://rileks.vercel.app` and `https://zippp-link.vercel.app` (both checked reachable). Storefront demo catalogs are labeled demo data. Impels has no invented deployment: evidence is "private, on request".
- Aggregate counts derive from the store. Demo verifications are tagged and excluded from the real count.
- Client verification flow states loudly that no email is sent in the prototype (the link is shown instead).
- Payment state is a badge only: verified / self-reported / not disclosed. No amounts, banking, transaction or payer data is ever stored or rendered, except a client-reported value which is always labeled self-reported.
- Contact form saves a local draft (visible in the owner inbox); it never claims an email was sent.

## Verification flow (end to end)

1. Client opens `verify.html` and submits name/company/email/project.
2. Prototype shows the private link (production would email it).
3. Client opens `verify.html?token=...`, answers four questions (yes/no toggles), optional self-reported value and note.
4. Confirmation updates `adit.html` evidence section immediately (same localStorage store).
5. Owner can tag demo verifications, delete requests, and upgrade a project's payment badge to "verified" (owner holds independent proof).

## Testing done

See the implementation summary for the tested journeys: syntax checks (node --check),
local HTTP server walkthrough of public profile, owner CRUD, verification flow, and
responsive checks at the landing breakpoint.

## Known limitations

- All data is per-browser localStorage: different devices do not share state.
- No auth: the owner console is open to anyone who finds the URL (prototype only).
- The GitHub connection is a mock: it stores a handle, it does not verify it.
- Contact drafts and verification links never leave the browser.
- The landing page waitlist (Tally) is unchanged; the proof profile is a separate surface.
