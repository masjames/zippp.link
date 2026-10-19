# Record the demo with the Mac recorder

One take, about 5 minutes, no editing. I add the captions afterwards.

You need: a Mac, Chrome, a Google account with credits, one receipt photo (or a
paper receipt), and 10 quiet minutes.

---

## 1. Prepare, before you record

Do all of this first. It is what makes the take work on the first try.

- [ ] **Check credits.** Open zippp, sign in if needed, look at the credit pill.
      It must show more than 0. If it shows 0, stop and ask me for a grant.
- [ ] **Sign out of zippp.** Settings, scroll to the bottom, Sign out.
      Stay signed in to Google itself. Do not sign out of Google.
      Why: the consent screen only appears when zippp is signed out.
- [ ] **Put the receipt on the Desktop.** A JPG or PDF. Name it `receipt.jpg`.
      Keep a second one nearby in case the first read fails.
- [ ] **Clean the browser.** Close every tab except the zippp landing page.
      Hide the bookmarks bar: Cmd+Shift+B. Reset zoom: Cmd+0.
- [ ] **Silence the Mac.** Control Center, Do Not Disturb on. No notifications.
- [ ] **Window size.** One Chrome window, not full screen. Leave the Dock and the
      menu bar visible. About 1440 pixels wide is good.
- [ ] **Scroll to the top** of the landing page. The take starts there.

---

## 2. Start recording, 30 seconds

1. Press **Cmd + Shift + 5**. The screenshot toolbar appears.
2. In the toolbar, choose **Record Selected Portion**.
3. Drag a rectangle tight around the **Chrome window**. Leave out the menu bar,
   the Dock, and the desktop.
4. Click **Options** and set:
   - **Microphone: None** (captions carry the words)
   - **Show Mouse Clicks: on** (so the reviewer sees every click)
   - **Timer: None**
   - **Save to: Desktop**
5. Click **Record**.
6. Click once inside the Chrome window so it has focus.

A stop button appears in the menu bar. Leave it alone until the end.

---

## 3. The eight scenes

Move slowly. After every click, count one, two in your head before the next one.
Total target: 5 minutes.

### Scene 1. Landing page (15 seconds)

Do nothing. Let the camera card animate once. Then move the mouse slowly toward
the sign-in button.

> **Caption:** Receipt photos become rows in your Google Sheet.

### Scene 2. Sign in and consent (60 seconds)

Click **Sign in with Google**. Pick your account.

The Google consent screen appears. This is the most important shot.

1. Click **Show all services** if it is there. The three permissions must be
   readable.
2. Hold still for 4 seconds. Let the reviewer read them.
3. Click **Allow**.

> **Caption:** Spreadsheets: write accepted rows. Drive file: only the sheet
> zippp creates. Email: identify the account.

If Google asks for a password, type it. The field shows dots only. If Google
says "This browser or app may not be secure", stop the recording and tell me.

### Scene 3. Connect the sheet (60 seconds)

You land on Snap. Click the **gear** in the header, then **Settings**, then
**Sheet**.

- If zippp lists an old `[zippp]` sheet, look at the list for 3 seconds, then
  click it.
- If it does not, click **Create a new sheet**, choose **Purchasing and
  inventory**, and confirm.

If Google Sheets opens by itself, press **Back** to return to zippp.

> **Caption:** Drive file permission: zippp finds only its own sheet, not the
> rest of your Drive.

### Scene 4. One receipt (120 seconds)

Click **Snap**, then the **Upload** link. Choose `receipt.jpg` from the Desktop.
Ignore the camera prompt if it appears.

Wait for the card. Then:

1. Hold still on the card for 4 seconds so the values are readable.
2. Change one field (for example one line amount), then click outside the field.
3. Hold 2 seconds.
4. Click **Accept**.
5. If a "donate this photo" offer appears, click **No**.

> **Caption:** One receipt. Check the card, fix one field, Accept.

### Scene 5. Show the sheet (60 seconds)

After Accept, an **Open Google Sheets** link appears at the bottom. Click it.

1. Wait for the sheet to load.
2. Show the header row and the new rows: move the mouse over them slowly.
3. Scroll once, slowly, to show the days and totals.
4. Press **Back** to return to zippp.

> **Caption:** The row is in the user's own Google Sheet. zippp wrote it and never
> reads your rows.

### Scene 6. The AI boundary (30 seconds)

Back on Snap, find the collapsed **Debug** panel under the last card. It says
"Debug" and a provider name. Click it to open. Hold 4 seconds so the OCR text and
the payload are visible. Click it again to close.

> **Caption:** The AI step receives the photo only. No Google data, no sheet id,
> no Drive file.

### Scene 7. Account and sign out (30 seconds)

Open **Settings**. Show:

1. The account email.
2. The credit balance.
3. Scroll to **Sign out** and hover it. Do not click it.

> **Caption:** Sign out deletes the stored token and sheet setup. The sheet stays
> yours.

### Scene 8. Stop

1. Click the **stop button** in the menu bar.
2. The file saves to the Desktop as `Screen Recording ....mov`.
3. Wait for the thumbnail to appear, then tell me the file name.

---

## 4. What I do next

1. I trim the dead start and end and normalize to 1080p MP4.
2. I add the captions above, timed to your clicks.
3. I send you three still frames to approve.
4. You upload the MP4 to YouTube as **Unlisted** and send me the link.

You do not need any editing app.

---

## 5. If something goes wrong

| Problem | Fix |
|---|---|
| Credit pill shows 0 | Stop. Ask me for a grant. Record again. |
| "Could not read" on the card | Click Delete, then Upload the second receipt. |
| Google blocks the sign-in | Stop. Tell me. We use a different approach. |
| The sheet does not open | Settings, Sheet, then the Open in Google Sheets link. |
| You clicked something wrong | Keep going if it is small. A small detour is fine. |
| The take is broken | Stop and start again. You will already be signed in to Google. |

## 6. Do not

- Do not type a password while the recorder is on if you can avoid it. Sign in to
  Google before you start, so only the account picker and consent appear.
- Do not open other tabs or switch apps. The mouse can leave the rectangle, but
  keep it inside.
- Do not press Sign out at the end. Show it, hover it, stop.
- Do not claim photo proof. That feature is not built.

---

# Take 2: fix the consent screen

Only needed if the consent take did not show all scopes expanded in one view.
Costs about 3 minutes. The rest of a good take is reused, so you do not need to
record the receipt again.

## Why

Google rejected the previous video for one reason: the permission screen did not
show every requested scope fully expanded and readable. A take that clicks into
one scope's detail modal, while another scope stays on the page behind it, reads
as incomplete. Revoking access first also removes the old `profile` grant, which
otherwise appears as a fourth scope and breaks scope matching.

## Steps

1. In zippp: Settings, scroll down, **Keluar** (sign out).
2. Open `https://myaccount.google.com/permissions`, find zippp, **Remove access**.
   This is the step that makes the next consent a first-time grant.
3. Clean up: one Chrome tab on the landing page, bookmarks hidden, Do Not
   Disturb on, zoom Cmd+0.
4. Start the recorder: Cmd+Shift+5, Record Selected Portion, tight around Chrome,
   Options (Microphone None, Show Mouse Clicks on, Save to Desktop), Record.
5. Landing page, 3 seconds. Click **Sign in with Google**. Pick the account.
6. The consent screen appears. Without clicking anything else, first click the
   blue box **"Lihat N layanan yang dapat diakses oleh zippp"** (Show all
   services). Expand every service in the list so all scopes are readable, then
   scroll slowly through them. Hold 5 seconds.
7. Close the list, hold the main page 3 seconds, then click **Lanjutkan**
   (Continue / Allow).
8. App loads. Gear, Settings, Sheet, pick the existing `[zippp]` sheet so the
   Drive lookup is visible. Return to Snap.
9. Stop the recording. Save to the Desktop and tell me the file name.

The new file only needs to reach the Snap screen. I splice it in front of the
receipt, sheet, debug, and sign-out scenes from the first take.

## What I look for in the new file

- All three scopes in one list, readable: `spreadsheets`, `drive.file`,
  `userinfo.email`.
- No fourth scope such as profile. If profile still appears after revoking,
  stop and tell me. That would be a code bug, not a recording problem.
- No password typing. You are already signed in to Google.
