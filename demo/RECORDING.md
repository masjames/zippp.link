# Record the Google verification demo

One recording, about 5 minutes, no editing. Google wants to see the real app
with a real Google account, so this is a live walkthrough, not a slideshow.

## Before you start

Do these first. They prevent 90% of the mistakes.

- [ ] Use a Google account that **has credits**. After sign-in, look at the
      credit pill. If it shows 0, stop. Ask for a grant first.
- [ ] Have two receipt photos ready (JPG, PNG, or PDF). One is enough, two is
      safer if the first read fails.
- [ ] In zippp: Settings, scroll down, **Sign out**. Stay signed in to Google
      itself. The demo needs to show the consent screen, which only appears when
      zippp is signed out.
- [ ] Close other tabs. Hide the bookmarks bar (Cmd+Shift+B).
- [ ] Turn on Do Not Disturb (Control Center). No notifications in the video.
- [ ] Make the Chrome window large but not full screen. About 1440 wide is good.

## Pick one way to record

**A. The built-in recorder (cleanest).** In a terminal:

```
npm run demo:live
```

A Chrome window opens and starts recording immediately. It records the page
only, no toolbar, and it forces English. Do the steps below, then close the
window. The MP4 is written to `demo/out/zippp-google-verification-demo.mp4`.

The recorder keeps the Google session in a dedicated Chrome profile, and clears
only the zippp session on each start. That means the consent screen appears every
time, and after the first sign-in no password is shown again. The first run does
ask for the password; either complete it quickly or run it once to warm the
profile, close, and run again.

**B. QuickTime.** Open QuickTime, File, New Screen Recording, click the arrow
next to the record button and choose the Chrome window, then Start. Record the
same steps. This captures the toolbar too, which is fine, but makes the file
bigger and noisier.

If you narrate live, a microphone is good. If not, captions are not needed:
Google's reviewers read the flow, and the narration script below is optional.
Text captions are optional but help.

## The steps

Move slowly. Pause about two seconds after every click. Total target: 5 minutes.

### 1. Landing page (15 seconds)

Do nothing for a moment. The camera card animates. Then move the mouse slowly to
"Sign in with Google".

**Say:** "zippp turns a receipt photo into rows in the user's Google Sheet. I
will show each permission in use."

### 2. Sign in and consent (1 minute)

Click "Sign in with Google". Pick the account you are already signed in with.

On the consent screen:

1. If you see **Show all services**, click it. All three scopes must be readable.
2. Pause. Let the reviewer read the scopes.
3. Click Allow.

**Say:** "Spreadsheets lets zippp read the header row and write accepted rows.
Drive file lets it find or create its own spreadsheet. Email identifies the
account."

If Google asks for a password or 2FA, complete it. The field is masked. If it
says "This browser or app may not be secure", stop, and record with QuickTime in
your normal Chrome instead.

### 3. Connect a sheet (1 minute)

You land on Snap. Open the gear, then Settings, then Sheet.

- If zippp finds the old `[zippp]` sheet, show the list briefly, then pick it.
- If there is no sheet, choose "Create a new sheet", pick the "Purchasing and
  inventory" template, and confirm.

If the app opens Google Sheets after connecting, press Back to return to zippp.

**Say:** "This lookup is the Drive file permission. zippp sees only the sheet it
creates or the user picks. It cannot see any other file."

### 4. One receipt (2 minutes)

Go to Snap. Click **Upload** and choose the receipt. Ignore the camera prompt if
one appears.

Wait for the card. Then:

1. Pause on the card so the values are readable.
2. Change one field, for example one line amount or the total, then tap outside
   the field. This shows the check step.
3. Click **Accept**.
4. If a "donate this photo" offer appears, click No.

**Say:** "I check what was read, correct one field, and press Accept. Accept
writes the row and spends one credit."

### 5. Show the sheet (1 minute)

After Accept, the **Open Google Sheets** link appears at the bottom. Click it.
It opens in the same tab.

1. Let the sheet load.
2. Show the header row and the new rows.
3. Scroll once, slowly.
4. Press Back to return to zippp.

**Say:** "This is the user's own Google Sheet. The new rows are here. zippp wrote
them and does not read the data rows."

### 6. The AI boundary (30 seconds)

Back on Snap, find the collapsed **Debug** panel under the last card. It says
"Debug" and a provider name. Click it to expand. Hold for a few seconds so the
OCR text and the payload are visible.

**Say:** "The extraction request carries the photo only. The AI step receives
that photo or the text read from it. No Google account data, no sheet id, no
sheet contents, and no Drive file is ever sent with it."

Collapse it again.

### 7. Account and sign out (30 seconds)

Open Settings. Show the account email and the credit balance. Scroll to
**Sign out** and hover it.

**Say:** "Signing out deletes the stored token and the sheet setup from zippp's
servers. The user can also remove access in their Google account. The sheet stays
theirs."

**Do not click Sign out.**

### 8. Stop

- Recorder A: close the Chrome window. Wait for "OK" in the terminal.
- QuickTime: click the stop button in the menu bar, then File, Save.

## After recording

1. If you used QuickTime, upload the file to YouTube as **Unlisted**. The link
   must open without signing in.
2. Send me the link. I will put it in the reply email.
3. If you used the built-in recorder, the file is already
   `demo/out/zippp-google-verification-demo.mp4`. Upload that one.

## Problems

| What happened | What to do |
|---|---|
| Credit pill shows 0 | Stop. Ask for a credit grant, then record again. |
| "Could not read" on the card | Click Delete, upload the second receipt. |
| Google blocks sign-in | Stop. Record with QuickTime in your normal Chrome. |
| Sheet does not open | Go to Settings, Sheet, and use "Open in Google Sheets". |
| You made a small mistake | Keep going. A small detour is fine. |
| You made a big mistake | Close and start again. The recorder keeps you signed in to Google. |

## What not to show

- Your Google password or 2FA codes. Complete them fast, or record with the
  built-in recorder after a first sign-in so no password appears.
- Other tabs, other apps, notifications.
- The Sign out button being pressed.
- Any claim about photo proof. That feature is not built yet.
