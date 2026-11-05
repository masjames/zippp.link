# Android spec 02: Capture screen

Parent card: FEAT-118. Web reference: `src/components/app/screens/SnapScreen.tsx`
(`SnapScreen`, `GuideFrame`), `PhoneShell.tsx`, `AppShell.tsx`,
`AppProvider.tsx` (`extractItem`, `addBlob`), `useReceiptDetector.ts`.
Android target: `ui/camera/CameraScreen.kt`. Shell and header live in
`01-shell-and-navigation.md` (another track); this file only states what capture
needs from them.

Unit rule used below: 1 CSS px = 1 dp, 1 rem = 16 dp, text sizes in sp. The
project Tailwind scale is halved: `rounded-lg` 4 dp, `rounded-xl` 6 dp,
`rounded-2xl` 8 dp, `rounded-3xl` 12 dp, `rounded-panel` 14 dp,
`rounded-full` pill. Colours are the tokens in `ui/theme/Tokens.kt`
(`ZipppColors`), which mirror `globals.css`.

## 1. Purpose

Take a photo of a receipt, send it to `/api/extract`, queue the result for
review. The screen is also the place where the user sees how many receipts are
waiting, opens the Google Sheet, and reaches Settings.

Capture is not the entry screen. The user reaches it from Home (file 07) with
Scan receipt, and system back or the shutter flow returns to Home. Manual entry
does not live here, it lives on Home.

## 2. Facts that correct earlier plans

1. **The web header is shown on the capture screen.** `AppShell` renders the
   wordmark, the credit pill and the gear on `/app/snap`. Only the Home link is
   hidden there (`pathname !== "/app/snap"`). Earlier text saying "header hidden
   on capture" is wrong. Android shows the header on capture, without the credit
   pill (owner call 2026-11-05, DEC-002) and without Home.
2. **There is no Space link on web capture.** Space is reached from Settings
   (`/app/settings/space`). The two text links under the controls on the current
   Android screen (Space, Pengaturan) have no web counterpart. Remove both. The
   gear in the header is the only way to Settings.
3. **The viewfinder is not full height.** Web sizes it by the camera frame
   aspect ratio (default 3:4 until metadata loads) and collapses it to 96 dp
   when the camera is not live. Android must not fill the remaining height.
4. **`/api/extract` does not check or spend credits.** Credits are spent only by
   `/api/sheets/append` (key `scan:${userId}:${scanId}`). Web blocks the shutter
   on the client when `balance.credits <= 0`. Mobile `extract` returns `scanId`
   in the success body; the same id must go to append.
5. **Web blocks the shutter on blur.** `shutter()` returns when
   `!detection.sharp`. Android has no detector (FEAT-107), so Android never
   blocks on blur. See section 9.
6. **`/api/billing/balance`, `/api/billing/plan`, `/api/sheets/append`,
   `/api/corrections` accept the mobile bearer. `/api/sheets/connect`,
   `/api/sheets/workspace` and `/api/notices` do not.** The web sheet picker and
   admin notice therefore cannot be ported without server work.
7. **Entry screen is decided: Home.** On web, bare `/app` redirects to
   `/app/snap`. The owner decided on 2026-11-05 that Android opens on a Home
   dashboard (file 07), and Capture is entered from its Scan receipt button.
   Manual moves to Home. This file no longer carries a Manual pill.

## 3. Layout tree (top to bottom)

Root: `ZipppShell(tone = Page)`; background `#E8E8E8` (`ZipppColors.page`).
Content column width is `min(screen, 430 dp)`, centred.

```text
ZipppHeader                       (01 spec: wordmark left; gear right; no Home, no pill)
PhoneShell content column         px 24, pt 16, pb 48, gap 16, scrollable
  [A] SheetPill row               only when workspace title known; see below
  [B] Viewfinder
  [C] Controls row
  [D] OutOfQuotaCard              conditional
  [E] DraftStrip                  conditional
  [F] OpenSheetButton             conditional
Overlays: ReviewSheet (03 spec), Toast, FlashOverlay
```

The web pill row (`PhoneShell` `pill` prop) is `px-6 pb-2 pt-3` (24 / 8 / 12 dp),
right-aligned, and sits above the content padding.

### [A] Sheet pill

- Shown only when `me.workspace.spreadsheet_title` is non-empty.
- Compose: `Row` end-aligned, padding start 24, end 24, top 12, bottom 8.
- Pill: `RoundedCornerShape(4.dp)` (web `rounded-lg`), background card white,
  border 2 dp `ZipppColors.line`, padding horizontal 10, vertical 4,
  max width 190 dp, text 12 sp SemiBold `ZipppColors.text`, single line,
  ellipsis. Not tappable on Android (web taps open a sheet picker; the server
  does not allow bearer on `/api/sheets/connect`). No chevron when not tappable.
- Visual height 28 dp is fine because it is not interactive.

### [B] Viewfinder

- Container: `Box`, `fillMaxWidth()`, `aspectRatio(3f / 4f)` while the camera is
  live or while a flash overlay is showing; `height(96.dp)` otherwise.
- Shape `RoundedCornerShape(14.dp)`, `clip`, background `#2A1410`
  (`ZipppColors.camera`), content colour peach `#F6D3C5`, text centred.
- Preview: `PreviewView` with `implementationMode = COMPATIBLE`,
  `scaleType = FIT_CENTER` (web uses `object-contain`), `Preview` and
  `ImageCapture` both bound with `AspectRatio.RATIO_4_3`. When a review sheet
  is expanded or the camera is not live, preview alpha is 0.4 (web `opacity-40`),
  fade 300 ms.
- Guide frame (`GuideFrame`): centred box, aspect 9:16, height 88% of the
  viewfinder. Four corner marks, each 28 x 28 dp, stroke 4 dp, colour white at
  90% alpha, outer corner radius 6 dp, only the two edges that meet at that
  corner drawn. Not interactive.
- Hint pill (live and no expanded review): top 12 dp, centred, background black
  at 55% alpha, padding horizontal 12, vertical 4, `RoundedCornerShape(50)`,
  text 12 sp SemiBold white, key `app.capture.tapToShoot`.
- Bottom line (live): bottom 16 dp, centred, 12 sp. Web shows
  `app.capture.holdSteady` in amber-200 `#FDE68A` SemiBold when the frame is
  blurry, else `app.capture.frame` in white at 80% alpha with 24 dp side
  padding. Android always shows `app.capture.frame` (no detector).
- Non-live centre text (14 sp, peach): starting `app.capture.starting`, error
  `app.capture.cameraError`, idle `app.capture.tapStart`.
- Shutter: the whole viewfinder is the tap target (web full-bleed transparent
  button). Disabled when out of quota, starting, or a review sheet is expanded.
  Accessibility label `app.capture.shutter`.
- Flash overlay: white, full cover, 160 ms (web `setFlash`), above everything
  inside the viewfinder.

### [C] Controls row

Web: `flex items-center justify-between text-xs`. Android keeps the order and
fixes the sizes.

- Left: text button `app.capture.upload`, 12 sp Medium, `ZipppColors.ink`,
  underline offset 4 dp. Opens the system photo picker (`image/*`). Hit target
  48 dp tall, at least 48 dp wide.
- Right: `Row`, gap 8 dp, three pills in this order: Flash (only if the device
  has a flash unit). There is no Manual pill (it lives on Home, file 07).
  Auto-snap is not shown until FEAT-107.
- Pill visual: `RoundedCornerShape(50)`, padding horizontal 12, vertical 4 on
  web (about 28 dp tall). Android visual height 36 dp, inside a 48 dp tall hit
  box, 12 sp SemiBold. Hit box width at least 48 dp.
- Colours: off = background white, text ink, elevation 1 dp (web `shadow-sm`).
  Flash on = background brand `#EE5329`, text ink, label `{app.capture.flash} ·
  {app.capture.on}`.
- Flash behaviour (torch, not shutter flash):
  `camera.cameraControl.enableTorch(on)`. Visibility from
  `camera.cameraInfo.hasFlashUnit()`. State from `cameraInfo.torchState`
  observed as a `State`, not a local boolean, so the pill always matches the
  real torch. Do not use `ImageCapture.flashMode` for this button; it only fires
  during the shutter and does not light the preview. Torch turns off when the
  screen leaves composition (`unbindAll`). Pressed state exposes
  `stateDescription` on/off for TalkBack.

### [D] Out-of-quota card

- Web: `rounded-2xl` (8 dp), white, padding 12, centred text 14 sp, shadow-sm;
  title SemiBold ink; a maroon "Top up" pill below.
- Android: same card. Title key `android.error.no_credits` ("Sisa kuota scan Anda
  telah habis. Pemindaian baru belum tersedia."). Two buttons below, gap 8:
  `android.error.no_credits.refresh` (Muat Ulang) and
  `android.error.no_credits.support` (Bantuan). Both 48 dp tall, outline style.
  No purchase link, no "buy on the web" text (DEC-002).
- Shown only when the plan or balance says empty. Unknown is not empty. See
  state table.

### [E] Draft strip (web "mini review card")

- Shown when there is at least one unaccepted draft and the review sheet is
  minimised.
- `Row`, `RoundedCornerShape(8.dp)`, background white, border 2 dp
  `ZipppColors.line`, padding 8, elevation 1 dp, gap 4. Enter animation 380 ms
  ease-out: alpha 0 to 1, translateY 12 dp to 0, scale 0.98 to 1.
- Prev and next: web 36 x 40 dp; Android 48 x 48 dp, glyphs "‹" and "›" at 20 sp
  Bold ink, alpha 0.3 when disabled (first/last), labels `app.review.prev` and
  `app.review.next`.
- Centre button (fills width, tap expands the review sheet): thumbnail 48 x 48
  dp, `RoundedCornerShape(4.dp)`, 1 dp `ZipppColors.line` outline, `ContentScale.Crop`;
  text column, gap 12 from thumbnail: title 14 sp Bold ink, one line ellipsis;
  subtitle 12 sp `ZipppColors.muted`: `{count} to review` plus ` · i/n` when n > 1.
- Title rule (web `miniTitle`): merchant if non-blank; else `app.review.reading`
  while the read is in flight; else `app.queue.failed` if failed; else
  `app.review.openCard`.

### [F] Open sheet button

- Shown when `workspace.spreadsheet_id` is known.
- `Row` centred, gap 8, `RoundedCornerShape(50)`, background mist `#C9CFD9`,
  padding horizontal 24, vertical 16 (height 56 dp), text SemiBold ink 14 sp,
  icon `ic_sheets` 20 dp (green, not tinted), key `app.sheets.open`.
- Tap opens `https://docs.google.com/spreadsheets/d/{id}/edit` with
  `ACTION_VIEW`.
- "Shine" when the queue goes from at least 1 draft to 0: background `#E8F5E9`
  and a green ring `rgba(52,168,83)` that pulses 0 to 6 dp to 0 over 1.4 s, 3
  times, whole effect stops after 4.2 s.

### Toast

- `Box` above the content, bottom offset 112 dp, centred, `pointer-events` none.
- Pill: background ink, text white 14 sp SemiBold, padding horizontal 16,
  vertical 8, elevation 6.
- `app.review.saved` for 1800 ms on each successful append. `app.review.allDone`
  for 2600 ms when the queue empties.

## 4. States

| State | Trigger | Viewfinder | Controls | Notes |
|---|---|---|---|---|
| No permission | `CAMERA` not granted | 96 dp, centre text `android.camera.permission`, button `android.camera.allow` (48 dp) | Upload still works | Gallery path stays usable |
| Starting | camera provider binding | 96 dp, `app.capture.starting` | shutter disabled | |
| Ready | bound, `ImageCapture` set | 3:4 live preview, guide, hint | all enabled | |
| Capturing | shutter tapped | flash overlay 160 ms, then "reading" overlay | shutter disabled until bytes ready | |
| Extracting | upload in flight | draft appears in strip with title `app.review.reading` | shutter enabled again | Up to 3 reads in parallel (web `MAX_CONCURRENT_EXTRACTIONS`) |
| Camera error | bind throws | 96 dp, `android.camera.error` | Upload works | Retry on next `ON_RESUME` |
| Out of quota | plan `used >= included` with `included > 0`, or `NO_CREDITS` returned by append | live preview stays; shutter disabled | [D] shown | Unknown quota is NOT out of quota |
| Queue N drafts | N unaccepted | as Ready | [E] shown, `i/n` when N > 1 | |
| Flash on | torchState ON | | Flash pill brand colour, label with "· On" | |
| Flash unavailable | no flash unit | | Flash pill absent | |
| Review expanded | drawer open | alpha 0.4, shutter disabled | | see 03 |
| Offline | no network at upload | | | draft `failed`, retry offered, see section 5 |

Error codes shown on a failed draft (mapped, never raw server strings):

| Source | Code | Wording key |
|---|---|---|
| extract 401 | `DEVICE_REVOKED` | `android.error.device_revoked`, then sign out |
| extract 422 `refusal: not_a_receipt` | manual shot | `android.error.extract_failed` |
| extract 422 `refusal: unreadable` | | `android.error.extract_failed` |
| extract 413 / 415 / 400 | | `android.error.extract_failed` |
| extract 5xx | | `android.error.server` |
| no network / timeout | `NETWORK` | `android.error.server` |
| append 402 / `NO_CREDITS` | | `android.error.no_credits` and [D] |
| append `PLAN_LIMIT` | | `android.plan.limit` |
| append `GOOGLE_RECONSENT` | | `android.error.google_reconsent` |
| append `NO_SHEET` | | `android.error.no_sheet` |
| append other | | `android.error.append` |

## 5. Behaviour, step by step

### Entry and exit

1. Entry is only from Home: the Scan receipt button (56dp) opens this screen.
   It is never the first screen after sign in.
2. System back, and the header wordmark, return to Home. Opening a draft from
   Home (Review) shows this screen with the review sheet over it; closing the
   sheet leaves the user on Capture, back returns to Home.
3. After an accepted receipt is queued, the user stays on Capture to take the next
   one (same as web). Home refreshes when the user returns to it.

### Open the screen

1. `LaunchedEffect(token)` calls `GET /api/auth/mobile/me`. On success set
   sheet title, sheet id, plan. On `DEVICE_REVOKED` sign out. On any other
   failure keep going; the screen works without the title.
2. Request `CAMERA` if not granted. If denied show the No permission state.
3. Bind `Preview` and `ImageCapture` to the lifecycle (back camera). Failure
   goes to the Camera error state, never to a silent black box.
4. Out-of-quota is computed only from known values:
   `plan != null && plan.included > 0 && plan.used >= plan.included`, or a
   `NO_CREDITS` result from append. A null plan and unknown balance mean
   allowed. This fixes the false "quota exhausted" card seen after relaunch.

### Take a photo

1. Tap the viewfinder. Ignore if out of quota, starting, or review expanded.
2. Start the 160 ms white flash.
3. `ImageCapture.takePicture` to memory. Downscale so width x height is at most
   3,000,000 pixels (web `CAPTURE_MAX_PIXELS`), encode JPEG quality 72
   (`CAPTURE_QUALITY`), respect EXIF rotation. Build a 96 x 96 centre-crop
   thumbnail at JPEG quality 60. Upload limit server side is 12 MiB.
4. Create a local draft with a client id, status `queued`, source `manual`.
   Show it in the strip at once, selected index = newest.
5. The queue runner picks `queued` items (3 at a time), sets `reading`, and
   posts multipart `image` (`receipt.jpg`, `image/jpeg`) to
   `POST /api/extract` with `Authorization: Bearer`.
6. Success (`ok: true`): build the draft from `receipt`. If `date` is empty,
   fill it with the capture date (local `yyyy-MM-dd`) and set `dateAssumed`
   (web `captureDate`). Keep `scanId` from the response. Status `ready`.
7. Failure: status `failed`, map the code with the table above. Offer Retry and
   Delete in the review sheet (03). Retry sets `queued`.
8. The first time a draft enters `reading`, the review sheet opens in reading
   state; when the draft lands it minimises after 650 ms (web behaviour) so the
   user can shoot again. Opening the sheet by tap never auto-minimises.

### Gallery upload

1. Tap `app.capture.upload`, open the photo picker (`image/*`).
2. Decode, rotate by EXIF, downscale to the same pixel budget, encode JPEG q72.
   If decode fails create a `failed` draft with `android.error.extract_failed`.
3. Continue at step 4 of "Take a photo" with source `manual`.

### Accept

Handled by the review sheet (03). Accept moves the draft to `sending`, hides it
from the queue, and posts append. Success removes it, shows the saved toast,
and refreshes the plan usage line.

### Sheet pill, notice, sheet picker

Not ported. See section 8.

## 6. Touch targets

- Every tappable element is at least 48 dp tall and at least 48 dp wide, using
  `Modifier.minimumInteractiveComponentSize()` or an explicit `heightIn(48.dp)`.
  A visual that is smaller (pills at 36 dp, strip arrows) keeps its look inside
  the larger hit box.
- Primary and full-width buttons: 52 to 56 dp tall. Open sheet is 56 dp.
- Viewfinder is one large target and satisfies the rule by size.
- Gap between two adjacent hit boxes is at least 8 dp.

## 7. Wording keys

All verified present in `spec/wording.txt` (en and id) unless listed under
missing.

Web keys reused on Android: `app.capture.tapToShoot`, `app.capture.starting`,
`app.capture.cameraError`, `app.capture.tapStart`, `app.capture.frame`,
`app.capture.shutter`, `app.capture.upload`, `app.capture.flash`,
`app.capture.on`, `app.review.prev`, `app.review.next`, `app.review.toReview`,
`app.review.reading`, `app.review.openCard`, `app.review.saved`,
`app.review.allDone`, `app.queue.failed`, `app.queue.retry`, `app.sheets.open`.

Android keys: `android.camera.permission`, `android.camera.allow`,
`android.camera.error`, `android.error.no_credits`,
`android.error.no_credits.refresh`, `android.error.no_credits.support`,
`android.error.extract_failed`, `android.error.server`,
`android.error.device_revoked`, `android.error.google_reconsent`,
`android.error.no_sheet`, `android.error.append`, `android.plan.limit`.

Web keys that must NOT appear on Android (DEC-002): `app.credits.none`
("No credits. Top up..."), `app.topup.title`, `app.credits.pill`,
`app.credits.low`, and `app.review.acceptCost` ("Accept · 1 credit",
"Terima · 1 kredit"). Android uses `android.review.accept` ("Terima").

Missing: none from the lists above. Candidates to add if the owner wants them:
a Flash on/off `stateDescription` pair. The Manual label moved to Home
(`android.home.manual`, file 07).

## 8. Android-only differences, allowed

| Difference | Why |
|---|---|
| No credit pill in the header, no credit numbers anywhere | DEC-002, owner call |
| Out-of-quota card has Muat Ulang and Bantuan, not Top up | DEC-002 |
| Accept label `Terima` without "· 1 kredit" | DEC-002 |
| No auto-snap pill, no blur gate, no "Hold steady" line | No detector until FEAT-107 |
| No automatic torch from brightness | Same reason; torch is manual |
| No Manual pill on this screen | FEAT-115 manual entry has no web twin, so it lives on Home (file 07) |
| Sheet pill is read-only, no sheet picker | `/api/sheets/connect` has no bearer path |
| No admin notice modal | `/api/notices` has no bearer path |
| Upload accepts images only | Web rasterises PDF page 1 in the browser; no Android equivalent decided |
| 48 dp hit boxes around 28 to 36 dp visuals | Touch accessibility |
| Torch via `CameraControl`, shutter via `ImageCapture` | CameraX, not `getUserMedia` |

## 9. Acceptance checklist

Each item can be checked from a phone screenshot or logcat.

1. Header is visible on the capture screen: wordmark left, gear right, no Home,
   no pill, no credit number. Screenshot.
2. No "Space" or "Pengaturan" text links and no Manual pill under the controls. Screenshot.
3. Viewfinder has a 14 dp rounded corner, ratio 3:4, and the live camera image
   is visible (not black) with the phone held up. Screenshot.
4. Four white 28 dp corner marks at 88% of the viewfinder height, 9:16. Screenshot.
5. Hint pill "Ketuk layar untuk memotret" at the top, black 55% background.
6. Flash pill is shown only on a device with a flash unit. Tapping it lights the
   torch within 300 ms and the pill turns orange with "· On"; tapping again
   turns it off. `dumpsys media.camera` or the visible light confirms.
   Leaving the screen turns the torch off.
7. Every tappable control measures at least 48 dp x 48 dp. Check with
   Accessibility Scanner or layout bounds (`uiautomator dump`, bounds >= 48 dp).
8. After a cold start with a stored token and a plan that is not full, the
   out-of-quota card is NOT shown. Screenshot.
9. With a plan at `used >= included`, the card is shown with Muat Ulang and
   Bantuan, no purchase text, and the shutter does nothing.
10. Tap shutter: white flash for about 160 ms, a draft appears in the strip
    immediately with "Membaca...". Logcat shows one `POST /api/extract`.
11. A good receipt: within 15 s the strip title becomes the merchant, the
    subtitle reads "1 untuk diperiksa", and the sheet minimises by itself.
12. Airplane mode, tap shutter: the draft ends as `failed` with
    "Layanan sedang tidak tersedia. Coba lagi nanti." within 30 s; the spinner
    never runs forever. Retry works once the network is back.
13. A photo of a non-receipt: draft ends `failed` with
    "Gagal membaca struk ini. Coba lagi atau abaikan."
14. Take 3 photos in a row without waiting: three drafts, `1/3` style counter,
    at most 3 concurrent extract requests in logcat.
15. Strip arrows are 48 dp, disabled at the ends at 30% alpha.
16. Open sheet button is 56 dp tall, mist background, green Sheets icon; tapping
    it opens the Google Sheet. When the queue empties it flashes green 3 times.
17. Toast shows "Tersimpan" (`app.review.saved`) for about 1.8 s after an
    accepted receipt is appended. When the queue empties it shows
    `app.review.allDone` for about 2.6 s. Note: the existing en and id copy of
    `app.review.allDone` contains an em dash, which breaks the project rule; fix
    the copy in `wording.txt` before shipping.
18. Gallery upload of a 12 MP photo produces a JPEG of at most 3,000,000 pixels
    and under 12 MiB; the request succeeds.
19. No string on this screen contains "kredit", "saldo", "Rp", "$", or "Top up".
20. Device revoked (401): the app signs out and shows
    `android.error.device_revoked`.

## 10. Open questions

1. ~~What is the Android home screen?~~ Decided 2026-11-05: Home dashboard,
   file 07.
2. ~~Should the Manual pill live here?~~ Decided: no, it lives on Home.
3. PDF upload: rasterise page 1 on Android (`PdfRenderer`), or images only?
4. Add bearer support to `/api/sheets/connect` so the sheet pill can switch
   sheets, or keep it read-only?
