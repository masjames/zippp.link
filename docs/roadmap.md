# Zippp.link Roadmap

Living tracker. Gate rule: never build the next gate before the current one passes. See `business-concept.md` for the full reasoning.

Last updated: 2026-07-16

---

## Where we are

**Gate 1: Smoke test** (validate demand before building the product). In progress.

```
CONCEPT  ██████████ done   what/who/price/wedge/positioning locked
LANDING  █████████░ 90%    built + designed; not deployed yet
DEPLOY   ██░░░░░░░░ 20%    pushed to GitHub; domain wiring undecided
TRAFFIC  ░░░░░░░░░░ 0%     no posts yet
SIGNAL   ░░░░░░░░░░ 0%     no waitlist emails yet
```

---

## Done

- [x] Market validation (Manus + bigideasdb + evaluator). Demand real, feature copyable, execution + niche is the game.
- [x] Decided what / who / price. Free / Pro $19 / Team $39 / Enterprise waitlist. Routing is the paywall. Four doors into Pro.
- [x] Positioning: "made for sellers, not support teams." Empty quadrant = simple + routing + catalog.
- [x] `docs/business-concept.md`: full blueprint (10 diagrams + verbose explanations) for deriving a PRD.
- [x] `landing/index.html`: smoke-test landing page. Indie-conversion style, one price ($19), one waitlist CTA.
  - [x] Cycling 3-niche hero catalog demo (jewelry / bakery / skincare).
  - [x] Google Sheet -> WhatsApp -> Instagram flow with single-color illustrations.
  - [x] Highlighted problem copy, feature list with icons, pricing, FAQ, founder note.
  - [x] Ran landing-page-taste skill ban-list clean. Verified desktop + mobile.
- [x] Optimized flow images to webp (~20KB each, from 4.5MB).
- [x] Pushed to `github.com/masjames/zippp.link` main (commit 4ca346d).

---

## Now (Gate 1, remaining)

- [ ] **Deploy decision.** Domain `zippp.link` is on an old Vercel project (`antep-mvp`), not the GitHub repo. Choose:
  - Option B (recommended): new git-connected static project, root = `landing`, then move the domain. Future pushes auto-deploy.
  - Option A: CLI-deploy `landing/` into `antep-mvp` (fast, not git-connected).
- [ ] Wire the waitlist form to a real endpoint (Formspree or Tally). Currently a JS stub, saves nothing.
- [ ] Add a favicon + social share image (OG tags) so shared links look real.
- [ ] Fill placeholders: founder name, founder photo.
- [ ] Deploy and verify live on zippp.link (desktop + mobile).

## Next (Gate 1, get signal)

- [ ] Write 5 launch posts (Reddit r/smallbusiness + r/Etsy, X build-in-public, 2 niche FB groups).
- [ ] Post them. Reply to real people with the pain, drop the link only where it fits.
- [ ] Run 1 to 2 weeks. Watch waitlist signups and "when does it ship" replies.
- [ ] **Gate decision:** enough interest -> build MVP. Silence -> stop or re-angle. Saved weeks either way.

---

## Later (only if Gate 1 passes)

**Gate 2: MVP** (build the smallest real product, ship to waitlist)
- [ ] Catalog page at `zippp.link/<slug>` (the magic moment, build first).
- [ ] Google Sheet sync (fetch + cache).
- [ ] Seller dashboard: connect sheet, add numbers, routing mode, offline toggle.
- [ ] Round-robin router + `wa.me` deep-link order handoff.
- [ ] Google auth.
- [ ] Ship to waitlist, get first real usage. Pass = people actually use it.

**Gate 3: First dollar** (prove willingness to pay)
- [ ] Billing (Stripe). Turn on Pro $19.
- [ ] Free tier (1 number, 10 to 15 products, "via zippp" badge).
- [ ] Pixel event on order tap, custom order message, analytics.
- [ ] 1 paying shop = concept sound. Then scale to ~41 shops = $1000/month.

**Growth (after first dollar)**
- [ ] Team $39 tier (weighted + sticky routing, CSV export).
- [ ] Enterprise waitlist (own domain, white-label).
- [ ] SEO pages ("whatsapp catalog", "link in bio for whatsapp").
- [ ] Build-in-public cadence on X. Product Hunt launch.

---

## Open questions to resolve

- Deploy: Option A or B, and is `antep-mvp` dead/replaceable?
- Form: Formspree vs Tally.
- Fonts: keep 3 families (Archivo + DM Sans + Shantell) or collapse to 2?
- Free tier at launch, or price-first smoke test with $19 only? (Currently $19 only. Correct for now.)
