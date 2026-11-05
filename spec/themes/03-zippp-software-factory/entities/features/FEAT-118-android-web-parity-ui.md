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
    - "src/lib/review-ops.ts"
    - "src/lib/mobile/me-workspace.ts"
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
| 0 | Spec before code. No slice is built until its screen spec is agreed. | Owner call 2026-11-05. |
| 1 | Web wins on layout, spacing, type and colour. | The user compares the two visually. |
| 2 | Keep the FEAT-102 ops fields in the review sheet, styled like web fields, shown only when the template needs them. | The web card is behind the contract (§4.6). Parity must not drop contract fields. |
| 3 | Drop `BatchScreen`. Queue lives in the inline strip and the review sheet. | Web has no batch screen. |
| 4 | Header on every screen except sign in, sheet choose and the review overlay: wordmark, Home (hidden on Home), Settings (hidden on Settings). Capture shows it. No credit pill on Android. | Owner call 2026-11-05. Web shows the header on capture. |
| 5 | Quota shows on Settings as a percentage of the fair-use plan, like Claude Code usage. No numbers of credits, no purchase path. | DEC-002, FEAT-117. |
| 6 | Android settings shows only sections that exist on Android: balance, Space, notification capture, plan usage, open sheet, sign out. No Telegram, WhatsApp, language or referral. | Those need web-only flows. |
| 7 | No new user-visible strings outside `spec/wording.txt`. Android strings come from `npm run android:strings`. | Project rule. |
| 8 | Web confirm card gets the FEAT-102 ops fields so both surfaces match. | Owner call 2026-11-05. |
| 9 | Home dashboard is the main screen (FEAT-120). Capture is entered from Home and back always returns to Home. Manual lives on Home only. Space is a top-level screen reached from a Home card and from Settings. | Owner calls 2026-11-05. |
| 10 | One canonical button table in `android-spec/01`: Primary 56, Brand 56, Mist 52, Outline 52, Danger text 52, minimum target 48dp. | Resolves conflicting heights across the screen specs. |
| 11 | Google access on a phone uses `serverAuthCode` and `POST /api/auth/mobile/google-grant` (FEAT-119). | Owner call 2026-11-05. |
| 12 | Builds: debug points to Preview, release points to `https://www.zippp.link` and cannot carry a bypass header. Production mobile stays dark until STORY-102. See spec 01 section 12. | Owner call 2026-11-05. |
| 13 | Delete in the review sheet has a 5 second Undo snackbar on Android. The web stays immediate. | Owner call 2026-11-05. |
| 14 | Phone revokes this device only. Disconnect sheet and column map editing stay on the web. | Owner call 2026-11-05. |
| 15 | Capture accepts images and PDF, and spreadsheets (CSV, Excel) through FEAT-121. | Owner call 2026-11-05. |
| 16 | Month to date is deferred until after FEAT-104. Home constants stay in `src/lib/billing/config.ts`, no `sheet-style.ts` now. | Owner call and default 2026-11-05. |

# Screen specs

Spec first, code second. Each Android screen is specified from the web source in
`android-spec/` (layout in dp, states, calls, 48dp touch targets, wording keys, and a
numbered screenshot checklist). Code agents implement from these files only.

| File | Screen |
|---|---|
| `android-spec/00-audit-and-defects.md` | Phone audit, root causes |
| `android-spec/01-shell-and-navigation.md` | Header, navigation graph, home screen options |
| `android-spec/02-capture.md` | Capture |
| `android-spec/03-review-sheet.md` | Review bottom sheet |
| `android-spec/04-settings.md` | Settings |
| `android-spec/05-space.md` | Space |
| `android-spec/06-sheet-choose-and-sign-in.md` | Sheet setup and sign-in |
| `android-spec/07-home-dashboard.md` | Home dashboard (FEAT-120) |
| `android-spec/08-flows-system-wireframes.md` | User flow, system diagram, wireframes, contradictions resolved |
| `android-spec/09-bearer-route-slice.md` | Bearer auth for sheet and device routes (FEAT-119) |
| `android-spec/10-pairing.md` | Pairing code screen |
| `android-spec/11-manual-entry.md` | Manual entry |
| `android-spec/12-google-grant.md` | Google Drive and Sheets grant |
| `android-spec/07-home-dashboard.md` | Home dashboard (FEAT-120) |

# Slices

One slice at a time. Each ends with a green compile and a commit.

| Slice | Scope | State |
|---|---|---|
| S1 | Tokens, theme, Shell, header, 4 icon drawables, fonts | Done (compiles) |
| S2 | Header wired in `MainActivity`; Settings restyled | Done (compiles) |
| S3 | `me` payload adds `spreadsheet_title` to `workspace`. Plan used/included already ships. Update context §7. Server test. | Built, compiles |
| S4 | Space screen restyled to the web layout | Built, compiles |
| S5 | `CameraScreen` rewrite: guide frame, hint pill, tools row, flash, out-of-credits card, inline strip, Open sheet button, sheet-title pill | Built, compiles |
| S6 | `ReviewScreen` becomes the bottom sheet (88% max height, minimize, prev/next, confirm card, footer). Keep hard flags, ack, corrections, ops. | Built, compiles |
| S9 | Web `ConfirmCard` shows template ops fields, flags and assumed date per FEAT-102. Wording in `wording.txt`. | Built, compiles |
| S7 | Delete `BatchScreen` and `RootScreen.Batch`. Remove dead strings. | Built, compiles |
| S8 | Device run with screenshots next to the web | Yours (needs a phone) |

# Acceptance criteria

- [x] Shared tokens match `globals.css` and `tailwind.config.ts`
- [x] Header with Home and Settings on Settings and Space
- [x] Settings uses web section cards and buttons
- [x] Settings shows quota as a percentage of the plan, with a bar
- [x] Web confirm card shows the ops fields
- [ ] Sheet-title pill on the capture screen (needs S3)
- [x] Space screen matches the web layout
- [x] Capture screen matches the web layout
- [x] Review is a bottom sheet over capture, ops fields kept
- [x] `BatchScreen` removed
- [ ] Two side-by-side screenshot sets (web, phone) for capture, review, settings, Space
- [ ] No Android string mentions kredit, saldo, Rp or $

# Verification

- `npm run android:strings`, then `cd android && ./gradlew :app:compileSideloadDebugKotlin`
- `npm test` and `npx tsc --noEmit` after S3
- Manual: screenshots on a phone against Preview

# Owner answers (2026-11-05)

1. No credit pill. Quota percentage lives on Settings.
2. Web confirm card gets the ops fields (S9).
3. Home dashboard is the main screen, Manual lives on Home, Space is a Home card, Capture back returns to Home.
4. Google grant is Option A (`serverAuthCode`). The Google consent screen is the production one.
5. Undo on Delete: yes, 5 seconds, Android only.
6. Revoke: this device only. PDF, images and spreadsheets are accepted at capture (FEAT-121).

The per-file decision tables are the record. Each `android-spec` file ends with a Decisions log.

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

Implementation note (2026-11-05, later): S3 to S7 and S9 built on three parallel
branches and merged. Gates on the merged tree: `npm test` 79 pass, `npx tsc --noEmit`
clean, `npm run build` ok, `:app:compilePlayDebugKotlin` and
`:app:compileSideloadDebugKotlin` ok. No browser or device run. Auto-snap left out
(FEAT-107). The capture screen has small Space and Settings text links in that build. The
spec removes them: Capture shows the header with Home and Settings, and the
rebuilt screen follows `android-spec/02-capture.md`. `/api/auth/mobile/me` must return `spreadsheet_id` for the Open sheet
button; it now does. S8 (screenshots on a phone) is the remaining step and is the owner's.
