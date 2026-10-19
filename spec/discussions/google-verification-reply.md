# Google OAuth verification, reply package (19 Oct 2026)

Project: `gen-lang-client-0039747683` (number 216680827750).
Letter: Third-Party Data Safety Team, three findings.

1. Privacy policy does not state how the app uses Google user data.
2. Privacy policy does not state sharing, transfer, or disclosure.
3. Privacy policy does not state data protection mechanisms.
4. Demo video does not justify `spreadsheets` and does not show the write in
   the user's Google account.
5. The app integrates with DeepSeek, which conflicts with Limited Use.

Decision: **Option 2, keep DeepSeek, prove segregation.** The photo path and
the Google data path are disjoint in code, so no re-architecture is needed.
Evidence is the privacy page, `spec/ARCHITECTURE.md` "Data flow", and the guard
test `src/lib/data-boundary.test.ts`.

## What changed in the product

- Privacy page (`/privacy`, `/id/privasi`) rewritten EN + ID with sections for
  Google user data, use per scope, sharing, protection, and the Limited Use
  sentence. Stale facts corrected: Upstash instead of Blob, Kasera QRIS plus
  manual GoPay instead of DOKU, donation photos go to the operator's Drive.
- PostHog autocapture and session recording are off, so the page can truthfully
  say receipt values are not sent to analytics.
- OAuth access tokens are now encrypted at rest, like the refresh token.
- A token refresh no longer drops the stored account email.
- `src/lib/data-boundary.test.ts` fails the build if the photo path imports a
  Google module, if `/api/extract` reads a second form field, or if the append
  route imports an AI module.

## Before resubmitting

- Deployed 19 Oct 2026. Open `/privacy` on www.zippp.link in a logged-out
  browser and confirm the new sections render.
- In Cloud Console, confirm the consent screen lists exactly
  `.../auth/spreadsheets`, `.../auth/drive.file`, `.../auth/userinfo.email`,
  and that "App homepage" and "Privacy policy" point at `https://www.zippp.link`
  and `https://www.zippp.link/privacy`.
- Do not add or remove scopes for this round. Publishing status stays
  "In Production".
- Record the video on the live app with a real Google account that owns a test
  sheet.

## Console and email checklist

Cloud Console, then the reply. Do both in this order, because the reviewer
checks the console state against what the email claims.

1. APIs and Services, then OAuth consent screen: App homepage
   `https://www.zippp.link`, Privacy policy
   `https://www.zippp.link/privacy`, authorized domain `zippp.link`.
2. Verification Center (or the pending request): replace the demo video link and
   the privacy policy link. Paste the scope justification below if the form asks
   for it.
3. Reply in the same thread, from the account on the project, subject unchanged.
   No attachments, links only.

Scope justification to paste if asked:

```
spreadsheets: read the header row of the one sheet the user connects, and write
one row per accepted receipt line. zippp never reads data rows.
drive.file: find or create the [zippp] spreadsheet by name, so the user does not
paste a link. Only files created by this app or picked by the user are visible.
userinfo.email: identify the account, keep sessions separate, send account
emails the user asks for, and check admin access on the server.
```

What the reply must contain, and nothing more:

- Which option: Option 2, keep the AI provider, complete data segregation.
- The three privacy sections, with the live URL, named by heading.
- One short paragraph on how segregation works, in terms the reviewer can test:
  the AI step gets one camera photo and nothing else; no Google token, sheet id,
  sheets rows, or Drive file; the read path does not load a Google token; plus
  the automated test and the analytics and encryption changes.
- The new video link, unlisted but viewable without sign-in.
- Confirmation that the requested scopes are unchanged and match the console.
- A closing offer to demonstrate any single scope separately.

Do not include pricing, COGS, model comparisons, or an argument about Baidu. The
reviewer asked one question, answer that question.

## Narration script

Read this while recording. Short sentences, no filler.

1. "zippp turns a receipt photo into rows in the user's Google Sheet. I will show
   each permission in use."
2. "This is the consent screen. I am clicking Show all services so every scope
   is visible. Spreadsheets lets zippp read the header row and write accepted
   rows. Drive file lets it find or create its own spreadsheet. Email identifies
   the account."
3. "Here zippp finds the sheet it created earlier. That lookup is the Drive file
   permission. zippp cannot see any other file in this Drive."
4. "Now I create a new sheet from a template. zippp creates the file, and here it
   is in Google Drive."
5. "I photograph one receipt, check what was read, correct one field, and press
   Accept. Accept writes the row and spends one credit."
6. "This is the user's own Google Sheet. The header row and the new rows are
   here. zippp wrote them and does not read the data rows."
7. "This is the account email zippp uses for the session and the credits."
8. "The extraction request carries the photo only. The photo goes to the OCR and
   structuring providers. No Google account data, no sheet id, no sheet
   contents, and no Drive file is ever sent with it. The read code path never
   loads the Google token."
9. "Signing out deletes the stored token and the sheet setup from zippp's
   servers. The user can also remove access in their Google account. The sheet
   stays theirs."

## Demo video shot list

Record 1080p, one take, English narration, no cuts inside the consent screen.
Duration target 4 to 6 minutes.

1. **Intro (15s).** Say what zippp does: receipt photo in, rows in the user's
   Google Sheet. Name the three scopes and what each one powers.
2. **Consent screen, expanded (45s).** Sign in from the landing. On the consent
   screen click "Show all services" so every scope is readable. Pause on each
   line and say what it is for:
   - `spreadsheets`: write the rows the user accepts and read the header row.
   - `drive.file`: find or create the `[zippp]` spreadsheet. Only files this app
     created or the user picked.
   - `userinfo.email`: identify the account and decide admin access.
   Grant access.
3. **drive.file, finding the sheet (45s).** Open `/app/settings/sheet`. Show the
   app listing the existing `[zippp]` sheet by name and choosing it. Say that
   this lookup is the Drive file permission and that zippp cannot see any other
   file.
4. **drive.file, creating the sheet (45s).** Disconnect or pick "Create a new
   sheet", choose the Purchasing and inventory template, and let zippp create
   it. Switch to Google Drive in a second window and show the new spreadsheet
   there with the app as the creator.
5. **spreadsheets, the write (90s).** Back in zippp, open Snap. Photograph one
   receipt. Show the extracted card, edit one field to prove the check step,
   press Accept.
6. **Source account impact (45s).** Switch to the Google Sheet tab and refresh.
   Show the header row and the new data rows that appeared from the Accept.
   Scroll to show the values match the card. Say that zippp wrote only this and
   never reads the data rows.
7. **userinfo.email (30s).** Open Settings and show the signed-in account email
   used for the credit balance and the sheet connection.
8. **AI boundary (45s).** Show that the extraction request carries only the
   photo: on the Snap screen, open the debug panel for the scan and show the
   pipeline steps (OCR, structuring, fallback). Say plainly: the photo is sent
   to PaddleOCR, DeepSeek, or Gemini as fallback; no Google account data, no
   sheet id, no sheet contents, and no Drive file is ever sent to them; the read
   path never loads the Google token.
9. **Deletion (30s).** Open Settings, show Sign out, and say that it deletes the
   stored token and sheet setup from the server at once. Mention that Google
   access can also be removed at myaccount.google.com/permissions. Do not show
   the sheet being deleted: it belongs to the user.

If any step needs a second account, use a fresh Google account with no other
files so the Drive demo stays short.

## Reply email

Final text: `google-verification-email.txt` in this folder. Video:
https://youtu.be/uUestW2elyY (unlisted, 3:05, regular video, not a Short).
Send from the account that owns the project, in the same thread, subject
unchanged. Replace `<NAME>` only. Update the Cloud Console request first.

## Follow-ups and risks

- PaddleOCR (Baidu) is the same class of provider as DeepSeek. If the reviewer
  applies the same rule to it, the options are Gemini vision only (about Rp 29
  per scan) or a provider with no-training terms. Segregation already covers
  Google user data, so this is a vendor risk, not a compliance failure.
- Sign out deletes tokens but does not call Google's revoke endpoint, because
  the donation refresh token is a copy of the operator's grant. Moving donations
  to `DONATION_GOOGLE_REFRESH_TOKEN` with a separate account would allow real
  revocation on sign out.
- The photo proof feature (Drive upload of the receipt JPEG) is specified but not
  built. Do not claim it in the video or in the reply.
