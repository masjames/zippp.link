# 05 Editor & Dashboard UX

The seller-facing app. Onboarding must complete in under five minutes or the target buyer (and an ADHD founder) bounces. The editor UX is itself part of leg 2: it should feel as good as the storefront looks.

## Onboarding: the five-minute path

```
STEP 1  Connect Sheet      paste Google Sheet URL (or "use a template sheet")
   │    validate columns, show a live preview immediately
   ▼
STEP 2  Pick a look        choose template + preset chips, live phone preview
   │
   ▼
STEP 3  Add numbers        1 to 5 WhatsApp numbers + routing mode
   │
   ▼
STEP 4  Claim slug + share  zippp.link/<slug>, copy link, done

Progress is visible. Each step is skippable-with-defaults so a seller can
be live in one step if they want.
```

## Editor layout (Taplink/Bento pattern, kept light)

```
 ┌───────────────┬────────────────────────────┐
 │  LIVE PREVIEW  │  CONTROLS                   │
 │  (phone frame) │  ─ Template  [chip chip …]   │
 │   updates      │  ─ Palette   [swatch swat…]  │
 │   instantly    │  ─ Font      [Aa Aa Aa]      │
 │                │  ─ Rounding  [▢ ▢ ▢ ▢]       │
 │                │  ─ Button    label + style   │
 └───────────────┴────────────────────────────┘

- Preset CHIPS only. No sliders, no hex fields, no dropdown of 40 fonts.
- Every change reflects in the preview in < 100ms.
- Mobile editor: preview on top, controls below.
```

## Dashboard IA (Abby Covert: label as the seller speaks)

```
/dashboard
  ├ My shop          preview + share link + "view live"
  ├ Products         sheet connection, sync status, re-sync
  ├ Look             template + theme editor (above)
  ├ Numbers          WhatsApp numbers, routing mode, offline toggles
  ├ Orders/Analytics click + order events, pixel (Pro)
  ├ Message          the pre-filled order message (Pro custom)
  └ Plan             billing, tier, upgrade

Labels are nouns the seller uses ("Look", "Numbers"), not our jargon
("Theme engine", "Router config").
```

## Interaction rules

```
- Google login (they already have it for Sheets). No password.
- Autosave. No "Save" button anxiety; show a quiet "Saved" state.
- Re-sync is one tap; sync status is always visible and honest.
- Offline toggle per number is one tap (shift support).
- Destructive actions (remove number, disconnect sheet) confirm once.
- Empty states teach: "No numbers yet. Add one to start routing."
```

## Performance & feel

```
- Editor preview is instant (local state, no round-trip per keystroke).
- Dashboard loads fast; no heavy framework bloat on first paint.
- Motion 150-250ms ease-out. Respect reduced-motion. No spinners where a
  skeleton or optimistic update will do.
```

## ADHD-aware design (the founder is the first user)

```
- One clear next action per screen.
- Short paths; nothing important more than 2 clicks deep.
- Defaults everywhere so "good enough" is one tap away.
- No sprawling settings pages. If a control is rarely used, hide it.
```

## Out of scope

```
✗ full CRM / inbox / team chat (business-concept section 14 says no)
✗ multi-workspace / agency dashboards (Enterprise, much later)
✗ deep settings matrices
```

## Success criteria

A non-technical seller connects a sheet, picks a look, adds a number, and shares a live link in under five minutes, and the editor feels good enough that tweaking the look is fun, not a chore.
