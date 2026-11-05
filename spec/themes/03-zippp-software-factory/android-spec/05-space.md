# 05 Space

Android spec for FEAT-118. Conversion table, tokens, touch-target rules and the canonical button table are in `01-shell-and-navigation.md`. Button kinds and heights below follow that table.

Web source: `src/app/app/settings/space/page.tsx` (route `/app/settings/space`).

Navigation on Android: Space is a top-level screen. Entry points are the Space card on Home (file 07) and the Space button in Settings (file 04). System back and the header Home button return to Home, whichever entry was used (owner decision 2026-11-05, 01 section 5).
Android source: `ui/space/SpaceScreen.kt`.

## 1. Purpose

Create and pick a Space, see its members, manage assets and goals, invite people (owner) or leave (member). Same content and order as the web page.

## 2. Web page structure (in order)

1. Back link (`app.nav.back`, `text-sm font-semibold text-muted`).
2. Title `app.space.title` (h2), subtitle `app.space.subtitle` (`text-sm text-muted`).
3. Create card: label, name input, button.
4. Space list, one tappable card per Space.
5. Detail card for the selected Space: header, members, assets and goals list, add or edit form, then invite (owner) or leave (member).

## 3. Layout tree

```
Frame(header: Home yes, Settings yes)          see file 01
ZipppShell(Card)
  Column(verticalScroll, spacedBy 16)
    Text app.space.title            h1 30sp                      web: text-3xl
    Text app.space.subtitle         ZipppType.body 14sp, muted     web: text-sm
    CreateCard
    SpaceList | loading | error | empty
    DetailCard                      only when a Space is selected
```

The web Back link is dropped on Android. System back and the header Home replace it (file 01, section 5).

### 3.1 Create card

```
ZipppSectionCard
  Text app.space.create.title           ZipppType.bodyStrong
  Text app.space.create.name            ZipppType.smallStrong, muted      (label)
  TextField                             height 52dp, radius 6dp, 1dp border line, background page, text 14sp,
                                        placeholder app.space.create.placeholder, maxLength 80
  Button app.space.create.button        Brand (orange, ink text, as on web), 56dp, full width
                                        busy: app.space.create.busy, disabled
```

Web input: `rounded-xl border border-line bg-page px-3 py-2 text-sm`. That is 6dp radius and 12dp horizontal padding. Android makes the field 52dp high (web is about 38dp).

### 3.2 Space list

One `Column(spacedBy 8)` of rows. Each row:

```
Column(fillMaxWidth, clip card 8dp, background = selected ? mist : card, padding 16, minHeight 64, clickable)
  Row(spaceBetween, baseline)
    Text display_name       ZipppType.h3 18sp ExtraBold, one line, ellipsis
    Text role               ZipppType.smallStrong, muted (Owner / Member)
  Text "{count} members"    ZipppType.small, muted
```

Selecting a row loads its detail and clears any invite link and notice.

### 3.3 Detail card

```
ZipppSectionCard (padding 16)
  Row(spaceBetween, baseline)
    Text display_name                 ZipppType.h2 20sp ExtraBold    (web text-xl)
    Text role                         smallStrong muted
  Text app.space.members.title        bodyStrong        (mt 16)
  Members list, dividers 1dp line
    Row(spaceBetween, vertical padding 8, minHeight 56)
      Column
        Text "{email or unknown} ({you})"   bodyStrong 14sp, ellipsis
        Text role                            small muted
      Remove (owner, other member only)      48dp tap row, 12sp semibold, danger
  Text app.space.items.title          bodyStrong        (mt 16)
  Items list or app.space.items.empty
    Row(spaceBetween, vertical padding 8, minHeight 56)
      Column
        Text name                            bodyStrong, ellipsis
        Text goal: "{progress} of {target}"  small muted     asset: "Value {amount}"
        Text note                            small muted (optional)
        Goal bar                             8dp, pill, track page, fill orange, fraction progress/target clamped 0..1   (Android addition, section 8)
      Column(end)
        Edit    48dp tap row, 12sp semibold, orange
        Archive 48dp tap row, 12sp semibold, danger
  Item form (Box, radius 6dp, background page, padding 12, mt 12)
    Row(spacedBy 8): kind chips Asset | Goal, each weight 1, height 48, pill,
                     selected = mist + ink, unselected = card + muted
    TextField name                        52dp, maxLength 80
    Row(spacedBy 8): amount (weight 1, decimal keyboard) and, for goal, progress (weight 1)
    TextField note                        52dp, maxLength 280
    Row(spacedBy 8): Save or Add (weight 1, Brand, 56dp), Cancel (only when editing, Mist, 52dp); buttons in one row share the tallest height (01 section 3)
    Text error                            small danger
  Owner: divider 1dp line, padding top 16
    Text app.space.invite.title           bodyStrong
    Text app.space.invite.emailLabel      smallStrong muted
    TextField email                       52dp, keyboard email
    Button app.space.invite.button        Mist, 52dp, busy app.space.invite.busy
    Text invite notice                    small muted
    Invite link block: label, selectable text (break all), Copy 48dp row, orange; copied state app.space.invite.copied
  Member: Button app.space.leave.button   Danger text kind, 52dp
  Text actionError                        small danger
```

## 4. States

| Element | States |
|---|---|
| Space list | loading (`app.space.loading`), error (`app.space.error`, danger), empty (`app.space.empty`), populated |
| Detail | loading, error, loaded |
| Create | idle, busy, error (`app.space.error.generic`) |
| Item form | add, editing, busy, error (`app.space.items.error`) |
| Invite | idle, busy, success with link, success share-only, invalid email, generic error |
| Remove or leave | system confirm dialog first (`app.space.remove.confirm`, `app.space.leave.confirm`), then busy |
| Owner leave | server returns `OWNER_CANNOT_LEAVE`, show `app.space.leave.owner` |

## 5. Behaviour and network (all accept bearer today)

| Action | Call |
|---|---|
| Load list | `GET /api/spaces` |
| Create | `POST /api/spaces` `{ display_name }`, then reload list and select the new id |
| Load detail | `GET /api/spaces/{id}` |
| Invite | `POST /api/spaces/{id}/invite` `{ email }`, response `path`, `emailed`. Build link as the configured base URL plus `path`. The base URL is the `BuildConfig` API base, which must be the `www` host (`https://www.zippp.link` in production, `https://preview.zippp.link` for Preview), never the apex `zippp.link`, because the apex answers with a 308 redirect that drops the Authorization header (file 00). Never use the device origin |
| Remove member | `DELETE /api/spaces/{id}/members/{userId}` |
| Leave | `POST /api/spaces/{id}/leave` |
| List items | `GET /api/spaces/{id}/assets` |
| Add item | `POST /api/spaces/{id}/assets` `{ kind, name, amount, progress?, note }` |
| Edit item | `PATCH /api/spaces/{id}/assets/{itemId}` |
| Archive item | `DELETE /api/spaces/{id}/assets/{itemId}` |

Validation, same as web: name required and amount finite, else `app.space.items.error`. Replace a comma decimal with a dot before parsing. Goal progress defaults to 0.

First load: select the first Space automatically (web does the same).

Gap: `ApiClient` has only `listSpaces`, `listLedger`, `saveLedger`, `archiveLedger`. Needed: `createSpace`, `spaceDetail`, `invite`, `removeMember`, `leave`. Every server route already accepts bearer, so no backend change is needed.

Share the invite: use the system share sheet (`Intent.ACTION_SEND`) next to the Copy action. That is an Android addition (section 8).

## 6. Wording keys

All present in `spec/wording.txt` (verified): `app.space.title`, `subtitle`, `create.title`, `create.name`, `create.placeholder`, `create.button`, `create.busy`, `loading`, `error`, `empty`, `role.owner`, `role.member`, `members.count`, `members.title`, `members.you`, `memberUnknown`, `remove.button`, `remove.confirm`, `leave.button`, `leave.confirm`, `leave.owner`, `error.generic`, `items.*` (title, empty, goalProgress, value, edit, archive, asset, goal, name, target, amount, progress, note, save, add, cancel, error), `invite.*` (title, emailLabel, emailPlaceholder, button, busy, sent, shareOnly, invalidEmail, link, copy, copied). `android.space.*` duplicates exist for the item rows only. Prefer the `app.space.*` keys and retire the duplicates when the generator mapping is next touched.

Missing: none for parity. If the Android additions in section 8 are kept: `android.space.share` (Share link).

Money wording: `app.space.items.value` is "Value {amount}" with no currency. Keep it that way. Do not prefix Rp or any currency symbol on Android (DEC-002 and the product rule not to invent values).

## 7. Current code delta (from the S4 track, to verify against this spec)

- Back button removed: matches.
- Header Home and gear: matches.
- Item action rows (Edit, Archive, Remove) must be 48dp tall. Verify.
- Create, rename and invite flows: verify the missing `ApiClient` methods exist before claiming parity.

## 8. Android-only differences, allowed

| Difference | Why |
|---|---|
| Goal progress bar under the goal text | Android has room, and it reads faster. Optional. Remove if it blocks parity sign-off |
| System share sheet for the invite link | Platform convention |
| System back instead of the Back link | Platform convention |
| Confirm dialogs use the Material alert dialog | `window.confirm` does not exist |
| 48dp tap rows for inline actions | Touch target rule |

## 9. Acceptance checklist

1. Header shows wordmark, Home and Settings. Title "Zippp Space" is 30sp Archivo ExtraBold.
2. The create card is white, 8dp corners, with a 52dp name field and an orange 56dp button. Invite is mist 52dp, Leave is danger text 52dp.
3. The Space list shows one card per Space. The selected card is mist, the others white. Name is 18sp ExtraBold, role is 12sp muted at the right.
4. The detail card shows name 20sp, role, Members, Assets and goals, the form, then Invite (owner) or Leave (member).
5. Remove, Edit, Archive, Copy are each at least 48dp tall.
6. Adding an asset puts it in the list as "Value {amount}". Adding a goal shows "{progress} of {target}".
7. Editing fills the form and shows Save and Cancel. Cancel clears the form.
8. Archiving removes the row.
9. Invite with an invalid email shows the invalid email text. A valid email shows the notice and the link.
10. A member sees Leave. An owner sees Invite and no Leave. An owner who tries to leave sees the owner message.
11. No amount is shown with Rp, $ or any currency symbol.
12. The same Space and the same items appear on web and on the phone for the same account.
13. Loading, error and empty list states each render their message, and none leaves a blank screen.
14. At 1.3x font scale the form fields and buttons do not overlap or clip.
15. System back from Space lands on Home, whether Space was opened from the Home card or from Settings.
