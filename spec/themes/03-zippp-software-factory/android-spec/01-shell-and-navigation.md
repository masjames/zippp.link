# 01 Shell and navigation

Android spec for FEAT-118. Web is the visual reference. Files 02 and 03 (capture and review) are written by another track. This file defines the frame every screen sits in, the navigation graph, and the entry rules.

Web sources: `src/components/app/AppShell.tsx`, `PhoneShell.tsx`, `src/app/globals.css`, `tailwind.config.ts`.
Android sources: `ui/theme/Tokens.kt`, `ui/theme/Shell.kt`, `MainActivity.kt`.

## 1. Purpose

One frame, one header, one navigation model. A user who moves between web and phone sees the same wordmark, the same shell card, the same type scale and the same colours.

## 2. Tailwind to Android conversion table

The web uses a half-size radius scale (`tailwind.config.ts`). 1 Tailwind spacing unit = 4dp. Font sizes are 1 rem = 16sp.

| Web | Value | Android |
|---|---|---|
| `px-6` | 24 | `ZipppSpace.shell` 24dp |
| `pt-4` (shell body top) | 16 | `ZipppSpace.top` 16dp |
| `pb-12` (shell body bottom) | 48 | `ZipppSpace.bottom` 48dp |
| `gap-4` | 16 | `ZipppSpace.gap` 16dp |
| `p-4` (card) | 16 | `padding(16.dp)` |
| `rounded-2xl` (card) | 8 | `ZipppRadius.card` |
| `rounded-3xl` | 12 | `ZipppRadius.sheet` |
| `rounded-xl` (inputs) | 6 | `ZipppRadius.xl` |
| `rounded-full` | pill | `ZipppRadius.pill` |
| `rounded-phone` | 18 | `ZipppRadius.phone` (not used on a phone, the screen is the shell) |
| `max-w-[430px]` | 430 | `widthIn(max = 430.dp)`, centred |
| `text-3xl font-extrabold leading-none` | 30sp / 30sp | `ZipppType.h1` |
| `text-2xl font-extrabold` | 24sp | `ZipppType.h2` |
| `text-lg font-extrabold` | 18sp | `ZipppType.h3` |
| `text-sm` | 14sp | `ZipppType.body` / `bodyStrong` (semibold) |
| `text-xs` | 12sp | `ZipppType.small` / `smallStrong` |
| `font-head` | Archivo | `ZipppHeadFamily` |
| `font-body` | Inter | `ZipppBodyFamily` |

Colours (identical to `globals.css`): orange `#EE5329`, ink `#1C0B09`, maroon `#3E0F0C`, peach/surface `#F6D3C5`, mist `#C9CFD9`, page `#E8E8E8`, card `#FFFFFF`, muted `#5E4640`, line `#E4B9A8`, btn `#3E0F0C`, btn text `#FFFFFF`, accent `#C73A12`, danger `#B3261E`.

## 3. Touch targets (Android rule, stricter than web)

Web buttons are `py-3` (about 44dp) for secondary and `py-4` (about 56dp) for primary. On Android:

- Every tappable element is at least 48dp high and 48dp wide, including text links and icon buttons. A visually smaller element gets padding or a 48dp hit area.
- Primary and full-width buttons are 56dp high (web `py-4`).
- Secondary full-width buttons are 52dp.
- Inline text actions (web `text-xs font-semibold`, for example Edit, Archive, Remove) become 48dp-high tap rows. The text stays 12sp.
- Space between two tappable elements is at least 8dp.

Current code check: `ZipppButton` is 48dp fixed. Required change: 56dp for `Primary` and `Brand`, 52dp for `Mist`, `Danger`, `Outline`.

## 4. Layout tree

### 4.1 Frame for header screens (Settings, Space, Sheet screens)

```
Column(fillMaxSize, background page #E8E8E8)
  ZipppHeader                         web: AppShell header row
  Box(weight 1)
    ZipppShell(tone = Card)           web: PhoneShell default (bg-card)
      Column(padding start/end 24, top 16, bottom 48, spacedBy 16, scrollable)
```

### 4.2 Header (`ZipppHeader`, mirrors AppShell lines 117 to 187)

```
Box(fillMaxWidth, background page, contentAlignment TopCenter)
  Row(widthIn max 430, padding start 16 end 16 top 16 bottom 20, spaceBetween)
    Text "zippp"   ZipppType.wordmark 24sp Black, tracking -0.5sp, colour orange
                   tap target 48dp, tap goes Home
    Row(spacedBy 12)
      HomeButton   icon ic_home 20dp + label 14sp semibold muted, spacedBy 8, min 48dp
      SettingsButton icon ic_gear 20dp + label 14sp semibold muted, spacedBy 8, min 48dp
```

Header contents per screen:

| Screen | Wordmark | Home | Settings | Notes |
|---|---|---|---|---|
| Sign in | no header | no | no | Brand tone shell |
| Sheet choose (no workspace) | no header | no | no | Web hides Home when there is no workspace |
| Home | yes | no (it is home) | yes | |
| Capture | no header (full-bleed chrome per file 02) | n/a | n/a | Small back control defined in file 02 |
| Review sheet | no header | n/a | n/a | Overlay |
| Manual entry | yes | yes | yes | |
| Settings | yes | yes | no | Web hides the gear on `/app/settings*` |
| Space | yes | yes | yes | Web nests Space under settings, so the gear is hidden on web. Android keeps the gear visible, see section 9 |
| Sheet connect screens | yes | yes only if a workspace exists | yes only if a workspace exists | Same rule as web |

Omitted on Android, on purpose (section 9): credit pill, admin button, invite banner.

### 4.3 Shell tones (`ZipppShell`, mirrors PhoneShell)

| Tone | Background | Foreground | Used by |
|---|---|---|---|
| Card (default) | `#FFFFFF` | ink | Settings, Space, Sheet screens, Manual |
| Page | `#E8E8E8` | ink | Home, Capture |
| Brand | `#EE5329` | ink | Sign in |

The optional status pill (sheet title) sits top right in the shell: 24dp horizontal padding, 12dp top, 8dp bottom. Tappable pill: 8dp radius, 2dp border `line`, card background, 12sp semibold, max width 190dp, ellipsis, trailing chevron 14dp. Non-tappable pill: pill radius, `bg-card` on page tone with shadow 1dp.

## 5. Navigation graph and guard order

Web guard order (`AppShell.tsx` lines 73 to 100), stop at the first match:

1. Auth not checked: full-screen spinner (32dp, 4dp ring `line`, top segment `orange`).
2. No session: landing page.
3. Signed in, no workspace, not on the sheet page: go to `/app/settings/sheet`.
4. Signed in, credits at 0, not in top up or settings: go to `/app/topup`.
5. Path is bare `/app`: go to `/admin` for admins, else `/app/snap`.

Android guard order, same shape, with the payment redirect replaced:

1. Token load: while `SecureTokenStore.loadToken()` and the first `GET /api/auth/mobile/me` are pending, show the spinner screen (same spinner as web).
2. No token: Sign in (file 06).
3. Token, `me.workspace == null`: Sheet choose (file 06), no header.
4. Token, workspace set: Home (section 6, file 07).
5. Zero quota (plan `used >= included`, or the server returns `NO_CREDITS` or `PLAN_LIMIT`): stay on the current screen. Show the neutral status card and Reload. There is no redirect and no purchase link (DEC-002).
6. `DEVICE_REVOKED` from any call: clear the token and go to Sign in.

```
          +--------+  no token   +---------+
 start -> | Splash | ----------> | SignIn  |
          +--------+             +----+----+
              | token                  | success
              v                        v
        me.workspace?  <---------------+
          |no        |yes
          v          v
     SheetChoose   Home --------+--------+---------+
          |          |          |        |         |
          +--------> |       Capture  Manual   Settings --> Space
            connected          |                    |   \--> SheetConnected
                            Review(overlay)         \--> Sign out --> SignIn
```

Back button (system): Capture, Manual, Settings go back to Home. Space and SheetConnected go back to Settings. Home exits the app. SheetChoose exits the app.

## 6. The Android home screen (decided)

Decision, owner, 2026-11-05: Android opens on a new **Home dashboard** for a
personal wealth app. It is specified in full in `07-home-dashboard.md` (layout,
wireframes for every state, user flow, system diagram, the `GET /api/home/summary`
contract, wording, acceptance checklist, slices). Build card: FEAT-120.

Home replaces both earlier proposals. What was kept from each:

| Kept from | Piece | Where it ends up on Home |
|---|---|---|
| Alternative B (Sheet home) | Sheet title and tab, Open Google Sheets button | Sheet card, priority P1 |
| Alternative A (Space home) | Quota percentage bar | Quota card, optional P3 |
| Alternative A | Space name and up to 3 goals with progress | Space card, optional P4 |
| Alternative A | Drafts waiting strip | Drafts card, shown when count > 0 |
| Alternative A | Primary Scan button 56dp, secondary Manual 52dp | Actions block |
| New | Today spending and Last spending from the user's Sheet | Hero card and Last card, P1 |

Header on Home: wordmark and Settings. Home button is hidden. No credit pill.

Navigation consequences:

- Guard step 4 lands on Home (section 5 already says so).
- Capture, Manual and Settings return to Home on system back.
- Capture loses the Manual pill and the Space and Settings text links (file 02).
- Space is reached from Settings, as on web, and from the Space card on Home.
- `ZipppButton` gets the sizes from section 3 (56dp primary, 52dp secondary) in
  slice S-H4.

## 7. States

| State | Behaviour |
|---|---|
| Loading me | Spinner screen, no header |
| Offline | Header stays. Body shows `android.error.server` and a Retry 52dp button |
| `DEVICE_REVOKED` | Clear token, Sign in |
| Zero quota | Neutral card with `android.error.no_credits.short`, Reload (`android.error.no_credits.refresh`) and Help (`android.error.no_credits.support`). No purchase link |
| Process death | Token persists. `me` reloads. Drafts persist if `BatchStore` is persisted (file 03) |

## 8. Network calls (all bearer, `Authorization: Bearer <token>`)

| Call | When | Used for |
|---|---|---|
| `GET /api/auth/mobile/me` | App start, after sign in, on resume | workspace, plan, spaces |
| `GET /api/billing/plan` | Optional, when `me.plan` lacks `period_end` | quota card |
| `GET /api/billing/balance` | Not called. Credits are not shown on Android | n/a |

## 9. Android-only differences, allowed

| Difference | Why |
|---|---|
| No credit pill in the header | Owner decision 2026-11-05. DEC-002: no credit numbers or purchase path on Android |
| No admin button | Admin is a web panel |
| No invite banner (`balance.invite`) | It quotes Rp prices (DEC-002) |
| Gear stays visible on Space | On Android, Space is a top-level destination, not a settings child |
| No `/app/topup` redirect at zero quota | DEC-002 |
| Language select omitted | Android strings are Indonesian only (`values/strings.xml`) |
| System back replaces the web Back link | Platform convention |

## 10. Wording keys

All present in `spec/wording.txt`: `app.nav.home`, `app.nav.back`, `app.settings.title`, `android.error.server`, `android.error.no_credits.short`, `android.error.no_credits.refresh`, `android.error.no_credits.support`, `android.error.device_revoked`.

Home keys are listed in `07-home-dashboard.md` section 13 (`android.home.*`). `android.home.title` is not needed.

## 11. Acceptance checklist (screenshot checkable)

1. Header shows the wordmark in orange Archivo Black at 24sp on the page grey `#E8E8E8`, left aligned at 16dp.
2. Header right side shows Home and Settings with 20dp icons and 14sp muted labels, 12dp apart. No credit pill is present.
3. On Settings the gear is absent. On Home the Home button is absent.
4. Shell content is 24dp from both screen edges, 16dp below the header, 16dp between blocks.
5. No content is wider than 430dp on a tablet or a landscape screen. It is centred.
6. Every button and link is at least 48dp high (measure in layout inspector). Full-width primary buttons are 56dp.
7. Cards have 8dp corners, 16dp padding, white on the grey page.
8. Cold start with a stored token shows the spinner, then Home, with no flash of the sign in screen.
9. Cold start with no workspace shows Sheet choose and no header.
10. Zero quota shows the neutral card. No screen contains the words kredit, saldo, Rp or a price.
11. System back from Settings returns to Home. System back from Home exits.
12. A revoked token returns to Sign in and clears stored data.
