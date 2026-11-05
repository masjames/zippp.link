# Android audit and defects (FEAT-118)

Date: 2026-11-05. Device: Samsung SM-M127F, build `app-sideload-debug.apk` from
`feat/118-android-parity` (package `link.zippp.app.debug`). Read-only audit; no
code changed.

## Summary

| # | Owner report | Root cause | Status |
|---|---|---|---|
| 4 | Scan does not work | The APK points at **production** `https://zippp.link`, where the mobile API is dark. | Confirmed from the build |
| 1 | Main screen is the scan screen | `RootScreen.Camera` is the start screen and Home returns to it. Web does the same (`/app` redirects to `/app/snap`). Needs an owner call. | Confirmed in code |
| 2 | Flash toggle does nothing | It sets `FLASH_MODE_ON` on the still capture only. Nothing lights up while previewing. | Confirmed in code |
| 3 | Buttons too small | Tool pills about 32dp tall, nav links about 28dp, header links about 24dp. Minimum is 48dp. | Confirmed from layout values |
| - | Black viewfinder | Camera is live (two streams configured, captures issued). Cause of the black frame not proven. | Not reproduced |

## Defect 4: scan fails

Reproduced: tapping the viewfinder shows the "Membaca..." spinner. Logcat shows
`Camera2CameraImpl: Issue capture request`, so the camera capture works. The
failure is after it.

Root cause:
- `android/app/build.gradle.kts:18` sets
  `apiBaseUrl = System.getenv("ZIPPP_API_BASE_URL") ?: "https://zippp.link"`.
  The build I ran had no `ZIPPP_API_BASE_URL`. Strings in the built dex contain
  only `https://zippp.link`.
- Context §10 says the Preview test APK was built against
  `https://preview.zippp.link`. This build was not.
- On production the mobile API is off (§10). With a bearer header,
  `src/app/api/extract/route.ts:31-36` returns `404 MOBILE_API_DISABLED`.
- The apex host also redirects: `curl -X POST https://zippp.link/api/extract`
  returns `308` to `https://www.zippp.link/...`. OkHttp drops the
  `Authorization` header on a cross-host redirect, so even a working server
  would see an unauthenticated request.
- The stored token came from an earlier Preview-built install (`install -r` kept
  app data), so it does not belong to production either.
- `ApiClient.me` goes to the same URL, which is why the sheet title and plan
  never loaded on the device.

What the user sees: every failure shows the same line, `error_extract`
("Gagal membaca struk ini. Coba lagi atau abaikan.").
`CameraScreen.kt:154-165` collapses all `ApiException` codes, any non-ok
response and any exception into that one string. Only `DEVICE_REVOKED` is
treated differently (`onSessionLost`, which signs the user out silently).

Fix (words):
1. Build the device APK with `ZIPPP_API_BASE_URL=https://preview.zippp.link` and
   the Preview bypass value. Record the exact build command in context §17.
2. Make `baseUrl` use `https://www.zippp.link` for production so no cross-host
   redirect happens.
3. Map server codes to distinct strings in `extractBytes`: `MOBILE_API_DISABLED`,
   `NO_CREDITS`, `PLAN_LIMIT`, `HTTP_413` (too big), `HTTP_415`, network failure,
   and a timeout. All copy goes through `spec/wording.txt`. Never show raw codes
   (context §8).
4. Add one debug log line per extract (status code, bytes, duration; no token).
5. Downscale or recompress camera JPEGs before upload. The gallery path does
   (`encodeGalleryJpeg`, quality 72, `CameraScreen.kt:658-684`); the camera path
   reads the raw file (`CameraScreen.kt:259-266`). Server limit is 12 MB
   (`route.ts:12`).
6. Treat a 401 on `/api/extract` as session lost only after a second check
   (`me`), not on the first response.

## Defect 1: main screen

Facts:
- `MainActivity.kt` starts at `RootScreen.Camera`. Home in the header goes back to it.
- Web: `src/app/app/page.tsx` renders nothing and `AppShell.tsx:97-99` redirects
  `/app` to `/app/snap` (or `/admin` for admins). The web main screen is also
  capture. The header Home button is hidden on `/app/snap` (`AppShell.tsx:130`).
- So Android matches web today. The owner wants a different main screen.

Decided 2026-11-05: Android opens on a new Home dashboard. See
`01-shell-and-navigation.md` section 6 and `07-home-dashboard.md`.

## Defect 2: flash

- `CameraScreen.kt:229-234` sets `capture.flashMode` to `FLASH_MODE_ON` or
  `FLASH_MODE_OFF` on the `ImageCapture` use case.
- `FLASH_MODE_ON` fires the flash only during `takePicture`. The preview shows no
  change, and the pill only changes its label and colour (`ToolPill`
  `active`). The user reads that as "not working".
- The binding in `CameraScreen.kt:205-226` keeps no `Camera` handle, so torch
  control is unavailable.

Fix (words): keep the `Camera` returned by `bindToLifecycle`. On toggle call
`camera.cameraControl.enableTorch(flashOn)` so the light is on while framing,
and keep `FLASH_MODE_OFF` on the capture (the torch already lights the scene).
Hide the pill when `camera.cameraInfo.hasFlashUnit()` is false. Reset the torch
off when the screen leaves composition or the app stops.

## Defect 3: button sizes

Rule for the spec: every tappable is at least 48dp tall and 48dp wide.
`ZipppButton` is 48dp (`Shell.kt`). Superseded: heights now follow the canonical button table in `01-shell-and-navigation.md` section 3 (56dp Primary and Brand, 52dp Mist, Outline and Danger text).

| Tappable | File:line | Approx size | Verdict |
|---|---|---|---|
| Tool pills (Galeri, Flash, Manual) | `CameraScreen.kt:541-560` | 12sp text, 8dp padding, about 32dp tall | Too small |
| NavLink (Space, Pengaturan) on capture | `CameraScreen.kt:390-401` | 4dp padding, about 28dp tall | Too small |
| Header Home / Settings | `Shell.kt` header rows | 2dp vertical padding, about 24dp tall | Too small |
| Space Edit / Archive text actions | `SpaceScreen.kt:205-220` | 2dp padding, about 20dp tall | Too small |
| Review minimize pill | `ReviewScreen.kt:476-481` | text with small padding | Too small |
| Review prev/next | `ReviewScreen.kt:520` | `size(32.dp)` | Too small |
| Review month/category selects | `ReviewScreen.kt:635` | not measured | Check |
| ZipppButton (all screens) | `Shell.kt` | 48dp | Meets the 48dp floor; must change to the canonical table heights |
| Settings switch | `SettingsScreen.kt` | Material default | OK |
| Sign-in and pairing buttons | `SignInScreen.kt`, `PairingScreen.kt` | not measured | Check |

Fix (words): add one shared `Modifier.minTouch()` (48dp minimum height and
width, centred content) and a `ZipppToolPill` and `ZipppTextAction` component
in `Shell.kt`. Replace each row above. Do not change the visible type size
unless the web screen does.

## Black viewfinder

Facts:
- Camera permission is granted (`dumpsys package`).
- `dumpsys media.camera` lists `link.zippp.app.debug` as an active client with
  two configured streams, and logcat shows capture requests.
- `PreviewView` is created in `CameraScreen.kt:~430` and now uses
  `ImplementationMode.COMPATIBLE`. The frame was still black after that change.
- I could not tell whether the phone was face-down when the screenshots were
  taken, or whether screencap omits the camera surface on this Samsung build.

Next check (owner): look at the phone screen while holding it up. If the live
image shows, this is a screenshot artefact. If it is black on the phone too,
investigate: preview and capture bound with no `ViewPort`, `unbindAll()` run on
every `previewView` change, and the `LaunchedEffect(hasPermission, previewView)`
key.

## Credits and plan state (already fixed)

- `MainActivity` held `credits` as `Int = 0`. After a relaunch it stayed 0 and
  the capture screen showed "quota exhausted".
- Fix applied: `credits` is `Int?`; out-of-quota comes from `me.plan`
  (`used >= included`) first, then from a known balance.
- The `me` payload has no `credits`, by decision (owner: no credit numbers).

## Screen table

| Screen | Web equivalent | On Android | Matches web | Gap |
|---|---|---|---|---|
| Sign-in | landing sign-in, magic link | `SignInScreen.kt` | No | Not restyled with the shell tokens |
| Pairing | `PairDeviceModal.tsx` | `PairingScreen.kt` | No | Legacy, not restyled |
| Header | `AppShell.tsx` (Home, pill, Settings) | `Shell.kt` `ZipppHeader` | Partly | Pill removed by owner. Targets too small |
| Capture | `SnapScreen.tsx` | `CameraScreen.kt` | Partly | Flash, button sizes, scan wiring, black preview, no auto-snap |
| Review | `ConfirmCard` in `SnapScreen.tsx` | `ReviewScreen.kt` bottom sheet | Partly | Not run on device. Touch targets |
| Manual entry | none (web has no manual page) | `ManualEntryScreen.kt` | n/a | Not restyled |
| Settings | `app/settings/page.tsx` | `SettingsScreen.kt` | Partly | Android shows balance/quota, capture toggle, sign out only |
| Space | `app/settings/space/page.tsx` | `SpaceScreen.kt` | Partly | Not run on device |
| Sheet picker | `app/settings/sheet` | none | No | Not on Android |
| Top-up | `app/topup` | none | n/a | Out of scope (DEC-002) |
| Main/home | `/app` redirects to capture | capture | Yes | Owner wants a different main screen |

## Not reproduced

- The black viewfinder (see above).
- The exact error path on the phone after the extract call. Logcat has no app log
  lines, because the app logs none. I inferred the response from the build URL and
  from probing the public endpoints without credentials.
- I did not reinstall, sign out or change app data.
