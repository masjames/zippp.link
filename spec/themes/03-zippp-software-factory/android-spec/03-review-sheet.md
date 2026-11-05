# Android spec 03: Review sheet

Parent card: FEAT-118. Contract card: FEAT-102. Web reference:
`SnapScreen.tsx` (`ReviewSheet`, `ConfirmCard`, `FailedCard`),
`src/lib/review-ops.ts`, `src/components/app/draft.ts`,
`AppProvider.tsx` (`updateDraft`, `acceptItem`, `sendOne`, `logCorrection`).
Android target: `ui/review/ReviewScreen.kt`, drawn as an overlay on top of the
capture screen (`02-capture.md`).

Unit rule: 1 CSS px = 1 dp, 1 rem = 16 dp, text in sp. Project radius scale:
`rounded-lg` 4 dp, `rounded-xl` 6 dp, `rounded-2xl` 8 dp, `rounded-3xl` 12 dp,
`rounded-full` pill.

## 1. Purpose

Let the user read what the server extracted, fix it, and send exactly one row
to their Google Sheet. Check is required before Send. No auto-send. Unknown
values stay empty (project rules).

## 2. Facts and contradictions

1. **Fields are always editable.** There is no "Ubah" toggle on web. The
   current Android code before the FEAT-118 rewrite had one; it must not return.
2. **Delete is immediate on web**, no confirm dialog. Android copies that.
3. **Web appends with the client item id as `scanId`** (`scanId: item.id`).
   Mobile must send the **server** `scanId` returned by `/api/extract` (or
   `/api/scan/manual`), because the server records scan ownership against that
   id and spends on `scan:${userId}:${scanId}`.
4. **Web persists drafts** in IndexedDB (`batch-db`) and, on reload, turns
   interrupted `reading` and `sending` items into `ready`. Android drafts live in
   memory (`BatchStore`) and are lost when the process dies. Persistence is
   FEAT-108 and is not in FEAT-118 scope; the gap is recorded in section 10.
5. **A flag on `line_items[i].unit_price` can block Accept but has no visible
   field** (the line row shows description, quantity and amount only). The user
   can only clear it with the acknowledge checkbox. Keep this behaviour.
6. **The flag banner stays visible after the flagged field is edited**, because
   it keys off `hasHardFlags(receipt)` (flags exist at all). Only Accept
   unblocks. Keep this.
7. The web accept label is "Accept · 1 credit". DEC-002 forbids credit wording
   on Android; Android uses plain "Terima".
8. The web header is visible behind the sheet's scrim on capture (see 02, fact 1).
   The sheet's scrim covers it.

## 3. Layout tree

Overlay root: `Box(fillMaxSize)`, content centred horizontally, max width 430 dp.

```text
Scrim                         full screen, black 45% alpha, tap = minimise
Sheet                         bottom aligned, max height 88% of screen, width min(screen, 430)
  Header                      12 / 10 dp padding, bottom border 1 dp line
  Body                        weight 1, scroll inside; one of:
    ReadingState | FailedCard | ConfirmCard
  Footer                      only inside ConfirmCard
```

### Sheet container

- `Surface`: background white, shape `RoundedCornerShape(topStart = 12.dp,
  topEnd = 12.dp)`, shadow 24 dp, `heightIn(max = screenHeight * 0.88f)`.
- Enter animation 420 ms, easing `cubic-bezier(0.22, 1, 0.36, 1)`, translateY
  from 100% to 0. Exit: reverse, 250 ms.
- Keyboard: `imePadding()` on the sheet so the footer stays above the keyboard
  and the body shrinks and scrolls.
- System back minimises (same as the scrim).

### Header

- `Row`, space-between, centre aligned, gap 8, padding start 12, end 12,
  top 10, bottom 10, bottom divider 1 dp `ZipppColors.line`.
- Left: Minimise pill. `RoundedCornerShape(50)`, background mist, padding
  horizontal 12, vertical 6 (web) inside a 48 dp tall hit box; text
  `↓ {app.review.minimize}` 12 sp SemiBold ink. Copy: "↓ Scan more" / "↓ Foto lagi".
- Right: `Row`, gap 4: prev, index, next.
  - Prev and next: circle buttons. Web 32 dp; Android 48 x 48 dp. Glyph "‹" and
    "›" 18 sp Bold, alpha 0.3 when disabled (first / last), labels
    `app.review.prev`, `app.review.next`.
  - Index: `{i}/{n}` (1-based, same list and same snapshot as the strip subtitle in
  file 02 section 4 [E]: drafts not `accepted` or `sending`), 11 sp SemiBold `ZipppColors.muted`, minimum
    width 72 dp, centred.

### ReadingState (draft has no `draft` yet and is not failed)

- Centred column, vertical padding 48, gap 12.
- Spinner 32 dp, stroke 4 dp, track `ZipppColors.line`, indicator brand.
- Text `app.review.reading`, 14 sp, muted.

### FailedCard (status failed)

Scrollable, padding 12.

- Error text: 14 sp SemiBold `ZipppColors.danger`. Text is a mapped Android
  key (see 02, error table), never a raw server string. Fallback
  `app.queue.failed`.
- Buttons row, top margin 12, gap 8: Retry (`app.queue.retry`, background
  maroon `ZipppColors.btn`, text white) and Delete (`app.review.delete`,
  background mist, text ink). Both `RoundedCornerShape(50)`, 48 dp tall, padding
  horizontal 16, 14 sp SemiBold.
- The web "help improve reading" contribute card is not shown on Android
  (section 8).

### ConfirmCard

Column: scroll area (weight 1) then footer.

Scroll area: padding horizontal 12, vertical 10, `verticalScroll`, nested scroll
consumed so the sheet does not drag.

**Input style (all text fields)** from web `INPUT_BASE`:
`RoundedCornerShape(4.dp)`, 1 dp border, background `ZipppColors.surface`
(`#F6D3C5`), padding horizontal 8, vertical 6 on web. On Android the field
height is at least 48 dp, text 14 sp `ZipppColors.text`.

| Variant | Border |
|---|---|
| normal | `ZipppColors.line`, focus `ZipppColors.orange` |
| assumed date | amber `#FBBF24`, focus `#F59E0B` |
| flagged | `ZipppColors.danger`, focus `ZipppColors.danger` |

Field label: 10 sp SemiBold, line height 10, `ZipppColors.muted`, 2 dp above the
field (web `gap-0.5`).

Order, top to bottom:

1. **Merchant**: full width field, head font (Archivo) 16 sp ExtraBold,
   placeholder `app.check.merchantFallback`. Flaggable path `merchant`.
2. **Flag banner** (only if the receipt has any hard flag): top margin 6,
   `Column`, gap 4, `RoundedCornerShape(4.dp)`, 1 dp border `ZipppColors.danger`,
   padding 6.
   - Warning: `app.review.hardFlagWarning`, 11 sp Medium danger.
   - Checkbox row, 11 sp SemiBold body, gap 6, label `app.review.acknowledge`.
     Row is one tap target at least 48 dp tall; checkbox visual 20 dp. State
     `draft.acknowledged`.
3. **Grid**, top margin 6, two columns, gap 6:
   - Category (text, label `app.check.category`).
   - Date (text, label `app.check.date`, placeholder `app.check.datePlaceholder`).
     Editing the date sets `dateAssumed = false`. Border: flagged, else assumed
     amber, else normal. Flaggable path `date`.
   - Subtotal (label `app.check.subtotal`, decimal keyboard, right aligned,
     tabular digits). Path `subtotal`.
   - Tax (label `app.check.tax`, same style). Path `tax`.
   - Total (spans both columns, label `app.check.total`, decimal, right aligned,
     ExtraBold). Path `total`.
4. **Date assumed note**: only when `dateAssumed`. Top margin 4, 11 sp Medium,
   colour amber-700 `#B45309`, key `app.review.dateAssumed`.
5. **Ops fields** (below) each with top margin 6.
6. **Line items**, top margin 6, `Column` gap 4. Each row: `RoundedCornerShape(4.dp)`,
   1 dp `ZipppColors.line` border, padding 6, three fields with gap 4. Web grid
   columns: description `minmax(0,1fr)`, quantity 40 dp, amount 72 to 88 dp.
   Android widths: description weight 1, quantity 56 dp, amount 96 dp, each 48 dp
   tall. Placeholders `app.check.item`, `app.check.qty`, `app.check.amt`.
   Quantity centred, amount right aligned, both decimal keyboard. Paths
   `line_items[i].description`, `.qty`, `.amount`. Unit price is not shown.
   Validation messages (after Accept was tapped once), 11 sp Medium danger, no top
   margin: `app.check.itemsErr`, `app.check.priceErr`.

**Ops fields** (from `opsFor(template_id)` in `review-ops.ts`):

| Template id | Fields shown |
|---|---|
| `resto-inventory` | staff, outlet |
| `personal-expense` | payment |
| `sales-recap` | payment, customer |
| `reimbursement` | purpose |
| anything else, `custom` | none |

| Field | Control | Shown when | Label | Required |
|---|---|---|---|---|
| staff | dropdown, first entry empty | `ops.staff` and `workspace.staff_names` non-empty | `app.check.staff` | no |
| outlet | dropdown, first entry empty | `ops.outlet` and `workspace.outlets.length > 1` | `app.check.outlet` | yes when no default |
| payment | dropdown, first entry empty | `ops.payment` and the template has payment options | `app.check.payment` + `(app.check.optional)` | no |
| customer | text | `ops.customer` | `app.check.customer` + `(app.check.optional)` | no |
| purpose | text | `ops.purpose` | `app.check.purpose` + `(app.check.optional)` | no |

Outlet details: displayed value = `draft.outlet`, else `workspace.default_outlet`,
else empty. `outletMissing = outlets.length > 1 && no default && chosen blank`.
After Accept was tapped once and the outlet is missing, border danger and
message `app.check.outletErr` (11 sp Medium danger). Payment options come from
`me.workspace.payment_options` (built by `src/lib/mobile/me-workspace.ts`); do
not copy the list into the Android client. Dropdown
control: `ExposedDropdownMenuBox` with a read-only text field, field 48 dp,
menu items 48 dp.

**Footer** (inside ConfirmCard, not scrolling): top border 1 dp line, background
white, padding horizontal 12, vertical 8. `Row`, gap 8:

- Accept: Primary kind from the canonical button table in 01 section 3: weight 1,
  56 dp tall, `RoundedCornerShape(50)`, background `ZipppColors.btn`, text white 14 sp SemiBold, alpha 0.4 and not clickable
  while blocked by hard flags. Label `android.review.accept` ("Terima"); while
  sending `android.review.accepting`.
- Delete: Danger text kind (01 canonical table): 52 dp tall, minimum width 96,
  `RoundedCornerShape(50)`, background mist, text danger 14 sp SemiBold, label
  `app.review.delete`.

## 4. States

| State | Condition | Shows |
|---|---|---|
| Reading | no `draft`, status not failed | ReadingState |
| Failed | status failed | FailedCard |
| Ready | `draft` present | ConfirmCard |
| Flags unresolved | hard flag, field not edited, not acknowledged | red borders on those fields, Accept disabled |
| Flags acknowledged | `acknowledged` true | Accept enabled, red borders remain only where still unedited |
| Date assumed | `dateAssumed` | amber date border, note under grid |
| Validation shown | Accept tapped at least once this card | itemsErr, priceErr, outletErr as needed |
| Sending | status `sending` | draft leaves the queue, sheet moves to next draft or closes |
| Queue empty | no unaccepted drafts | sheet closes, capture shows `allDone` toast |
| First / last | index 0 or n-1 | prev or next disabled |

Hard flag reasons that block (`HARD_FLAG_REASONS`): `missing`, `not_in_ocr`,
`ungrounded`, `arithmetic`. Other reasons never block.

## 5. Behaviour, step by step

### Edit

1. Every edit calls `updateDraft(id, draft)` and updates local state at once.
2. Flag resolution recomputes on each edit with `isEdited(path)`: text compares
   lowercased, whitespace collapsed; numbers compare within 0.005 after
   `parseMoney`.
3. Number parsing is `parseMoney`: accepts `1234`, Indonesian grouping
   `1.234.567` and `1.234,56`, US grouping `1,234.56`, a lone comma as decimal.
   Blank means null. Android ports this exactly; do not use `toDouble()` alone.

### Navigate

1. Prev and next move the index within `[0, n-1]`. Index is clamped when the
   queue shrinks. A new capture selects the newest draft (web behaviour).
2. Minimise: scrim tap, minimise pill or system back. Closes the sheet and
   returns to live capture. It never discards or sends.

### Accept (`tryAccept`)

1. Set `showErrors = true`.
2. Return without sending if any of: no line item has any text or number
   (`noLines`), neither any line amount nor total is filled (`noPrice`), outlet
   missing, or hard flags unresolved without acknowledge.
3. Otherwise `logCorrection` (below), set status `accepted` (hides it from the
   queue), index stays so the next draft slides in. If it was the last one the
   sheet closes.
4. Enqueue the send. Sends run one at a time in order.
5. `POST /api/sheets/append`, bearer auth, JSON:
   `receipt` (from `fromDraft`), `staff` (trimmed, empty string if none),
   `outlet`, `payment`, `purpose`, `customer` (trimmed, null when empty),
   `scanId` (server id, see fact 3).
6. Responses: `ok` removes the draft and bumps the saved counter (toast
   `app.review.saved`); 401 is session lost (`DEVICE_REVOKED` path); 402 or
   `NO_CREDITS` puts the draft back to `ready` with `android.error.no_credits`
   and flips capture to out-of-quota; `SCAN_ALREADY_SENT` removes the draft;
   `PLAN_LIMIT`, `GOOGLE_RECONSENT`, `NO_SHEET` and others put it back to
   `ready` with the mapped key from the 02 error table; network failure puts it
   back to `ready` with `android.error.server`. A returned draft shows an inline
   error line (12 sp danger) above the footer.
7. After every send attempt refresh plan usage (quota percentage on Settings).

### `fromDraft` (what is sent)

- Lines with no description, quantity, unit price or amount are dropped.
- `unit_price` = typed unit price if present, else `amount / qty` when both are
  known and qty is not 0, else null. Nothing is invented: unknown stays null.
- Merchant, date, currency, category are trimmed and sent as null when blank.
- Date format sent is whatever the draft holds (`yyyy-MM-dd` for an assumed date).

### Correction telemetry (`logCorrection`)

On Accept, before the send, post to `POST /api/corrections` (bearer accepted):
the record from `buildCorrectionRecord` (`src/lib/correction-diff.ts`) with the
extract `runId` and `lang`. Per field: edited yes or no, flag reasons. No images,
no raw values. Fire and forget; failure is ignored. The acknowledge tap itself is
not recorded (known gap in the context file).

### Delete

1. Tap Delete. Remove the draft from the queue immediately, no dialog, no undo.
2. If the queue is now empty close the sheet; else show the next draft.

## 6. Touch targets

- Every tappable is at least 48 dp x 48 dp: header pill, prev, next, checkbox
  row, dropdown fields, each input row, Retry, Delete, Accept.
- Footer heights follow the canonical table in 01 section 3: Accept 56 dp,
  Delete 52 dp. Failed card buttons 48 dp.
- Vertical gap between two stacked inputs at least 6 dp, between adjacent hit
  boxes at least 8 dp where they sit side by side.
- Inputs are at least 48 dp tall even though the web inputs are about 32 dp.
  The web look (colours, radius, label size) is kept.

## 7. Wording keys

Present in `spec/wording.txt` (en and id), verified:
`app.review.minimize`, `app.review.prev`, `app.review.next`,
`app.review.reading`, `app.review.delete`, `app.review.dateAssumed`,
`app.review.hardFlagWarning`, `app.review.acknowledge`, `app.review.saved`,
`app.queue.failed`, `app.queue.retry`, `app.check.merchantFallback`,
`app.check.category`, `app.check.date`, `app.check.datePlaceholder`,
`app.check.subtotal`, `app.check.tax`, `app.check.total`, `app.check.staff`,
`app.check.outlet`, `app.check.outletErr`, `app.check.payment`,
`app.check.customer`, `app.check.purpose`, `app.check.optional`,
`app.check.item`, `app.check.qty`, `app.check.amt`, `app.check.itemsErr`,
`app.check.priceErr`.

Android keys present: `android.review.accept` (Terima), `android.review.accepting`
(Mengirim…), plus the error keys listed in `02-capture.md`.

Copy to know about:

| Key | en | id |
|---|---|---|
| `app.review.minimize` | Scan more | Foto lagi |
| `app.review.delete` | Delete | Hapus |
| `app.review.dateAssumed` | Date assumed from the photo time. Check it. | Tanggal diasumsikan dari waktu foto. Periksa. |

Forbidden on Android: `app.review.acceptCost`.

Existing Android-only labels `android.review.merchant`, `.total`, `.date`,
`.category`, `.payment`, `.staff`, `.outlet`, `.purpose`, `.customer`,
`.description`, `.qty`, `.amount`, `.discard`, `.edit`, `.editedLabel` become
unused after parity. Map the `app.check.*` keys instead and drop those; `.edit`
and `.editedLabel` go with the removed Ubah toggle. Do this in the generator, not
by hardcoding.

Missing: none. `android.review.discard` ("Buang") differs from web "Hapus";
parity uses `app.review.delete`.

## 8. Android-only differences, allowed

| Difference | Why |
|---|---|
| Accept label "Terima", no cost suffix | DEC-002 |
| Fields at least 48 dp tall, qty 56 dp, amount 96 dp, header buttons 48 dp | Touch targets, small web sizes are too tight |
| No debug panel (`DebugPanel`) | Web diagnostic only |
| No "help improve reading" contribute card | `/api/contribute` has no bearer path; revisit with a server change |
| Native dropdown menus instead of `<select>` | Platform control |
| Drafts are not restored after process death | FEAT-108 owns persistence |
| Sheet uses `imePadding()` | Android keyboard behaviour |
| `scanId` is the server id | Mobile ownership and idempotency contract |

## 9. Acceptance checklist

Checkable from a phone screenshot, uiautomator dump, or logcat.

1. Tap a draft in the strip: a bottom sheet rises (about 0.4 s) over a 45% black
   scrim; the sheet reaches at most 88% of screen height and has 12 dp top
   corners. Screenshot.
2. Header shows "↓ Foto lagi" pill left, `‹ 1/N ›` right; prev and next are 48 dp
   and dimmed at the ends.
3. Scrim tap, "Foto lagi" and system back all minimise; the draft is kept.
4. While a read is in flight the sheet shows a 32 dp spinner and "Membaca...".
5. Failed read: danger text, Retry and Hapus buttons 48 dp. Retry returns to
   "Membaca..." and posts `/api/extract` again (logcat).
6. A ready draft shows, in order: merchant (Archivo, 16 sp), grid with category,
   date, subtotal, tax, total, then ops fields, then lines, then footer.
7. Input background is peach `#F6D3C5`, border `#E4B9A8`, radius 4 dp, labels 10 sp
   muted. Compare with a web screenshot at the same width.
8. Fields are editable without any "Ubah" step. Typing in the total updates the
   draft immediately.
9. `1.234.567`, `1.234,56` and `1,234.56` in total all send the same numbers as
   the web (compare the `receipt` body in logcat or the sheet row).
10. A receipt with a hard flag: flagged fields have red borders, the red banner
    with `app.review.hardFlagWarning` and the acknowledge checkbox is visible, and
    Accept is dimmed (alpha 0.4) and does nothing when tapped.
11. Editing the flagged field removes its red border and enables Accept. The
    banner stays. Ticking the checkbox alone also enables Accept.
12. Missing date: the date field is filled with the capture date, has an amber
    border, and "Tanggal diasumsikan dari waktu foto. Periksa." shows under the
    grid. Editing the date removes the border and the note.
13. Template `resto-inventory` with 2 or more outlets and no default: Staff
    (if names exist) and Outlet dropdowns show; Accept without an outlet shows
    the outlet error and does not send. Template `personal-expense` shows only
    Payment; `sales-recap` Payment and Customer; `reimbursement` Purpose;
    `custom` none.
14. Tap Accept with no line item text: `app.check.itemsErr` shows, nothing is sent.
    With no amount and no total: `app.check.priceErr`.
15. Valid Accept: logcat shows `POST /api/corrections` then `POST /api/sheets/append`
    with `Authorization: Bearer`, `scanId` equal to the id from the extract
    response, and `staff`, `outlet`, `payment`, `purpose`, `customer` as in the
    table. Sheet row appears. Toast "Tersimpan".
16. Accept the last draft: sheet closes and the toast `app.review.allDone` shows
    on capture (copy fixed under W-1, no em dash). Back from Capture lands on Home.
17. Append with no quota: draft returns to the queue with the
    `android.error.no_credits` text, capture shows the out-of-quota card.
18. Delete removes the draft at once and shows the next one (or closes the
    sheet when none remain).
19. Open the keyboard on the total field: footer stays visible above the
    keyboard; the body scrolls.
20. Every tappable on the sheet is at least 48 dp x 48 dp (uiautomator bounds).
21. No string on the sheet contains "kredit", "saldo", "Rp", "$" or "Top up".
22. Sheet at 360 dp screen width does not clip any field; at 430 dp and wider
    it stays 430 dp wide, centred.

## 10. Open questions

1. `me.workspace` already returns `template_id`, `staff_names`, `outlets`,
   `default_outlet` and `payment_options`. Confirm the Android `Workspace` model
   in `Models.kt` decodes all of them (the model currently shows only title,
   name and sheet id).
2. ~~Persist drafts across process death now?~~ Decided: no. Persistence belongs
   to FEAT-108 (also stated in 01 section 7).
3. Add an undo snackbar on Delete (not on web), or keep it immediate for parity?
4. Add bearer support to `/api/contribute` so the help-improve card can ship?
5. The unit price flag has no visible field. Show unit price as an optional
   fourth line field on both surfaces, or keep acknowledge as the only exit?
6. Wording fix task W-1: `app.review.allDone` contains an em dash in both
   languages, which breaks the project rule. Rewrite the copy in
   `spec/wording.txt` (en and id) before the review sheet ships. Not an open
   question, it is a task.
