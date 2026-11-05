---
id: FEAT-118
type: feature
title: Android UI parity with the web app
status: in-progress
assignee: adit
relations:
  blocks: []
  implements: ["DEC-003"]
  depends_on: ["DIR-001", "DEC-002", "DEC-003", "FEAT-102", "FEAT-115", "FEAT-116", "ROAD-001"]
verification:
  target_files:
    - "android/app/src/main/java/link/zippp/app/ui/theme/Tokens.kt"
    - "android/app/src/main/java/link/zippp/app/ui/theme/Shell.kt"
    - "android/app/src/main/java/link/zippp/app/ui/settings/SettingsScreen.kt"
    - "android/app/src/main/java/link/zippp/app/ui/camera/CameraScreen.kt"
    - "android/app/src/main/java/link/zippp/app/ui/review/ReviewScreen.kt"
    - "android/app/src/main/java/link/zippp/app/ui/space/SpaceScreen.kt"
  test_command: "npm run android:strings"
  prod_endpoint: ""
---

# What it is

The Android app looks and behaves like the web app wherever the web has an
equivalent screen. Web is the visual reference. Android keeps its own features
(notification capture, manual entry, device sign-in) in the same visual language.

# Goal

A user who moves between web and phone sees one product: same header, same
shell card, same type scale, same colours, same capture and review flow.

# Context

- `DEC-003` (Android is a first-class Space client), `DEC-002` (no payment UI).
- Web sources of truth: `src/components/app/AppShell.tsx`, `PhoneShell`,
  `SnapScreen`, `ConfirmCard`, settings page, Space page.
- Android sources: `android/app/src/main/java/link/zippp/app/ui/**`.
- ROAD-001 Phase 4 (capture loop). This is the visual layer over FEAT-102 and
  FEAT-115, not new product scope.

# Decisions made in the plan

| # | Decision | Why |
|---|---|---|
| 1 | Web wins on layout, spacing, type and colour. | The user compares the two visually. |
| 2 | Keep the FEAT-102 ops fields in the review sheet, styled like web fields, shown only when the template needs them. | The web card is behind the contract (§4.6). Parity must not drop contract fields. |
| 3 | Drop `BatchScreen`. Queue lives in the inline strip and the review sheet. | Web has no batch screen. |
| 4 | Header on every screen except capture: wordmark, Home, Settings. No credit pill on Android. | Owner call 2026-11-05. |
| 5 | Quota shows on Settings as a percentage of the fair-use plan, like Claude Code usage. No numbers of credits, no purchase path. | DEC-002, FEAT-117. |
| 8 | Web confirm card gets the FEAT-102 ops fields so both surfaces match. | Owner call 2026-11-05. |
| 6 | Android settings shows only sections that exist on Android: balance, Space, notification capture, plan usage, open sheet, sign out. No Telegram, WhatsApp, language or referral. | Those need web-only flows. |
| 7 | No new user-visible strings outside `spec/wording.txt`. Android strings come from `npm run android:strings`. | Project rule. |

# Slices

One slice at a time. Each ends with a green compile and a commit.

| Slice | Scope | State |
|---|---|---|
| S1 | Tokens, theme, Shell, header, 4 icon drawables, fonts | Done (compiles) |
| S2 | Header wired in `MainActivity`; Settings restyled | Done (compiles) |
| S3 | `me` payload adds `spreadsheet_title` to `workspace`. Plan used/included already ships. Update context §7. Server test. | Todo |
| S4 | Space screen restyled to the web layout | Todo |
| S5 | `CameraScreen` rewrite: guide frame, hint pill, tools row, flash, out-of-credits card, inline strip, Open sheet button, sheet-title pill | Todo |
| S6 | `ReviewScreen` becomes the bottom sheet (88% max height, minimize, prev/next, confirm card, footer). Keep hard flags, ack, corrections, ops. | Todo |
| S9 | Web `ConfirmCard` shows template ops fields, flags and assumed date per FEAT-102. Wording in `wording.txt`. | Todo |
| S7 | Delete `BatchScreen` and `RootScreen.Batch`. Remove dead strings. | Todo |
| S8 | Device run with screenshots next to the web | Yours (needs a phone) |

# Acceptance criteria

- [x] Shared tokens match `globals.css` and `tailwind.config.ts`
- [x] Header with Home and Settings on Settings and Space
- [x] Settings uses web section cards and buttons
- [ ] Settings shows quota as a percentage of the plan, with a bar
- [ ] Web confirm card shows the ops fields
- [ ] Sheet-title pill on the capture screen (needs S3)
- [ ] Space screen matches the web layout
- [ ] Capture screen matches the web layout
- [ ] Review is a bottom sheet over capture, ops fields kept
- [ ] `BatchScreen` removed
- [ ] Two side-by-side screenshot sets (web, phone) for capture, review, settings, Space
- [ ] No Android string mentions kredit, saldo, Rp or $

# Verification

- `npm run android:strings`, then `cd android && ./gradlew :app:compileSideloadDebugKotlin`
- `npm test` and `npx tsc --noEmit` after S3
- Manual: screenshots on a phone against Preview

# Owner answers (2026-11-05)

1. No credit pill. Quota percentage lives on Settings.
2. Web confirm card gets the ops fields (S9).

# Out of scope

- Android top-up, pricing, or any checkout link (DEC-002)
- Telegram, WhatsApp, language and referral sections on Android
- Dark mode
- New product behaviour. Only look, layout and navigation.

# Definition of done

Side-by-side screenshots of capture, review, settings and Space look like the
same product, and the compile, string and test gates pass.

Implementation note (2026-11-05): S1 and S2 built and compiled
(`:app:compilePlayDebugKotlin`). No device run. `Tokens.kt` still carries
`@implements FEAT-113`; add `FEAT-118` to the marker before moving to verify.
