# 01 Shell and navigation

Android spec for FEAT-118. Web is the visual reference. Files 02 and 03 cover capture and review, 07 covers Home. This file defines the frame every screen sits in, the navigation graph, and the entry rules.

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

Tokens to add to `ZipppColors` in `Tokens.kt` (slice S-H4, before any Home code):
`amberBg = #FEF3C7` and `amberInk = #78350F`. They match the web `bg-amber-100` and
`text-amber-900` used for the low-balance state. The private `AmberBg` and
`AmberInk` that lived in `Shell.kt` were deleted with the credit pill. Home (file 07)
uses the new tokens for the stale-data card.

## 3. Touch targets (Android rule, stricter than web)

Web buttons are `py-3` (about 44dp) for secondary and `py-4` (about 56dp) for primary. On Android:

- Every tappable element is at least 48dp high and 48dp wide, including text links and icon buttons. A visually smaller element gets padding or a 48dp hit area.
- Button heights come from the canonical table below. Other files reference it
  and must not restate other numbers.
- Inline text actions (web `text-xs font-semibold`, for example Edit, Archive, Remove) become 48dp-high tap rows. The text stays 12sp.
- Space between two tappable elements is at least 8dp.

### Canonical button table (single source, all files reference this)

| Kind | Height | Fill | Text | Use |
|---|---|---|---|---|
| Primary | 56dp | btn `#3E0F0C` | white | Accept, Scan, Sign in, Sign out, Save, Create, Connect |
| Brand | 56dp | orange `#EE5329` | ink | Strongest action where the web uses `bg-brand`: Sign in on the Brand shell, Space create and Save |
| Mist | 52dp | mist `#C9CFD9` | ink | Secondary actions: Invite, Leave, Manual, Review, Reload |
| Outline | 52dp | transparent, 1dp `line` border | ink | Neutral navigation: Open Google Sheets, Help, Cancel |
| Danger text | 52dp | mist | danger `#B3261E` | Delete, Archive, destructive confirms |

All kinds: pill radius, 14sp semibold label, disabled alpha 0.4, minimum width 48dp.
Buttons side by side in one row share the height of the tallest one in that row.
"Open Google Sheets" is Outline 52dp everywhere (Home, Settings, Sheet connected).
Sign out uses Primary 56dp, like the web (the earlier Danger style is dropped).

Current code check: `ZipppButton` is 48dp fixed. Required change: heights from the
table above, in slice S-H4. Review footer Accept is Primary 56dp.

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
| Capture | yes | yes | yes | Capture is a child of Home on Android, so Home shows. System back returns to Home. File 02 owns the layout. The web hides Home only on `/app/snap`, which is the web home |
| Review sheet | header of the screen behind it, under the scrim | n/a | n/a | Overlay on Capture |
| Manual entry | yes | yes | yes | |
| Settings | yes | yes | no | Web hides the gear on `/app/settings*` |
| Space | yes | yes | yes | Web nests Space under settings, so the gear is hidden on web. Android keeps the gear visible, see section 9. Space is a top-level destination reached from Home and linked from Settings |
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
5. Zero quota (plan `used >= included`, or the server returns `NO_CREDITS` or `PLAN_LIMIT`): stay on the current screen. An unknown balance or plan (not loaded yet, or `plan == null`) is never treated as zero; the app allows the action and lets the server answer. Show the neutral status card and Reload. There is no redirect and no purchase link (DEC-002).
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
     SheetChoose   Home -----+--------+---------+--------+
          |          |       |        |         |        |
          +--------> |    Capture  Manual   Settings   Space (card)
            connected       |                 |  \          ^
                       Review(overlay)        |   \---------+ (also from Settings)
                                              +--> SheetConnected
                                              \--> Sign out --> SignIn
```

Back button (system): Capture, Manual, Settings and Space go back to Home. SheetConnected goes back to Settings. Home exits the app. SheetChoose exits the app. Capture back always returns to Home, even when Capture was opened from the notification prompt (owner decision 2026-11-05).

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
| Alternative A | Primary Scan button 56dp (Primary), Manual 52dp (Mist) | Actions block |
| New | Today spending and Last spending from the user's Sheet | Hero card and Last card, P1 |

Header on Home: wordmark and Settings. Home button is hidden. No credit pill.

Navigation consequences:

- Guard step 4 lands on Home (section 5 already says so).
- Capture, Manual and Settings return to Home on system back.
- Capture has no Manual pill and no Space or Settings text links (file 02). Manual lives on Home only. Capture shows the header with Home and Settings.
- Space is a top-level screen. It opens from the Space card on Home and from the Space button in Settings. System back from Space returns to Home.
- `ZipppButton` gets the sizes from section 3 (56dp primary, 52dp secondary) in
  slice S-H4.

## 7. States

| State | Behaviour |
|---|---|
| Loading me | Spinner screen, no header |
| Offline | Header stays. Body shows `android.error.server` and a Retry 52dp button |
| `DEVICE_REVOKED` | Clear token, Sign in |
| Zero quota | Neutral card with `android.error.no_credits`, Reload (`android.error.no_credits.refresh`) and Help (`android.error.no_credits.support`). No purchase link |
| Process death | Token persists. `me` reloads. Drafts do not survive process death. Persistence belongs to FEAT-108 (file 03 section 8) |

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
| Gear stays visible on Space | On Android, Space is a top-level destination reached from Home, not a settings child. Settings also links to it |
| No `/app/topup` redirect at zero quota | DEC-002 |
| Language select omitted | Android strings are Indonesian only (`values/strings.xml`) |
| System back replaces the web Back link | Platform convention |

## 10. Wording keys

All present in `spec/wording.txt`: `app.nav.home`, `app.nav.back`, `app.settings.title`, `android.error.server`, `android.error.no_credits` (card text), `android.error.no_credits.short` (one-line uses such as the Settings quota bar), `android.error.no_credits.refresh`, `android.error.no_credits.support`, `android.error.device_revoked`, `android.error.mobile_disabled` (section 12.5).

Home keys are listed in `07-home-dashboard.md` section 13 (`android.home.*`). `android.home.title` is not needed.

## 11. Acceptance checklist (screenshot checkable)

1. Header shows the wordmark in orange Archivo Black at 24sp on the page grey `#E8E8E8`, left aligned at 16dp.
2. Header right side shows Home and Settings with 20dp icons and 14sp muted labels, 12dp apart. No credit pill is present.
3. On Settings the gear is absent. On Home the Home button is absent. On Capture both Home and the gear are present.
4. Shell content is 24dp from both screen edges, 16dp below the header, 16dp between blocks.
5. No content is wider than 430dp on a tablet or a landscape screen. It is centred.
6. Every button and link is at least 48dp high (measure in layout inspector). Heights match the canonical button table: Primary and Brand 56dp, Mist, Outline and Danger text 52dp.
7. Cards have 8dp corners, 16dp padding, white on the grey page.
8. Cold start with a stored token shows the spinner, then Home, with no flash of the sign in screen.
9. Cold start with no workspace shows Sheet choose and no header.
10. Zero quota shows the neutral card. No screen contains the words kredit, saldo, Rp or a price.
11. System back from Settings, Capture, Manual and Space returns to Home. System back from Home exits.
12. A revoked token returns to Sign in and clears stored data.
13. A release build contains no Vercel bypass value and its base URL host is `www.zippp.link` (section 12.3 guard).
14. When the server answers `MOBILE_API_DISABLED`, the app shows the `android.error.mobile_disabled` card with Reload. The token is kept and no sign in screen appears (section 12.5).
15. A debug build installed with the Preview base URL signs in, loads `me`, and scans without a 404 (section 12.2 commands).

## 12. Environments

Added 2026-11-05 after the phone audit (file 00, defect 4). The owner uses the
**production** deployment and the **production** Google OAuth consent screen for the
web app. The Android build had no base URL set, so it pointed at production, where
the mobile API is dark. This section fixes how every Android build chooses its
server, and the gate for turning the mobile API on in production.

### 12.1 The three environments

| | Production | Preview | Local |
|---|---|---|---|
| Web host (canonical) | `https://www.zippp.link` (the apex `https://zippp.link` answers a POST with `308` to `www`) | `https://preview.zippp.link` | `http://10.0.2.2:3000` from the Android emulator (the host machine's `localhost`) |
| `MOBILE_API_ENABLED` | **unset today**, so every bearer route answers `404 MOBILE_API_DISABLED` | `true` | `true` in `.env.local` |
| `MOBILE_JWT_SECRET` | not set until the gate in 12.4 passes | set (random, Preview only) | set (random, local only) |
| Vercel protection | none | SSO protection on, so the app needs the automation bypass header | none |
| Google OAuth | production Web client and consent screen | same Web client, same Cloud project (12.6) | same Web client with a `localhost` redirect URI |
| Who may install an app that points here | nobody until FEAT-110 | owner and testers, private APK only | owner |

Rules:

1. Preview and local values are never the default of a release build.
2. The production database and the Preview database are the same Upstash and Google resources only if the owner has configured them so. This spec does not change that. A Preview scan spends real quota on whatever Upstash the Preview deployment is bound to.
3. Production has no bypass header. Only the Preview deployment is behind Vercel SSO.

### 12.2 What each Android build points to

Android has two dimensions. The product flavors are `play` and `sideload` (they only
differ in OTA, section 8 of the context file). The build types are `debug`
(`applicationIdSuffix ".debug"`, package `link.zippp.app.debug`) and `release`
(package `link.zippp.app`). The server is chosen by the build type and one
environment variable, not by the flavor.

| Build | Package | Default `API_BASE_URL` | Bypass header | Signed with |
|---|---|---|---|---|
| `playDebug`, `sideloadDebug` | `link.zippp.app.debug` | `https://preview.zippp.link` | sent when `ZIPPP_VERCEL_BYPASS` is set | debug keystore |
| `playRelease`, `sideloadRelease` | `link.zippp.app` | `https://www.zippp.link` | **never** | release keystore |

Resolution order for `API_BASE_URL` in `android/app/build.gradle.kts`, first match wins:

1. `ZIPPP_API_BASE_URL` in the environment (explicit override, used for local and for pinning a build).
2. The build type default from the table above.

The current file has one default for every build type, `https://zippp.link`. That
apex default is the bug. Code task (slice E1 in section 12.7): replace it with the
table above.

Build commands (the secret values come from the Vercel dashboard and are never
committed, printed, or put in a file in the repo):

```
# Phone test build against Preview (debug package link.zippp.app.debug)
ZIPPP_API_BASE_URL=https://preview.zippp.link \
ZIPPP_VERCEL_BYPASS=<automation bypass value> \
ZIPPP_GOOGLE_SERVER_CLIENT_ID=<production Web client id> \
./gradlew :app:assembleSideloadDebug

# Emulator against a local server
ZIPPP_API_BASE_URL=http://10.0.2.2:3000 ./gradlew :app:assembleSideloadDebug

# Production candidate (only after the gate in 12.4)
ZIPPP_API_BASE_URL=https://www.zippp.link ./gradlew :app:assembleSideloadRelease
```

Cleartext HTTP is needed only for the local build. It must be allowed by a
debug-only network security config and must not exist in the release manifest.

### 12.3 Guards in the build (so the mistake cannot ship)

A release build fails at configuration time when any of these is true:

| Check | Fails the build when |
|---|---|
| Host | the base URL host is not `www.zippp.link` |
| Scheme | the base URL is not `https` |
| Bypass | `ZIPPP_VERCEL_BYPASS` is not empty |
| Client id | `ZIPPP_GOOGLE_SERVER_CLIENT_ID` and `GOOGLE_CLIENT_ID` are both empty |

A debug build prints the resolved host (never the bypass value) once at the end of
configuration. The app never shows the host to the user.

`ApiClient` rules that belong with this section:

- It adds `x-vercel-protection-bypass` only when `BuildConfig.VERCEL_BYPASS` is not blank. A release build has it blank by construction.
- Production base URL is the `www` host, so the client never meets the apex `308`. OkHttp drops `Authorization` on a cross-host redirect, so a redirect would look like a sign in failure.
- The stored token is bound to the server that issued it. Changing the base URL between installs leaves a token that the new server rejects. On `401 INVALID_TOKEN` after a base URL change the app signs the user out cleanly (section 7 of this file). The test procedure in 12.8 says: uninstall first, or sign out in Settings.

### 12.4 The gate before the mobile API is turned on in production

Owner decision recorded in FEAT-110 and ROAD-001: production mobile stays dark
until **STORY-102** (Space device proof) passes against Preview.

Preconditions, all true:

1. STORY-102 checklist signed off on a real phone against Preview, including sign in, capture, review, accept, and a row in the user's Sheet.
2. FEAT-119 steps 1 to 5 shipped to Preview (bearer sheet routes and `google-grant`) and the grant flow passed.
3. Web regression tests pass (`npm test`, `npx tsc --noEmit`, `npm run build`) on the commit being promoted.
4. A release build passes the guards in 12.3 and the Android OAuth clients exist (12.6).
5. The Telegram admin alert for mobile errors is on, so the owner sees failures.

How to turn it on (owner only, in the Vercel project, Production environment):

| Step | Action |
|---|---|
| 1 | Generate `MOBILE_JWT_SECRET`: at least 32 random bytes, different from Preview. Store it only in Vercel |
| 2 | Set `MOBILE_API_ENABLED=true` in Production |
| 3 | Redeploy Production (environment variable changes apply on the next deployment) |
| 4 | Check without a token: `POST https://www.zippp.link/api/extract` answers `401`, not `404`. A `404 MOBILE_API_DISABLED` means the flag did not apply |
| 5 | Sign in with the release build on one phone and scan one receipt. Confirm one new row in the Sheet and one spend |
| 6 | Only then distribute the build |

Rollback, in order of speed:

| Action | Effect |
|---|---|
| Set `MOBILE_API_ENABLED=false` and redeploy | Every mobile route answers `404 MOBILE_API_DISABLED` again. Web is untouched. Tokens stay valid for when the flag returns |
| Rotate `MOBILE_JWT_SECRET` and redeploy | Every issued mobile token stops working, all phones sign in again |
| Revoke one device on the web (Connected devices) | That device only |

No data migration is needed to roll back. The Sheet rows already written stay.

### 12.5 What the app shows when the server answers `MOBILE_API_DISABLED`

The server answers `404` with `code: "MOBILE_API_DISABLED"` (or the generic
`NOT_FOUND` on routes that do not name it). Before this spec the camera screen
turned it into the generic read failure and the user could not tell what was wrong.

| Rule | Behaviour |
|---|---|
| Distinct state | A neutral card with `android.error.mobile_disabled` (text: "This app is not available on this server yet. Try again later." / id "Aplikasi belum tersedia di server ini. Coba lagi nanti.") and a Reload button (`android.home.retry`, Mist 52dp) |
| Where | Sign in (replaces the error line under the buttons), Home (file 07 section 7.11), Settings, Space, wherever the first failing call happens. On Capture and Manual the failed draft shows the same text with Delete only and no Retry, because it cannot succeed until the server is enabled (file 02 section 4) |
| Token | Kept. Never cleared and never a silent sign out. This is not `DEVICE_REVOKED` |
| Retry | Manual only (Reload). No retry loop, no background polling |
| Copy | No host name, no env var name, no code shown. Never the word "production" or "server mode" |
| Logging | One debug log line: route, status, code. No token, no body |

Zero quota and `MOBILE_API_DISABLED` are different states with different keys. Do
not reuse `android.error.no_credits` for it.

### 12.6 Google OAuth for Android, in the same Cloud project as production web

The web production client and consent screen already exist and the Sheets,
`drive.file`, and email scopes are already approved on that consent screen
(`GOOGLE_OAUTH_SCOPES` in `src/lib/google/oauth.ts`). Android adds **no new scope**
and needs **no new consent screen**. It adds clients to the same project.

| Client | Type | Used for | Registered with |
|---|---|---|---|
| Existing production client | Web application | Server code exchange (`GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` on the server). Its client id is the app's `serverClientId` for `requestOfflineAccess`, so the `serverAuthCode` is minted for this client | existing redirect URIs. Android codes are exchanged with the empty redirect URI (file 09 section 4.9) |
| New Android client A | Android | Release and Play builds | package `link.zippp.app` and the release signing SHA-1. Add the Play App Signing SHA-1 when the Play track exists |
| New Android client B | Android | Debug builds | package `link.zippp.app.debug` and the SHA-1 of the debug keystore the project signs with |

Notes that avoid the usual failures:

- The debug package is `link.zippp.app.debug`, so it needs its own Android client. Reusing client A makes Google reject the sign in with a developer error.
- The debug SHA-1 is the keystore named in `signingConfigs.debug` (the repo `debug.keystore` if present, else `~/.android/debug.keystore`). Read it with `keytool -list -v -keystore <path> -alias androiddebugkey -storepass android -keypass android`.
- Preview needs the same `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` as production in its Vercel environment. The Android flow does not use the redirect URI, so the Preview redirect URI is irrelevant to it.
- The OAuth consent screen is in Production, so there is no 100 user cap and no 7 day refresh token expiry for this app. Keep the app's publishing status at Production. Do not move it back to Testing.
- Sheets is a sensitive scope and `drive.file` is a non-sensitive scope. Both were already verified for the web app. If Google asks to re-verify when an Android client is added, answer with the same app details and the same privacy policy URL as the web app.
- The Android client ids do not go into the app. Only the Web client id is in the app (`GOOGLE_SERVER_CLIENT_ID`). Android clients are matched by package and SHA-1.

The setup checklist the owner ticks lives in file 12 section 17.

### 12.7 Code tasks this section creates

| Slice | Scope | Side |
|---|---|---|
| E1 | `build.gradle.kts`: build type defaults, the release guards in 12.3, local network security config for debug only, host printed at configuration | android |
| E2 | `ApiClient`: distinct handling of `404 MOBILE_API_DISABLED` (card in 12.5), 401 after a base URL change signs out cleanly | android |
| E3 | Add `android.error.mobile_disabled` to the generator map | android |
| E4 | Context file section 17: record the three build commands | docs |

E1 to E3 are small and block the phone test. They come first in the build plan (file 08 section 9).

### 12.8 Test procedure for a phone against Preview

1. Uninstall the app (`adb uninstall link.zippp.app.debug`) so no token from another server remains.
2. Build with the Preview command in 12.2 and `adb install` it.
3. Sign in with Google. Expect the grant screen on a fresh account (file 12), then Home.
4. Scan one receipt. Expect the review sheet within the extract timeout, not the generic read failure.
5. If the card from 12.5 shows, the Preview deployment has `MOBILE_API_ENABLED` unset or the base URL is wrong. Check the Vercel Preview variables and the resolved host line from the build.
