# 06 Sheet choose and sign in

Android spec for FEAT-118. Button kinds and heights follow the canonical table in `01-shell-and-navigation.md` section 3. Conversion table, tokens and touch-target rules are in `01-shell-and-navigation.md`.

Web sources: `src/app/app/settings/sheet/page.tsx`, `src/components/app/AppProvider.tsx` (lines 215 to 262 for bootstrap, 525 to 730 for the sheet actions and sign in/out), `TemplateCarousel.tsx`, `TemplatePickCard.tsx`, `src/app/api/sheets/connect/route.ts`, `src/app/api/auth/mobile/*`.
Android sources: `ui/auth/SignInScreen.kt`, `ui/pairing/PairingScreen.kt`. There is no Android sheet screen yet.

## 1. Purpose

Two jobs that sit before Home. First, get a signed-in session. Second, get a connected Google Sheet, because nothing can be sent without one. The web does the first on the landing page and the second on one screen that moves through phases.

## 2. Part A: sign in

### 2.1 Web flow

The web sign in is a button on the landing page. It sets `window.location.href = "/api/auth/login"` (Google OAuth redirect). On return, `GET /api/auth/me` reports `signedIn`. A failed return adds `?auth=error` and shows `app.signin.error`. There is no sign in screen inside `/app`: `AppShell` sends signed out users to the landing page.

### 2.2 Android mapping

| Web | Android |
|---|---|
| Google button on landing | `Sign in with Google` button, Credential Manager id token, `POST /api/auth/mobile/google` `{ id_token }` |
| Not available on web | Email magic link: `POST /api/auth/magic-link/request`, deep link `zippp://auth?token=` or pasted token, `POST /api/auth/magic-link/consume` |
| Pairing a phone from the web (`PairDeviceModal`, `POST /api/auth/pair/generate`) | `Have a pairing code?` opens the 8 character code screen, `claim` call (legacy build path, keep until FEAT-113 device proof passes) |
| `app.signin.error` | `android.error.*` mapped from server codes. Never show raw server text |

### 2.3 Layout tree (Brand tone)

```
ZipppShell(Brand, no header, no pill)       background orange #EE5329, text ink
  Column(padding 24 / 16 / 48, spacedBy 16, scroll)
    Text "zippp"                    ZipppType.wordmark 24sp, ink on orange
    Spacer(weight 1 at top, so the block sits in the lower two thirds)
    Text android.signin.title       ZipppType.h1 30sp, ink
    Text android.signin.subtitle    ZipppType.body 14sp, ink
    Button android.signin.google    Primary (maroon, white text), 56dp, full width
    Divider with text               small muted
    TextField email                 52dp, radius 6dp, white, 1dp line, hint android.signin.emailHint
    Button android.signin.sendLink  Mist, 52dp
    Text android.signin.linkSent    small ink, after success
    TextField token                 52dp, hint android.signin.tokenHint (shown after link sent)
    Button android.signin.consume   Primary, 56dp
    TextButton android.signin.usePairing   48dp tap row, 14sp semibold, ink underlined
    Text error                      small, danger on a white pill (orange background fails contrast with red text)
```

States: idle, Google busy, link sent, token busy, error, pairing sub screen. Each busy state disables its own button and shows a 20dp spinner inside the button.

Contrast note: danger red `#B3261E` on orange `#EE5329` is below 4.5:1. Errors render on a white rounded 8dp box with 12dp padding.

### 2.4 Behaviour

| Event | Result |
|---|---|
| Success from Google, link or pairing | Store token in `SecureTokenStore`, load `me`, apply the guard order in file 01 |
| `GOOGLE_RECONSENT` | Show `android.error.google_reconsent`, button stays |
| Rate limited | `android.pairing.rate_limited` |
| Device conflict | `android.pairing.device_conflict` |
| Missing Google client id | `android.signin.googleMissingClient` (debug builds only) |

## 3. Part B: sheet choose

### 3.1 Web phases

Phase machine in `AppProvider` (`sheetPhase`): `checking`, `choose-source`, `wizard`, `naming`, `creating`, `picking`, `connected`, `error`.

Android adds one phase, `grant`, in front of `choose-source` (owner decision 2026-11-05, Option A from file 09 section 6). A phone-only Google user has no Drive or Sheets tokens, so before any sheet call the app obtains a `serverAuthCode` and posts it to `POST /api/auth/mobile/google-grant`. The Android phase list is therefore: `checking`, `grant`, `choose-source`, `wizard`, `naming`, `creating`, `picking`, `connected`, `error`. File 09 maps its `CHECK`, `CHOOSE`, `EMPTY`, `GRANT`, `DONE` names onto these: `CHECK` is `checking`, `GRANT` is `grant`, `CHOOSE` is `choose-source` and `picking`, `EMPTY` is `choose-source` with no sheet found, `DONE` is `connected`. The grant screen layout and wording are specified in file 12.

Bootstrap: after sign in, `GET /api/sheets/workspace`. If a workspace exists, phase is `connected`. If not, `POST /api/sheets/connect {mode:"find"}`: one candidate connects, several go to `picking`, none go to `choose-source`. It never creates a sheet on its own.

| Phase | Web screen content |
|---|---|
| `checking` | Centered 36dp spinner, `app.sheets.checking` 18sp muted |
| `choose-source` | Title `app.sheets.chooseTitle`, body `app.sheets.chooseBody`, buttons: Create (`app.sheets.create`, dark), Use existing (`app.sheets.useExisting`, mist), Sign out (text) |
| `wizard` | Title `app.sheets.wizard.title`, body, optional warn, template carousel of 5 chips, picked template name 18sp, body 12sp, preview, buttons Continue (dark), Cancel (mist) |
| `naming` | Title `app.sheets.name.title`, body, `Template: {name}`, labelled text field (max 80, prefilled `[zippp]` default, selected on focus), error, buttons Create (dark, disabled when empty), Back (mist) |
| `creating` | Spinner and `app.sheets.creating` with template name |
| `picking` | Title and body (or empty variants), one bordered card per sheet (name 14sp semibold, modified date 12sp muted), spinner while loading, buttons Create (when none) and Cancel |
| `connected` | Optional created banner (`app.sheets.created`, orange card), title `app.sheets.connected`, `{title} · {tab}`, `Template: {name}`, buttons: Open Google Sheets (web orange, Android Outline 52dp), Create, Choose another, Reconnect, Continue (dark) |
| `error` | `app.sheets.error`, optional detail, Retry (`app.sheets.retry`, dark) |

Templates (order from the web): personal-expense, resto-inventory, sales-recap, reimbursement, custom. Names in `app.sheets.tpl.*`, bodies in `app.sheets.tpl.*Body`.

### 3.2 Android layout trees

Shell: Card tone, header shown only if a workspace already exists (file 01). Content padding 24 / 16 / 48, gap 16, title `ZipppType.h1`. Full-width buttons sit in a bottom column with `Spacer(weight 1)` above it (web `mt-auto`), 12dp apart.

```
Checking / Creating    Column(centered): CircularProgress 36dp (stroke 4dp, track line, indicator orange), Text 18sp muted, 24dp above text
ChooseSource           h1, body muted, [Create Primary 56] [Use existing Mist 52] [Sign out text 48]
Wizard                 h1, body muted, warn 12sp muted
                       LazyRow(template chips, contentPadding 24, spacedBy 8, chip min 48dp tall)
                       Text picked name h3 18sp, Text picked body small muted, preview block
                       bottom: [Continue Primary 56] [Cancel Mist 52]
Naming                 h1, body muted, template line small muted, label bodyStrong,
                       TextField 56dp, radius 8dp, 2dp border line (focus: orange), text 16sp semibold ink
                       error bodyStrong danger
                       bottom: [Create Primary 56, disabled when blank] [Back Mist 52]
Picking                h1/empty title, body muted, error,
                       Column(spacedBy 8): Row card (radius 8, 2dp border line, white, padding 16, min 64)
                         name bodyStrong, date small muted
                       bottom: [Create Primary 56 (when none)] [Cancel Mist 52]
Connected              (banner) h1, "{title} · {tab}" body muted, template small muted, error
                       bottom: [Open Google Sheets Outline 52] [Create Mist 52] [Choose another Mist 52]
                               [Reconnect Mist 52] [Continue Primary 56]
Error                  centered: Text app.sheets.error 24sp semibold, detail small muted, [Retry Primary 56]
```

`Open Google Sheets` opens `https://docs.google.com/spreadsheets/d/{spreadsheet_id}/edit` with `Intent.ACTION_VIEW` (Sheets app if installed).

`Continue` on Android goes to Home (file 01), not straight to Capture.

Template chips need an icon per template (web uses lucide: Wallet, ShoppingBasket, Receipt, ClipboardList, Table2). Android uses bundled vector drawables with the same shapes, 24dp, in a chip with 48dp minimum height. Preview block mirrors `TemplatePeek`: a small table image of the sheet header and one sample row, taken from `sheetPreviewFor(templateId, lang)`. If the preview is not ported in the first pass, hide it and note it in the PR.

### 3.3 Network and the contract gap

Web calls (all `POST /api/sheets/connect` unless noted):

| Step | Body |
|---|---|
| Find | `{ mode: "find" }` |
| List | `{ mode: "list" }` |
| Pick | `{ spreadsheetId }` |
| Create | `{ mode: "create", templateId, displayName }` |
| Current workspace | `GET /api/sheets/workspace` |

Gap, blocking: `sheets/connect`, `sheets/workspace` and `sheets/map` do not call `resolveRequestUser`, so they accept the cookie only. A bearer token cannot connect or switch a sheet. `GET /api/auth/mobile/me` already returns `workspace` (read only). Required backend slice before this screen can ship:

1. Make `sheets/connect` and `sheets/workspace` accept bearer through `resolveRequestUser`, with the same explicit `userId` rule as `sheets/append`.
2. Keep Google refresh token use on the server (already how `sheets/append` works for mobile).
3. Add server tests for bearer success and cookie parity.

The backend slice is FEAT-119 (file 09). Until it ships, a user with no workspace has no way to set up a sheet on the phone. Do not ship Android to users without FEAT-119 step 1 and the Google grant. Once it ships, `android.error.no_sheet` ("Set up a sheet first") always carries a Mist 52dp button, new key `android.error.no_sheet.action` (wording task W-2, id text "Siapkan sheet", en "Set up sheet"), that opens the `sheet/choose` route.

### 3.4 States and errors

| Situation | Android behaviour |
|---|---|
| Duplicate name on create | Server returns an error string. Map to `app.sheets.name.required` only for blank. For duplicates show `android.error.sheet_name_taken` (missing, section 4), never the raw English server string |
| Blank name | `app.sheets.name.required`, create disabled |
| `GOOGLE_RECONSENT` | `android.error.google_reconsent`, retry |
| Network | `android.error.server`, Retry |
| Cancel in wizard or picking | Back to `connected` if a workspace exists, else `choose-source` |
| Sign out from `choose-source` | Clear token, Sign in |

## 4. Wording keys

Present (verified): `app.sheets.checking`, `creating`, `error`, `retry`, `chooseTitle`, `chooseBody`, `create`, `useExisting`, `wizard.title`, `wizard.body`, `wizard.warn`, `wizard.continue`, `cancel`, `name.title`, `name.body`, `name.label`, `name.create`, `name.back`, `name.required`, `template`, `title`, `body`, `emptyTitle`, `emptyBody`, `created`, `connected`, `open`, `choose`, `reconnect`, `continue`, `tpl.*`, `app.auth.signout`, `android.signin.*`, `android.pairing.*`, `android.error.google_reconsent`, `android.error.no_sheet`, `android.error.server`.

Missing, to add: `android.error.sheet_name_taken` (name already used; same key as file 09, replaces the earlier `android.sheets.duplicateName`), `android.error.no_sheet.action` (W-2), `android.error.google_grant_required` and the grant screen keys listed in file 12. The Continue label stays `app.sheets.continue`. `android.sheets.toHome` is not added.

Constraint: `app.sheets.chooseBody` and the wizard copy do not mention money, so they are safe on Android as is.

## 5. Android-only differences, allowed

| Difference | Why |
|---|---|
| Google sign in through Credential Manager and an id token | OAuth redirect to a browser is not the Android pattern |
| Magic link and pairing code on the sign in screen | FEAT-113 |
| Errors on a white pill on the orange screen | Contrast |
| `Open Google Sheets` uses `ACTION_VIEW` | Platform convention |
| `Continue` returns to Home, not Capture | Owner decision pending in file 01 section 6 |
| System back replaces Cancel where it makes sense | Platform convention |

## 6. Acceptance checklist

1. Sign in: the screen is orange, the wordmark is ink 24sp Archivo Black, the title is 30sp, and Google is a maroon 56dp button.
2. Entering an email and tapping Send link shows the sent message and the token field. A deep link from the email signs in without typing.
3. A wrong token shows a mapped message, never raw server text. The error is readable (white box).
4. A first sign in with no workspace and no `[zippp]` sheet lands on Choose source with no header.
5. A first sign in with one existing `[zippp]` sheet lands on Connected without asking.
6. A first sign in with several sheets lands on Picking with one 64dp card each, showing name and date.
7. Wizard shows five template chips in the web order. Choosing one updates the name, description and preview below.
8. Naming shows the template line, a field prefilled with the default name, and Create is disabled when the field is empty.
9. Creating shows the spinner and the template name, then Connected with the created banner.
10. Connected shows `{title} · {tab}`, the template line and all five buttons. Open Google Sheets opens the spreadsheet.
11. Retry on the error screen re-runs the find step.
12. Every button on these screens is at least 48dp high. Heights follow the canonical table in file 01: Primary and Brand 56dp, Mist and Outline 52dp. Open Google Sheets is Outline 52dp. Buttons in one row share the tallest height.
13. No string on any of these screens contains kredit, saldo, Rp, $ or a purchase link.
14. The same account shows the same connected sheet on web and on the phone.
15. Blocked until the backend slice in section 3.3 ships: items 4 to 11 cannot pass on a real device with bearer auth alone.

## 7. Decisions log

| # | Decision | Owner call or default | Date | Files |
|---|---|---|---|---|
| 1 | Google access on the phone is the `serverAuthCode` grant (file 12) | Owner call | 2026-11-05 | 06, 09, 12 |
| 2 | Continue after setup returns to Home, label `app.sheets.continue` | Default | 2026-11-05 | 06, 01 |
| 3 | `drive.file` visibility is accepted. A sheet created elsewhere is not listed. The empty state offers Create a new sheet, and the message (`android.error.no_sheet` plus `android.error.no_sheet.action`) is clear that the sheet is made by zippp. To reuse an older sheet the user opens it with zippp on the web first | Owner call | 2026-11-05 | 06, 09 |
| 4 | Disconnect sheet and column map editing are web only | Default (recommended) | 2026-11-05 | 06, 09 |
| 5 | Duplicate name uses `android.error.sheet_name_taken`. `android.sheets.duplicateName` is retired | Resolved | 2026-11-05 | 06, 09 |
