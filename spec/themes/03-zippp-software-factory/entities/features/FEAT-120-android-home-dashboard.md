---
id: FEAT-120
type: feature
title: Android Home dashboard
status: todo
assignee: adit
relations:
  blocks: []
  implements: ["DEC-003"]
  depends_on: ["DIR-001", "DEC-002", "DEC-003", "FEAT-118", "FEAT-104", "FEAT-119", "ROAD-001"]
verification:
  target_files:
    - "src/lib/home/summary.ts"
    - "src/app/api/home/summary/route.ts"
    - "android/app/src/main/java/link/zippp/app/ui/home/HomeScreen.kt"
  test_command: "npm test"
  prod_endpoint: ""
---

# What it is

A new Android Home screen: the main dashboard of a personal wealth app. It shows
today spending and last spending read from the user's own Google Sheet, a Google
Sheets connected card, and quick access to Scan and Manual entry. A Space card
opens the Space screen. A quota bar is an optional card. The full design is in
`android-spec/07-home-dashboard.md`.

# Goal

After sign in the user sees where their money went today in one glance, and adds
the next receipt in two taps. The scan screen is no longer the first screen.

# Context

- Owner decision 2026-11-05: Android main screen is a dashboard, not capture.
- AGENTS.md: the Google Sheet is the system of record. zippp keeps no receipt
  ledger. Numbers are read live with a 60 second aggregate cache and never stored
  as receipts.
- DEC-002: no purchase paths, no kredit, saldo, Rp or currency symbols on Android.
  Amounts show as grouped numbers plus the ISO code from the sheet.
- FEAT-104 (month tabs, daily totals) is not built. Home reads the single tab with
  a 400 row window until then, and switches to the daily block when it ships.
- Depends on FEAT-119: step 1 (the Google helpers take an explicit `userId`) and
  `POST /api/auth/mobile/google-grant` for a phone-only Google user. A user with no
  Google grant gets `GOOGLE_GRANT_REQUIRED` and sees the grant card (spec 7.10).

# Decisions (owner, 2026-11-05)

- The 60 second server cache of Sheet aggregates is accepted. It holds aggregates
  only, never receipt rows, so it is not a receipt ledger under AGENTS.md.
- Space is a card on Home that opens the top-level Space screen. Settings also links
  to Space. Back from Space returns to Home.
- Manual lives on Home only. Capture back always returns to Home.
- Scan and Manual are disabled only when the quota is known to be exhausted.
  Unknown quota never disables them.
- Google access on the phone is the `serverAuthCode` flow (Option A).

# Slices

S-H1 spec and wording keys. S-H2 pure parse and aggregate with tests. S-H3 route,
cache, rate limit. S-H4 Android screen with fake data. S-H5 wiring and navigation.
S-H6 quota and Space cards. S-H7 daily block source after FEAT-104. S-H8 device run.
Details and dependencies are in section 19 of the spec file.

# Acceptance criteria

- [ ] Cold start lands on Home, not Capture
- [ ] Today total equals the hand sum of Amount plus Tax for today's rows
- [ ] A multi-line receipt counts once and its total is not multiplied
- [ ] Last spending shows the receipt with the latest Captured at
- [ ] `12.500` as text reads as 12,500
- [ ] Scan 56dp, Manual 52dp, Open Google Sheets 52dp outline, every tappable at least 48dp (canonical table in `android-spec/01`)
- [ ] Space card opens Space, and back from Space lands on Home
- [ ] A user with no Google grant sees the grant card, not an error
- [ ] Stale card with saved time when offline after one good load
- [ ] Quota exhausted dims Scan and Manual with no purchase link; unknown quota leaves them enabled
- [ ] No Android string contains kredit, saldo, Rp or a currency symbol
- [ ] First frame with a cache under 300 ms
- [ ] Capture has no Manual pill and no Space or Settings text links
- [ ] Sign out clears the cache

# Verification

- Server: `npm test`, `npx tsc --noEmit`, `npm run build`
- Android: `:app:compilePlayDebugKotlin`, `:app:compileSideloadDebugKotlin`
- Phone: screenshots for each state in the spec, section 7

# Out of scope

- Month to date index (needs FEAT-104)
- Row deep links into the Sheet
- Charts and history views
- Any Android payment or pricing UI

# Definition of done

Screenshots of every state match the wireframes, the Today figure matches the
Sheet on a three-receipt fixture, and the gates above pass.
