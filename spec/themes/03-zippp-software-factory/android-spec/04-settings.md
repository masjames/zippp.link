# 04 Settings

Android spec for FEAT-118. Conversion table, tokens and touch-target rules are in `01-shell-and-navigation.md`.

Web sources: `src/app/app/settings/page.tsx`, `src/components/app/PlanCard.tsx`, `ConnectedDevices.tsx`, `PairDeviceModal.tsx`, `TopUpClient.tsx` (read only to know what to leave out).
Android source: `ui/settings/SettingsScreen.kt`.

## 1. Purpose

Show the quota, link to Space and Sheet, hold the Android-only notification capture controls, and sign out. Same cards and buttons as the web settings page, minus everything that sells or needs a web-only flow.

## 2. Web section order and Android decision

| # | Web section | Web element | Android |
|---|---|---|---|
| 1 | Title | `h2 text-3xl font-extrabold` | Keep |
| 2 | Balance card | `rounded-2xl bg-surface p-4`, `{count} credits`, expiry line | Replace with quota card (section 3.2) |
| 3 | Space button card | `bg-mist` full width button `app.space.settings` | Keep |
| 4 | Language | `LangSelect` | Omit. Android is Indonesian only |
| 5 | Pair device and Connected devices | `web.pairing.button`, `ConnectedDevices` | Replace with "This device" card (section 3.5) |
| 6 | Plan card | `PlanCard`: status, meter, used, period end, Subscribe or Renew button | Merge into the quota card. No Subscribe or Renew |
| 7 | Telegram panel | `TelegramLinkPanel` | Omit. Web link flow |
| 8 | WhatsApp panel | `WaLinkPanel` | Omit. Web link flow, channel is off |
| 9 | Referral | Coming soon card | Omit |
| 10 | Bottom stack | Admin, Top up, Sheet connected, Sign out | Sheet connected and Sign out only |
| Android only | Notification capture | n/a | Keep, placed after the quota card (FEAT-115) |

## 3. Layout tree

```
ZipppShell(Card)                       padding 24 / 16 / 48, gap 16
  Column(verticalScroll, spacedBy 16)
    Text title                         ZipppType.h1, ink            web: h2 text-3xl
    QuotaCard                          3.2
    Button "Zippp Space"               Mist, 52dp, full width       web: card wrapping a py-3 button
    NotificationCaptureCard            3.3
    ThisDeviceCard                     3.5
  Spacer(weight 1)                     web: mt-auto
  Column(spacedBy 12)
    Button "Sheet connected"           Mist, 56dp                   web: py-4 mist
    Button "Keluar"                    Primary (maroon, white text), 56dp   web: bg-btn text-btntext
```

On web the Space button sits inside its own `rounded-2xl bg-card p-4` card. On Android the card wrapper is dropped when the page is already white: a white card on a white shell has no visible edge, and the extra 16dp padding shrinks the tap area. Keep the button at full width.

### 3.2 Quota card

```
Column(fillMaxWidth, clip card 8dp, background surface #F6D3C5, padding 16, spacedBy 4)
  Row(spaceBetween, baseline)
    Text android.settings.quota.title      ZipppType.small, muted
    Text plan status                       ZipppType.smallStrong, muted   (Active / Canceled / No plan yet)
  Text "{pct}% used"                       ZipppType.h1, ink
  Box bar                                  height 8dp, fillMaxWidth, pill, track page #E8E8E8
    Box fill                               fraction pct/100 (clamped 0..100), pill, orange; danger red at 100
  Text "{used} of {included} used"         ZipppType.small, muted
  Text "Ends {date}"                       ZipppType.small, muted   (only if period_end is available)
```

Mirrors: web balance card (surface background, 16dp padding, 8dp radius) and `PlanCard` meter (`h-2` track `bg-page`, fill `bg-brand`, role meter 0..100). Accessibility: bar exposes a progress range semantic (`progressBarRangeInfo`) with the percentage.

Data: `me.plan` = `{ status, included, used, used_pct }`. Gap: `PlanInfo` has no `period_end`, while `GET /api/billing/plan` returns it. Either add `period_end` to the `me` plan object or call `GET /api/billing/plan` (bearer is accepted). Until then the "Ends" line is hidden.

States:

| State | Shows |
|---|---|
| Loading | Card hidden (web hides PlanCard until loaded, same here) |
| Plan present, active | Card as above |
| Plan present, canceled | Status text `Canceled`, bar and numbers still shown |
| Plan null | Card with title, status `No plan yet`, no bar, one line `android.settings.quota.none` (missing key, section 5). Never a pointer to the web (DEC-002) |
| `used >= included` | Bar fill red `#B3261E`, extra line `android.plan.limit` |
| Error | Card hidden, no error text (same as web: `.catch` sets plan null) |

### 3.3 Notification capture card (Android only, FEAT-115)

```
ZipppSectionCard                         8dp, white, 16dp padding, spacedBy 8
  Text android.settings.capture.title    ZipppType.h3
  Text android.settings.capture.body     ZipppType.small, muted
  Text access on / off                   ZipppType.small, muted or danger
  Button android.settings.capture.openAccess   Outline, 52dp, full width
  Row(spaceBetween, min height 56)
    Text android.settings.capture.toggle ZipppType.bodyStrong
    Switch                               enabled only when access is on
  Text error (permission denied)         ZipppType.small, danger
```

Behaviour: unchanged from the current code. Toggle on requests `POST_NOTIFICATIONS` on Android 13 and up. Access status refreshes on resume. The Switch is 48dp wide minimum (Material default is 52x32, add vertical padding to reach a 48dp tap height).

### 3.5 This device card (replaces Pair and Connected devices)

Web `ConnectedDevices` calls `GET /api/auth/devices` and `POST /api/auth/device/revoke`. Both routes accept the cookie only (they do not call `resolveRequestUser`), so Android cannot list or revoke devices today. Until that changes the card is read only.

```
ZipppSectionCard
  Text "Perangkat ini"                   ZipppType.h3             (missing key, section 5)
  Text "{model} · {app version}"         ZipppType.small, muted   from Build.MODEL and BuildConfig
```

When bearer support is added to the devices routes, extend this card to the web list: device name 14sp semibold, `platform · version` 12sp muted, paired and last seen 12sp muted, Revoke 48dp row in danger, Revoke all in the card header. Confirm with the system dialog and `web.devices.confirmRevoke`.

### 3.6 Bottom stack

| Button | Kind | Height | Action |
|---|---|---|---|
| Sheet connected (`app.sheets.connected`) | Mist | 56dp | Open Sheet connected screen (file 06) |
| Sign out (`android.settings.signOut`, value `Keluar`) | Primary | 56dp | Clear token, go to Sign in |

Web order is Admin, Top up, Sheet, Sign out, with 12dp between. Android drops Admin and Top up.

Current code delta: the existing Settings screen uses a `Danger` kind (mist with red text) for Sign out. Web uses the dark `bg-btn` button. Spec follows web.

## 4. Behaviour and network

| Action | Call | Result |
|---|---|---|
| Open screen | `GET /api/auth/mobile/me` (cached from Home, refresh on resume) | plan for the quota card |
| Sign out | `POST /api/auth/logout` (accepts bearer) then `SecureTokenStore.clear()` | Sign in |
| Space | none | navigate |
| Sheet connected | none | navigate |

If the logout call fails, still clear the local token. A failed network call must never trap the user signed in.

## 5. Wording keys

Present: `app.settings.title`, `app.space.settings`, `app.sheets.connected`, `android.settings.quota.title`, `android.settings.quota.pct`, `android.plan.used`, `android.plan.limit`, `app.plan.active`, `app.plan.canceled`, `app.plan.free`, `app.plan.periodEnd`, `android.settings.capture.*`, `android.settings.signOut`, `web.devices.*`.

Missing, to add: `android.settings.quota.none` (neutral line when no plan), `android.settings.device.title` (This device).

Do not use on Android (DEC-002): `app.credits.balance` (says kredit), `app.credits.pill`, `app.plan.subscribe`, `app.plan.renew`, `app.plan.busy`, `app.plan.error`, `app.topup.*`.

Contradiction to resolve: `app.plan.body` reads "Subscribe on the web. Android only shows your usage." and `app.settings.soon` reads "Balance is not available right now." / "Saldo belum tersedia". The first is an anti-steering call to action and the second says saldo. Neither may appear on Android. The `android.*` namespace has no replacement for the plan-null line, hence the missing key above.

## 6. Android-only differences, allowed

| Difference | Why |
|---|---|
| Quota percentage with bar replaces credits and expiry | Owner decision, DEC-002, FEAT-117 |
| No Subscribe or Renew button | DEC-002 |
| No Top up button | DEC-002 |
| No language, Telegram, WhatsApp, referral, admin | Web-only flows or Android is Indonesian only |
| Notification capture card | FEAT-115, device only |
| This device card instead of Connected devices | Devices routes are cookie only |
| Sign out is the last and darkest button | Same as web |

## 7. Acceptance checklist

1. Title "Pengaturan" is 30sp Archivo ExtraBold, ink, at the top of the shell, 16dp below the header.
2. First card is peach `#F6D3C5`, 8dp corners, 16dp padding, with "{pct}% used" at 30sp.
3. The bar is 8dp high, grey track, orange fill, and the fill width matches the percentage text.
4. At 100% the bar is red and the limit line shows.
5. No text on the page contains kredit, saldo, credits, Rp, a price, Subscribe, Renew, Top up or "buy".
6. The Space button is mist, full width, 52dp high.
7. The notification capture card shows the access status, the open-access button and the toggle. The toggle is disabled when access is off.
8. Returning from system notification settings refreshes the access status without leaving the screen.
9. Sheet connected is mist and 56dp. Sign out is maroon with white text and 56dp, last on the page.
10. With a 1.3x font scale nothing is clipped and the bottom buttons are still reachable by scrolling.
11. Tapping Sign out lands on Sign in. Reopening the app stays on Sign in.
12. With the plan null the card shows the status "No plan yet" and one neutral line, no bar.
13. Layout inspector: no tappable element under 48dp.
