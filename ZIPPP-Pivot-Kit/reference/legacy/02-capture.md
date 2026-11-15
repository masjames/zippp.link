# Android spec 02: Capture screen

Parent card: FEAT-118. Web reference: `src/components/app/screens/SnapScreen.tsx`
(`SnapScreen`, `GuideFrame`), `PhoneShell.tsx`, `AppShell.tsx`,
`AppProvider.tsx` (`extractItem`, `addBlob`, `addFile`), `src/lib/image.ts`
(`prepareImage`, `pdfFirstPageToJpeg`, `isReceiptUpload`),
`useReceiptDetector.ts`, `src/app/api/extract/route.ts`.
Android target: `ui/camera/CameraScreen.kt`. Shell and header live in
`01-shell-and-navigation.md`; this file only states what capture needs from
them. Button heights come from the canonical button table in 01 section 3.
Spreadsheet and statement import is a separate feature, FEAT-121, and is only
routed from here (section 5, "File upload").

Unit rule used below: 1 CSS px = 1 dp, 1 rem = 16 dp, text sizes in sp. The
project Tailwind scale is halved: `rounded-lg` 4 dp, `rounded-xl` 6 dp,
`rounded-2xl` 8 dp, `rounded-3xl` 12 dp, `rounded-panel` 14 dp,
`rounded-full` pill. Colours are the tokens in `ui/theme/Tokens.kt`
(`ZipppColors`), which mirror `globals.css`.

Labels used in this file: **V1** is built under FEAT-118. **Later** is specified
so the screen does not need a redesign, but is not built yet. **Proposed** marks
a number that has no web source and needs the owner to accept it.

## 1. Purpose

Take a photo of a receipt, or pick a photo or document from the phone, send it
to `/api/extract`, queue the result for review. The screen is also the place
where the user sees how many receipts are waiting, opens the Google Sheet, and
reaches Settings through the header.

Capture is not the entry screen. The user reaches it from Home (file 07) with
Scan receipt, and system back always returns to Home, including when Capture was
opened from the notification prompt (owner decision 2026-11-05). Manual entry
does not live here, it lives on Home.

## 2. Facts that correct earlier plans

1. **The web header is shown on the capture screen.** `AppShell` renders the
   wordmark, the credit pill and the gear on `/app/snap`. Only the Home link is
   hidden there (`pathname !== "/app/snap"`). Earlier text saying "header hidden
   on capture" is wrong. Android shows the header on capture, without the credit
   pill (owner call 2026-11-05, DEC-002). Because Capture is a child of Home on
   Android, the header shows Home and the gear (01 header table).
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
   admin notice therefore cannot be ported without server work (FEAT-119).
7. **Entry screen is decided: Home.** On web, bare `/app` redirects to
   `/app/snap`. The owner decided on 2026-11-05 that Android opens on a Home
   dashboard (file 07), and Capture is entered from its Scan receipt button.
   Manual moves to Home. This file no longer carries a Manual pill.
8. **The web has two different image budgets.** Camera frames use
   `CAPTURE_MAX_PIXELS = 3_000_000` and `CAPTURE_QUALITY = 0.72` (`SnapScreen.tsx`
   lines 48 and 49). Files from the picker go through `prepareImage` defaults:
   `maxPixels = 4_000_000`, `quality = 0.85` (`image.ts`). The earlier text of
   this spec and the current Android gallery code (quality 72) treated both as 3 MP
   at q72. That is wrong for files. This spec uses the web numbers for each path.
9. **The server accepts only JPEG, PNG and WebP** (`ALLOWED_TYPES` in
   `extract/route.ts`), at most 12 MiB (`MAX_IMAGE_BYTES`), one `image` field, and
   it never sees a PDF. Web turns a PDF into a JPEG in the browser before
   upload (`pdfFirstPageToJpeg`, page 1 only). Android therefore always uploads a
   JPEG, whatever the user picked.
10. **The web file input is single select** (no `multiple`). Android may allow
    several files; that is a proposed difference (section 8).
11. **The web has no spreadsheet upload.** `isReceiptUpload` accepts images and
    PDF only (and names ending `.jpg .jpeg .png .webp .heic .heif .gif`). Excel and
    CSV are new product scope (FEAT-121).
12. **The shipped Android build points at production.** The audit
    (`00-audit-and-defects.md`) found `API_BASE_URL` defaults to
    `https://zippp.link`, where the mobile API is off, so every scan failed with
    one generic message. Section 5, "Server target", fixes the target. Section 4
    fixes the messages.

## 3. Layout tree (top to bottom)

Root: `ZipppShell(tone = Page)`; background `#E8E8E8` (`ZipppColors.page`).
Content column width is `min(screen, 430 dp)`, centred.

```text
ZipppHeader                       (01 spec: wordmark left; Home and gear right; no pill)
PhoneShell content column         px 24, pt 16, pb 48, gap 16, scrollable
  [A] SheetPill row               only when workspace title known; see below
  [B] Viewfinder
  [C] Controls row                Upload (left), Flash (right)
  [D] OutOfQuotaCard              conditional
  [E] DraftStrip                  conditional
  [F] OpenSheetButton             conditional
Overlays: ReviewSheet (03 spec), Toast, FlashOverlay (shutter), ImportProgress
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
  does not allow bearer on `/api/sheets/connect` until FEAT-119). No chevron when
  not tappable.
- Visual height 28 dp is fine because it is not interactive. It is the only
  element on this screen allowed under 48 dp.

### [B] Viewfinder

- Container: `Box`, `fillMaxWidth()`, `aspectRatio(3f / 4f)` while the camera is
  live or while a flash overlay is showing; `height(96.dp)` otherwise.
- Shape `RoundedCornerShape(14.dp)`, `clip`, background `#2A1410`
  (`ZipppColors.camera`), content colour peach `#F6D3C5`, text centred.
- Preview: one `PreviewView`, created once with `remember` (not recreated when
  state changes), `implementationMode = COMPATIBLE` (a `TextureView`, so the
  rounded clip does not hide it), `scaleType = FIT_CENTER` (web uses
  `object-contain`). `Preview` and `ImageCapture` are bound together in one
  `UseCaseGroup` with one `ViewPort`, both `AspectRatio.RATIO_4_3`, so the
  preview and the saved frame cover the same area. When a review sheet is
  expanded or the camera is not live, preview alpha is 0.4 (web `opacity-40`),
  fade 300 ms.
- **Preview must be visible.** Observe `PreviewView.previewStreamState`. The
  viewfinder shows the starting text until the state is `STREAMING`. If the state
  is not `STREAMING` 3 seconds after `bindToLifecycle` returns, show the Camera
  error state with a Retry (section 4). A silent black box is a defect.
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
  `android.camera.error`, idle `app.capture.tapStart`.
- Shutter: the whole viewfinder is the tap target (web full-bleed transparent
  button). Disabled when out of quota, starting, or a review sheet is expanded.
  Accessibility label `app.capture.shutter`.
- Shutter flash overlay: white, full cover, 160 ms (web `setFlash`), above
  everything inside the viewfinder. This is the visual blink, not the torch.
- Reading overlay (after the shutter, while the first bytes are prepared): see
  section 4, state Capturing.

### [C] Controls row

Web: `flex items-center justify-between text-xs`. Android keeps the order and
fixes the sizes. Nothing in this row is under 48 dp.

- Left: Upload text button, key `android.capture.upload`
  ("Unggah file", replaces the web `app.capture.upload` "Upload photo or PDF"
  because the Android picker also takes spreadsheets once FEAT-121 ships).
  14 sp SemiBold `ZipppColors.ink`, underline offset 4 dp, `heightIn(min = 48.dp)`,
  `widthIn(min = 48.dp)`, horizontal padding 8 dp. Opens the system document
  picker (section 5, "File upload").
- Right: one Flash pill, only if the device has a flash unit
  (`camera.cameraInfo.hasFlashUnit()`). There is no Manual pill (it lives on
  Home, file 07). Auto-snap is not shown until FEAT-107.
- **Flash pill is 48 dp high**, not 36. `RoundedCornerShape(50)`, horizontal
  padding 16, min width 48 dp, 14 sp SemiBold. The pill is the hit box; no hidden
  larger box. Gap to the Upload button is at least 8 dp.
- The pill always shows its state in words, not only in colour:

| State | Background | Text | Key | `stateDescription` |
|---|---|---|---|---|
| Off | white, elevation 1 dp | ink | `android.camera.flashOff` ("Flash mati") | off |
| Torch on | brand `#EE5329` | ink | `android.camera.flashOn` ("Flash aktif") | on |
| Shutter flash on (fallback only) | brand `#EE5329` | ink | `android.camera.flashShutter` ("Flash saat foto") | on, at capture only |

- **Flash is a torch.** On tap call `camera.cameraControl.enableTorch(!current)`.
  The pill state is read from `camera.cameraInfo.torchState` observed as a
  Compose `State` (`LiveData.observeAsState`), never from a local boolean, so
  the pill always matches the real light. The call returns a future; if it fails,
  the pill stays in its previous state and no message is shown.
- **Fallback.** If the device reports a flash unit but `enableTorch` fails twice in
  a row (some devices refuse the torch while another app holds the flash), set
  `ImageCapture.flashMode = FLASH_MODE_ON` for the shutter only, show the
  "Shutter flash on" state, and keep it until the user taps again. Do not use
  `ImageCapture.flashMode` for the normal case: it fires only during the shutter
  and does not light the preview, which is the defect the owner reported.
- With the torch on, `ImageCapture.flashMode` stays `FLASH_MODE_OFF`
  (the torch already lights the scene).
- The torch turns off when the screen leaves composition, on `ON_STOP`, and when
  `unbindAll()` runs. It does not stay lit on Home.

### [D] Out-of-quota card

- Web: `rounded-2xl` (8 dp), white, padding 12, centred text 14 sp, shadow-sm;
  title SemiBold ink; a maroon "Top up" pill below.
- Android: same card. Title key `android.error.no_credits` ("Sisa kuota scan Anda
  telah habis. Pemindaian baru belum tersedia."). Two buttons below, gap 8:
  `android.error.no_credits.refresh` (Muat Ulang, Mist 52 dp) and
  `android.error.no_credits.support` (Bantuan, Outline 52 dp). Heights from the
  canonical table in file 01 section 3.
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
- Centre button (fills width, `heightIn(min = 64.dp)`, tap expands the review
  sheet): thumbnail 48 x 48 dp, `RoundedCornerShape(4.dp)`, 1 dp `ZipppColors.line`
  outline, `ContentScale.Crop`; text column, gap 12 from thumbnail: title 14 sp
  Bold ink, one line ellipsis; subtitle 12 sp `ZipppColors.muted`:
  `{count} to review` plus ` · i/n` when n > 1.
  `n` is the number of drafts in `BatchStore` whose status is not `accepted` or
  `sending`, in list order, and `i` is the 1-based position of the shown draft. The
  review sheet header (file 03) writes the same `{i}/{n}` from the same list, so both
  recompute on one snapshot whenever a draft is accepted, deleted or added.
- Title rule (web `miniTitle`): merchant if non-blank; else `app.review.reading`
  while the read is in flight; else `app.queue.failed` if failed; else
  `app.review.openCard`.
- A draft in `reading` shows a Cancel text action on the strip, 48 dp, key
  `android.capture.cancel`, visible after 15 seconds (section 5, "Timeouts and
  cancel").

### [F] Open sheet button

- Shown when `workspace.spreadsheet_id` is known.
- Outline button, 52 dp (01 canonical table), full width, `RoundedCornerShape(50)`,
  1 dp `line` border, transparent background, text SemiBold ink 14 sp, gap 8,
  icon `ic_sheets` 20 dp (green, not tinted), key `app.sheets.open`.
- Tap opens `https://docs.google.com/spreadsheets/d/{id}/edit` with
  `ACTION_VIEW`.
- "Shine" when the queue goes from at least 1 draft to 0: background `#E8F5E9`
  and a green ring `rgba(52,168,83)` that pulses 0 to 6 dp to 0 over 1.4 s, 3
  times, whole effect stops after 4.2 s.

### Import progress (file upload)

- Shown only while a picked file is being prepared (PDF page render, image
  decode). Inline row above the draft strip: spinner 20 dp, text
  `android.capture.importing` ("Menyiapkan file..."), 14 sp, `ZipppColors.muted`,
  `heightIn(min = 48.dp)`. It disappears when the first draft appears in the
  strip.

### Toast

- `Box` above the content, bottom offset 112 dp, centred, `pointer-events` none.
- Pill: background ink, text white 14 sp SemiBold, padding horizontal 16,
  vertical 8, elevation 6.
- `app.review.saved` for 1800 ms on each successful append. `app.review.allDone`
  for 2600 ms when the queue empties.

## 4. States

| State | Trigger | Viewfinder | Controls | Notes |
|---|---|---|---|---|
| No permission | `CAMERA` not granted | 96 dp, centre text `android.camera.permission`, button `android.camera.allow` (Mist, 52 dp) | Upload still works | File upload stays usable |
| Starting | camera provider binding, or `previewStreamState != STREAMING` | 96 dp, `app.capture.starting` | shutter disabled | Max 3 s, then Camera error |
| Ready | bound, `ImageCapture` set, stream `STREAMING` | 3:4 live preview, guide, hint | all enabled | |
| Capturing | shutter tapped | white blink 160 ms, then dimmed frame with spinner and `app.review.reading` until the JPEG is encoded | shutter disabled until the draft exists | Usually under 1 s |
| Extracting | upload in flight | draft appears in strip with title `app.review.reading` | shutter enabled again | Up to 3 reads in parallel (web `MAX_CONCURRENT_EXTRACTIONS`) |
| Camera error | bind throws, or stream not `STREAMING` after 3 s | 96 dp, `android.camera.error`, Retry button (Mist 52 dp, `app.queue.retry`) | Upload works | Retry rebinds; also rebinds on next `ON_RESUME` |
| Out of quota | plan `used >= included` with `included > 0`, or `NO_CREDITS` returned by append | live preview stays; shutter disabled | [D] shown | Unknown quota is NOT out of quota |
| Queue N drafts | N unaccepted | as Ready | [E] shown, `i/n` when N > 1 | |
| Torch on | torchState ON | | Flash pill brand colour, label `android.camera.flashOn` | |
| Flash unavailable | no flash unit | | Flash pill absent | |
| Shutter flash (fallback) | torch refused twice | | Flash pill brand colour, label `android.camera.flashShutter` | |
| Review expanded | drawer open | alpha 0.4, shutter disabled | | see 03 |
| Importing file | picked file is being decoded or rendered | live preview stays | `android.capture.importing` row | |
| Offline | no network at upload | | | draft `failed`, retry offered, see failure table |

### Failure messages

Every failure ends as a `failed` draft with one mapped message. No raw server
strings, no HTTP codes, no English fallback text in the Indonesian UI. A single
generic message for all failures is a defect (the shipped build did that).
Source of each code is `ApiClient.extract` (HTTP status plus the `error` field of
the JSON body).

| Source | Condition | Wording key | Draft status | Extra action |
|---|---|---|---|---|
| Client | no network (`UnknownHostException`, `ConnectException`, `SocketException`) | `android.error.network` | `failed`, retry offered | Retry |
| Client | timeout (`SocketTimeoutException`, call timeout) | `android.error.timeout` | `failed`, retry offered | Retry |
| Client | user taps Cancel | none | draft deleted, call cancelled | none |
| extract 401 | `DEVICE_REVOKED` | `android.error.device_revoked` | sign out | Back to sign in |
| extract 401 | any other 401 (`INVALID_TOKEN`, expired) | `android.error.session_expired` | `failed` | After one `GET /api/auth/mobile/me` also returns 401, sign out. Do not sign out on the first 401. |
| extract 404 | `MOBILE_API_DISABLED` | `android.error.mobile_disabled` | `failed`, no retry button | Delete only |
| extract 413 | file over 12 MiB after the client already shrank it | `android.error.too_large` | `failed` | Delete only |
| extract 415 | content type not JPEG, PNG or WebP | `android.error.unsupported_type` | `failed` | Delete only. Should not happen, because the client always sends JPEG |
| extract 400 | `No image.` (empty body) | `android.error.extract_failed` | `failed` | Retry |
| extract 422 | `refusal: not_a_receipt` | `android.error.extract_failed` | `failed` | Retry, Delete |
| extract 422 | `refusal: unreadable` | `android.error.extract_failed` | `failed` | Retry, Delete |
| extract 5xx | server error | `android.error.server` | `failed` | Retry |
| Client | picked file cannot be opened or decoded (corrupt, unsupported HEIC on API 26 or 27) | `android.error.image_decode` | `failed`, no upload | Delete only |
| Client | PDF cannot be rendered (password, corrupt) | `app.capture.pdfFailed` (web key, reused) | `failed`, no upload | Delete only |
| Client | picked file type not accepted | `android.error.unsupported_type` | no draft, toast only | none |
| append 402 or `NO_CREDITS` | quota empty | `android.error.no_credits` and [D] | stays `ready` | none |
| append `PLAN_LIMIT` | fair-use cap | `android.plan.limit` | stays `ready` | none |
| append `GOOGLE_RECONSENT` or `GOOGLE_GRANT_REQUIRED` | no usable Google tokens | `android.error.google_reconsent`, plus the grant screen (file 12) | stays `ready`, draft kept | Open grant screen |
| append `NO_SHEET` | no sheet connected | `android.error.no_sheet` plus a Mist 52 dp button `android.error.no_sheet.action` that opens sheet setup (file 06, wording task W-2) | stays `ready` | Open sheet setup |
| append `SCAN_ALREADY_SENT` (409) | the same scan id was already written | none (treated as saved) | draft removed | Saved toast |
| append other | | `android.error.append` | stays `ready` | Retry |

Retry on a failed extract creates a fresh upload of the same prepared JPEG bytes.
Retry on a failed append reuses the same `scanId` (section 5, "Accept and
`scanId`").

## 5. Behaviour, step by step

### Entry and exit

1. Entry is only from Home: the Scan receipt button (56dp) opens this screen.
   It is never the first screen after sign in.
2. System back, and the header wordmark and Home button, return to Home. Back never
   returns to the notification or another app; it always lands on Home. Opening a draft from
   Home (Review) shows this screen with the review sheet over it; closing the
   sheet leaves the user on Capture, back returns to Home.
3. After an accepted receipt is queued, the user stays on Capture to take the next
   one (same as web). Home refreshes when the user returns to it.

### Server target

1. The base URL comes from `BuildConfig.API_BASE_URL`, set from
   `ZIPPP_API_BASE_URL` at build time. The production value is
   `https://www.zippp.link`, never the apex `https://zippp.link`: the apex answers
   a POST with a `308` to `www`, and the HTTP client drops the `Authorization`
   header on a cross-host redirect.
2. Test builds on a phone use the Preview URL (`https://preview.zippp.link`) and
   the Preview bypass header. Build commands are recorded in context section 17.
3. The mobile API is dark in Production until FEAT-110 (blocked on STORY-102).
   Until then a production build gets `404 MOBILE_API_DISABLED` and shows
   `android.error.mobile_disabled`. This is expected, not a bug in the screen.
4. The token in secure storage belongs to one environment. When the build target
   changes, the stored token is rejected and the user signs in again.
5. Debug builds log one line per extract: HTTP status, bytes sent, duration in ms.
   Never the token, never the image, never the response body.

### Open the screen

1. `LaunchedEffect(token)` calls `GET /api/auth/mobile/me`. On success set
   sheet title, sheet id, plan. On `DEVICE_REVOKED` sign out. On any other
   failure keep going; the screen works without the title.
2. Request `CAMERA` if not granted. If denied show the No permission state.
3. Bind once per lifecycle: `Preview` and `ImageCapture` in one `UseCaseGroup`
   with a shared `ViewPort`, back camera, keep the returned `Camera` in state.
   The effect key is `(hasPermission, lifecycleOwner)`, not the `PreviewView`
   instance, and it must not call `unbindAll()` on every recomposition. Failure
   goes to the Camera error state, never to a silent black box.
4. Out-of-quota is computed only from known values:
   `plan != null && plan.included > 0 && plan.used >= plan.included`, or a
   `NO_CREDITS` result from append. A null plan and unknown balance mean
   allowed. This fixes the false "quota exhausted" card seen after relaunch.

### Image pipeline (one place, used by camera and files)

All three inputs end as a JPEG under the same function. Numbers come from the
web unless marked Proposed.

| Input | Max pixels | JPEG quality | Source |
|---|---|---|---|
| Camera frame | 3,000,000 | 72 | web `CAPTURE_MAX_PIXELS`, `CAPTURE_QUALITY` |
| Picked image file | 4,000,000 | 85 | web `prepareImage` defaults |
| PDF page | 4,000,000 | 85 | web `pdfFirstPageToJpeg` defaults |
| Thumbnail | 96 x 96, centre crop | 60 | web `thumbSize`, `toDataURL(.., 0.6)` |

Steps for a camera frame or a picked image:

1. Decode with `ImageDecoder` (API 28+) or `BitmapFactory` (API 26 and 27).
   HEIC and HEIF decode on API 28+; on API 26 and 27 a HEIC file fails with
   `android.error.image_decode`. GIF decodes to its first frame. Any decoded
   format is accepted; the server never sees it, because the output is JPEG.
2. Apply the EXIF orientation so the pixels are upright.
3. Scale by `min(1, sqrt(maxPixels / (width * height)))`, same factor on both axes
   (web `scale`), so a tall receipt keeps its width.
4. Encode JPEG at the quality above. Re-encoding drops EXIF, including GPS. This
   is a Proposed difference from web (web keeps the original bytes of a JPEG that
   is already in budget); it also bakes the rotation into the pixels and matches the
   FEAT-108 intent to strip EXIF.
5. Build the 96 x 96 thumbnail from the same bitmap, no second decode.
6. The result must be at most 12 MiB (`MAX_IMAGE_BYTES`). If it is larger, lower
   the pixel budget by 25% and encode again, up to 3 times, then fail with
   `android.error.too_large` (Proposed; web has no retry loop).

### Take a photo

1. Tap the viewfinder. Ignore if out of quota, starting, or review expanded.
2. Start the 160 ms white blink.
3. `ImageCapture.takePicture` to memory. Run the image pipeline with the camera
   budget (3 MP, q72).
4. Create a local draft with a client id, status `queued`, source `manual`.
   Show it in the strip at once, selected index = newest.
5. The queue runner picks `queued` items (3 at a time), sets `reading`, and
   posts multipart field `image` (`receipt.jpg`, `image/jpeg`) to
   `POST /api/extract` with `Authorization: Bearer`.
6. Success (`ok: true`): build the draft from `receipt`. If `date` is empty,
   fill it with the capture date (local `yyyy-MM-dd`) and set `dateAssumed`
   (web `captureDate`). Keep `scanId` from the response. Status `ready`.
7. Failure: status `failed`, map the code with the failure table. Offer Retry and
   Delete in the review sheet (03). Retry sets `queued`.
8. The first time a draft enters `reading`, the review sheet opens in reading
   state; when the draft lands it minimises after 650 ms (web behaviour) so the
   user can shoot again. Opening the sheet by tap never auto-minimises.

### File upload

1. Tap Upload. Open the system document picker with
   `ActivityResultContracts.OpenMultipleDocuments`, not the photo picker (the photo
   picker cannot return PDFs or spreadsheets). Proposed: up to 10 files per pick.
   The web picks one file; Android may pick several (section 8).
2. MIME filter passed to the picker:

| Accepts | MIME types | Status |
|---|---|---|
| Images | `image/jpeg`, `image/png`, `image/webp`, `image/heic`, `image/heif`, `image/gif` | V1 |
| PDF | `application/pdf` | V1 (page 1 only, as web) |
| Spreadsheet or statement | `text/csv`, `application/vnd.ms-excel`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` | Later, FEAT-121 |

   Until FEAT-121 ships, the picker is created without the spreadsheet types
   (a build flag `IMPORT_ENABLED`, default false). With the flag on, the same
   Upload button offers all three groups; there is no separate button.
3. For each returned `Uri`, take the real type from `ContentResolver.getType`,
   falling back to the file extension (web `isReceiptUpload` also checks the name).
   A type outside the table: toast `android.error.unsupported_type`, no draft.
4. **Image:** run the image pipeline with the file budget (4 MP, q85), then
   continue at step 4 of "Take a photo" with source `manual`. If decode fails,
   create a `failed` draft with `android.error.image_decode`.
5. **PDF (V1):** render page 1 with `PdfRenderer` (API 21+), equal to web
   `pdfFirstPageToJpeg`: read the page size in points, compute
   `scale = clamp(sqrt(4,000,000 / (pageWidth * pageHeight)), 1.25, 2.5)`, create an
   ARGB bitmap of `floor(pageWidth * scale) x floor(pageHeight * scale)`, fill it
   white (PDF pages are transparent), render, encode JPEG q85, then run the
   normal thumbnail step. A password-protected or corrupt PDF raises an exception:
   create a `failed` draft with `app.capture.pdfFailed`. Input size limit for a PDF
   file is 25 MiB (Proposed; the web has no limit, the browser memory is the limit).
6. **PDF, more than one page (Later, Proposed):** render pages 1 to 5 and create
   one draft per page, each with its own `scanId`, titled with the page number in
   the subtitle. Above 5 pages show `android.capture.pdfPages` ("Hanya 5 halaman
   pertama yang dibaca.") once per file. V1 keeps web parity: page 1 only, and the
   draft subtitle does not mention other pages.
7. **Spreadsheet or statement (Later, FEAT-121):** the file is not sent to
   `/api/extract`. Hand the `Uri` to the import flow defined in FEAT-121, which
   returns the same draft objects into the same strip and review sheet. Capture
   shows `android.capture.importing` while the server reads the file. Spreadsheet
   rows never become a photo.
8. Several files in one pick: prepare them one at a time (memory), enqueue each as
   its own draft, at most 3 reads in parallel as above. A bad file does not stop
   the others.

### Timeouts and cancel

The spinner must never run forever.

1. HTTP client for `/api/extract`: connect timeout 10 s, write timeout 30 s, read
   timeout 60 s, whole-call timeout 75 s. The server limit is 60 s
   (`maxDuration = 60`), so the client does not cut off a slow success
   (Proposed numbers).
2. A draft that has been `reading` for 15 s shows the Cancel action on the strip
   and on the review card. Cancel cancels the OkHttp `Call` and deletes the draft.
3. At the call timeout the draft becomes `failed` with `android.error.timeout`.
4. With the network off, the connect failure is immediate: the draft is `failed`
   with `android.error.network` within 5 s, not 30 s.
5. A draft left in `reading` when the process dies is reset to `queued` on the next
   start. (Drafts are lost with the process until FEAT-108 persists them.)

### Accept and `scanId`

Handled by the review sheet (03). Rules owned here:

1. `scanId` is the server id returned by extract, stored on the draft. Android never
   makes up its own scan id (the web sends a client id; mobile must send the server
   one, because `recordScanOwner` binds it to the user).
2. Append sends the draft `scanId`. A draft with no `scanId` cannot be accepted:
   mark it `failed` with `android.error.extract_failed` and offer Retry.
3. Retry of a failed append reuses the same `scanId`. The server spends once per
   `scan:${userId}:${scanId}`; a repeat gets `409 SCAN_ALREADY_SENT`, which is
   treated as saved. Known server edge (context section 11): after a failed append
   the refund removes `bill:idem:scan:${scanId}` without the user id, so a retry can
   hit `409` with no cached result. Until that is fixed, treat `409` as saved and
   refresh Home on return.
4. Accept moves the draft to `sending`, hides it from the queue, and posts append.
   Success removes it, shows the saved toast, and refreshes the plan usage line.

### Sheet pill, notice, sheet picker

Not ported. See section 8.

## 6. Touch targets

- Every tappable element is at least 48 dp tall and at least 48 dp wide, using
  `Modifier.minimumInteractiveComponentSize()` or an explicit `heightIn(48.dp)`.
  There are no hidden hit boxes around smaller visuals on this screen: the Flash
  pill, the Upload text button, the strip arrows and the Cancel action are
  themselves 48 dp. The sheet pill is the only sub-48 element and it is not
  tappable.
- Button heights follow the canonical table in 01 section 3. Open sheet is Outline, 52 dp.
  Muat Ulang and Retry are Mist 52 dp. Bantuan is Outline 52 dp.
- Header Home and gear are 48 x 48 dp (owned by 01; the audit measured 24 dp today).
- Viewfinder is one large target and satisfies the rule by size.
- Gap between two adjacent hit boxes is at least 8 dp.
- The two bottom text links (Space, Pengaturan) are removed, not resized.

## 7. Wording keys

All keys named here exist in `spec/wording.txt` (en and id) after this track's
edit, unless noted. No key on this screen contains kredit, saldo, Rp, `$` or
Top up.

Web keys reused on Android: `app.capture.tapToShoot`, `app.capture.starting`,
`app.capture.tapStart`, `app.capture.frame`, `app.capture.shutter`,
`app.capture.pdfFailed`, `app.review.prev`, `app.review.next`,
`app.review.toReview`, `app.review.reading`, `app.review.openCard`,
`app.review.saved`, `app.review.allDone`, `app.queue.failed`, `app.queue.retry`,
`app.sheets.open`.

Existing Android keys: `android.camera.permission`, `android.camera.allow`,
`android.camera.error`, `android.camera.flashOn`, `android.camera.flashOff`,
`android.error.no_credits`, `android.error.no_credits.refresh`,
`android.error.no_credits.support`, `android.error.extract_failed`,
`android.error.server`, `android.error.device_revoked`,
`android.error.google_reconsent`, `android.error.no_sheet`,
`android.error.append`, `android.plan.limit`.

`android.error.mobile_disabled` already existed ("Aplikasi belum tersedia di server ini. Coba lagi nanti.") and is reused as is.

New Android keys added by this track (en and id in `wording.txt`):

| Key | English | Indonesian |
|---|---|---|
| `android.capture.upload` | Upload a file | Unggah file |
| `android.capture.importing` | Preparing the file... | Menyiapkan file... |
| `android.capture.cancel` | Cancel | Batalkan |
| `android.capture.pdfPages` | Only the first 5 pages are read. | Hanya 5 halaman pertama yang dibaca. |
| `android.camera.flashShutter` | Flash on shot | Flash saat foto |
| `android.error.network` | No connection. Check your internet and try again. | Tidak ada koneksi. Periksa internet Anda lalu coba lagi. |
| `android.error.timeout` | This is taking too long. Try again. | Terlalu lama. Coba lagi. |
| `android.error.session_expired` | Your session has ended. Sign in again. | Sesi Anda berakhir. Masuk lagi. |
| `android.error.too_large` | This file is too large. Use a smaller photo. | File ini terlalu besar. Pakai foto yang lebih kecil. |
| `android.error.unsupported_type` | This file type is not supported. Use a photo or a PDF. | Jenis file ini tidak didukung. Pakai foto atau PDF. |
| `android.error.image_decode` | Could not open this image. Try a JPEG or PNG. | Gambar tidak bisa dibuka. Coba JPEG atau PNG. |

Web keys that must NOT appear on Android (DEC-002): `app.credits.none`
("No credits. Top up..."), `app.topup.title`, `app.credits.pill`,
`app.credits.low`, and `app.review.acceptCost` ("Accept · 1 credit",
"Terima · 1 kredit"). Android uses `android.review.accept` ("Terima").
The web label `app.capture.upload` ("Upload photo or PDF") is not used on Android;
`android.capture.upload` replaces it.

## 8. Android-only differences, allowed

| Difference | Why |
|---|---|
| No credit pill in the header, no credit numbers anywhere | DEC-002, owner call |
| Out-of-quota card has Muat Ulang and Bantuan, not Top up | DEC-002 |
| Accept label `Terima` without "· 1 kredit" | DEC-002 |
| No auto-snap pill, no blur gate, no "Hold steady" line | No detector until FEAT-107 |
| No automatic torch from brightness | Same reason; torch is manual |
| No Manual pill on this screen | FEAT-115 manual entry has no web twin, so it lives on Home (file 07) |
| Sheet pill is read-only, no sheet picker | `/api/sheets/connect` has no bearer path until FEAT-119 |
| No admin notice modal | `/api/notices` has no bearer path |
| Upload accepts images and PDF now, spreadsheets later (FEAT-121) | Owner call 2026-11-05: images, PDF, Excel and CSV |
| Several files per pick (up to 10, Proposed) | Phone pickers handle multi select; web input is single |
| PDF multi-page (Later, Proposed) | Web reads page 1 only |
| Always re-encode and strip EXIF | Privacy and rotation; web keeps in-budget JPEG bytes |
| Flash is a torch via `CameraControl`; fallback to shutter flash | CameraX, not `getUserMedia` |
| 48 dp pills (web is about 28 dp) | Touch accessibility |
| Specific failure messages (network, timeout, too large, mobile disabled) | Web shows the raw `error`; Android never shows raw server text |

## 9. Acceptance checklist

Each item can be checked from a phone screenshot or logcat.

1. Header is visible on the capture screen: wordmark left, Home and gear right,
   no pill, no credit number. Home and gear are 48 x 48 dp. Screenshot.
2. No "Space" or "Pengaturan" text links and no Manual pill under the controls. Screenshot.
3. Viewfinder has a 14 dp rounded corner, ratio 3:4, and the live camera image
   is visible (not black) with the phone held up. Screenshot with the phone held up.
4. Four white 28 dp corner marks at 88% of the viewfinder height, 9:16. Screenshot.
5. Hint pill "Ketuk layar untuk memotret" at the top, black 55% background.
6. **Preview is never a silent black box.** Logcat shows the preview stream reach
   `STREAMING` within 3 s of binding. If it does not, the screen shows the camera
   error text and a Retry button, never an empty black rectangle.
7. **Flash is a torch.** The Flash pill is shown only on a device with a flash
   unit. Tapping it lights the torch within 300 ms and the pill turns orange and
   reads "Flash aktif"; tapping again turns it off and the pill reads "Flash mati".
   `dumpsys media.camera` or the visible light confirms. The pill label always
   equals the real torch state (kill and restart the app with the torch on: it is
   off and the pill reads "Flash mati"). Leaving the screen turns the torch off.
8. **No tappable is under 48 dp.** Every tappable control measures at least
   48 dp x 48 dp: Flash pill, Upload button, strip arrows, Cancel, Retry, header
   Home and gear. Check with Accessibility Scanner or `uiautomator dump` bounds.
   The sheet pill is the only element allowed under 48 dp, and it is not tappable.
9. After a cold start with a stored token and a plan that is not full, the
   out-of-quota card is NOT shown. Screenshot.
10. With a plan at `used >= included`, the card is shown with Muat Ulang and
    Bantuan, no purchase text, and the shutter does nothing.
11. Tap shutter: white blink for about 160 ms, a draft appears in the strip
    immediately with "Membaca...". Logcat shows one `POST /api/extract` with the
    host from `API_BASE_URL`.
12. A good receipt: within 15 s the strip title becomes the merchant, the
    subtitle reads "1 untuk diperiksa", and the sheet minimises by itself.
13. **Camera and gallery send the same pipeline.** Logcat's one-line extract log
    shows a JPEG of at most 3,000,000 pixels for a camera frame, at most 4,000,000
    pixels for a picked image, both under 12 MiB, and a re-encoded file has no EXIF
    GPS tag (`exiftool` on a copy).
14. **Airplane mode** (no network): tap shutter, the draft ends `failed` with
    "Tidak ada koneksi. Periksa internet Anda lalu coba lagi." within 5 s. Retry
    works once the network is back.
15. **Timeout:** with a server that never answers, the Cancel action appears on the
    reading draft after 15 s, and the draft ends `failed` with
    "Terlalu lama. Coba lagi." at 75 s at the latest. The spinner never runs
    forever.
16. **Production build against a dark API:** a build pointed at an environment with
    the mobile API off shows "Aplikasi belum tersedia di server ini. Coba lagi nanti."
    (`android.error.mobile_disabled`), with Delete only and no Retry.
17. A photo of a non-receipt: draft ends `failed` with
    "Gagal membaca struk ini. Coba lagi atau abaikan."
18. **Distinct messages.** With a test server forced to return 401, 413, 415 and 500
    in turn, the four messages differ and none shows a number, a code name or
    English text in the Indonesian UI.
19. Take 3 photos in a row without waiting: three drafts, `1/3` style counter,
    at most 3 concurrent extract requests in logcat.
20. Strip arrows are 48 dp, disabled at the ends at 30% alpha.
21. Open sheet button is 52 dp tall, outline style (1 dp line border), green Sheets icon; tapping
    it opens the Google Sheet. When the queue empties it flashes green 3 times.
22. Toast shows "Tersimpan" (`app.review.saved`) for about 1.8 s after an
    accepted receipt is appended. When the queue empties it shows
    `app.review.allDone` for about 2.6 s. Note: the existing en and id copy of
    `app.review.allDone` contains an em dash, which breaks the project rule; fix
    the copy in `wording.txt` before shipping (wording task W-1).
23. **File upload, image:** pick a 12 MP JPEG from Files: a draft appears, the
    request succeeds, and the uploaded JPEG is at most 4,000,000 pixels. Pick a
    PNG, a WebP and (on API 28+) a HEIC: each becomes a JPEG draft.
24. **File upload, PDF:** pick a one-page receipt PDF: a draft appears with the
    merchant of page 1. Pick a password-protected PDF: a `failed` draft reads
    "PDF tidak terbaca. Coba file lain atau foto." and nothing is uploaded.
25. **File upload, unsupported:** pick a `.docx`: a toast reads "Jenis file ini
    tidak didukung. Pakai foto atau PDF." and no draft is created.
26. **Scan id:** the append request in logcat carries the same `scanId` that
    extract returned. Retrying a failed append reuses it; a `409` removes the draft
    and shows the saved toast.
27. Device revoked (401 with `DEVICE_REVOKED`): the app signs out and shows
    `android.error.device_revoked`. A plain 401 does not sign out until `me` also
    fails.
28. No string on this screen contains "kredit", "saldo", "Rp", "$", or "Top up".

## 10. Open questions

1. ~~What is the Android home screen?~~ Decided 2026-11-05: Home dashboard,
   file 07.
2. ~~Should the Manual pill live here?~~ Decided: no, it lives on Home.
3. ~~PDF upload: rasterise page 1 on Android, or images only?~~ Decided
   2026-11-05: accept images and PDF, plus Excel and CSV later. V1 renders PDF page 1
   like the web.
4. Add bearer support to `/api/sheets/connect` so the sheet pill can switch
   sheets, or keep it read-only? Covered by FEAT-119; the pill stays read-only until
   it ships.
5. PDF with more than one page: render pages 1 to 5 as separate drafts (Proposed,
   Later), or keep page 1 only like the web?
6. Several files per pick, up to 10 (Proposed): accept?
7. Production mobile API: the owner already runs the web app in Production. To scan
   from the phone against Production before STORY-102, `MOBILE_API_ENABLED` and
   `MOBILE_JWT_SECRET` must be set in Production (context section 10 says not
   before STORY-102). Enable them for the owner's own device now, or test on Preview
   only?
8. Spreadsheet import cost rule and row limits are decided in FEAT-121.

## 11. Changes requested in other files

- **00-audit-and-defects.md:** note that gallery and camera numbers differ on the web
  (3 MP q72 versus 4 MP q85); fix item 5 of defect 4 accordingly.
- **01-shell-and-navigation.md:** header Home and gear must be 48 x 48 dp; add the
  new tokens/components `ZipppToolPill` (48 dp) and `Modifier.minTouch()`.
- **03-review-sheet.md:** map `GOOGLE_RECONSENT` and `GOOGLE_GRANT_REQUIRED` to the
  grant screen, show Cancel on a reading card, use `android.error.*` messages from
  the failure table.
- **07-home-dashboard.md:** Home Scan button should show `android.error.mobile_disabled`
  state if the first `me` call returns `MOBILE_API_DISABLED`.
- **08-flows-system-wireframes.md:** only the capture and upload wireframes (done
  here, section 4.7).
- **Context file section 17:** record the exact `ZIPPP_API_BASE_URL` build commands.
