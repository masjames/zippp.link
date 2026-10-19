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

- Deploy, then open `/privacy` on www.zippp.link in a logged-out browser and
  confirm the new sections render.
- In Cloud Console, confirm the consent screen lists exactly
  `.../auth/spreadsheets`, `.../auth/drive.file`, `.../auth/userinfo.email`,
  and that "App homepage" and "Privacy policy" point at `https://www.zippp.link`
  and `https://www.zippp.link/privacy`.
- Do not add or remove scopes for this round. Publishing status stays
  "In Production".
- Record the video on the live app with a real Google account that owns a test
  sheet.

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

Subject: Re: [Action Needed] OAuth Verification Request Acknowledgement

Hello Third-Party Data Safety Team,

Thank you for the review. We have addressed every item. We are taking
Option 2 for the AI integration: complete data segregation, with no Google user
data ever sent to DeepSeek or to any other AI provider.

1. Privacy policy. Rewritten at https://www.zippp.link/privacy (Indonesian:
   https://www.zippp.link/id/privasi). It now has explicit sections for:
   - how zippp uses Google user data, listed per scope,
   - with whom data is shared or disclosed, with each processor and its purpose,
   - the data protection mechanisms, including TLS, AES-256-GCM encryption of
     OAuth tokens at rest with a server-only key, least privilege scopes, and
     server-side admin checks,
   - the Google API Services User Data Policy Limited Use statement.

2. Data segregation for the AI provider. zippp reads a receipt photo the user
   takes with the camera. That photo is not Google user data. The AI step
   receives only that one image (or text read from it) and nothing else. It
   never receives the user's Google account data, spreadsheet id, sheet
   contents, or Drive files, and the extraction code path does not load a
   Google token at all. We added an automated test to the build that fails if
   the photo path ever imports a Google data module, if the extraction endpoint
   accepts any field besides the image, or if the sheet endpoint imports an AI
   module. We have also turned off analytics autocapture and session recording,
   and we now encrypt OAuth access tokens at rest in addition to refresh
   tokens.

3. Demo video. New recording: <VIDEO_URL>. It shows the consent screen with all
   services expanded, then each scope in use: Drive file lookup and creation of
   the `[zippp]` spreadsheet, the write of accepted rows, and the account email.
   It shows the new rows in the user's own Google Sheet after the write, and it
   shows the extraction request carrying only the photo.

No scopes were added or removed for this submission. The consent screen
requests `https://www.googleapis.com/auth/spreadsheets`,
`https://www.googleapis.com/auth/drive.file`, and
`https://www.googleapis.com/auth/userinfo.email`, matching the Cloud Console
configuration.

Please let us know if you need a shorter demonstration of any single scope.

Sincerely,
<NAME>
zippp

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
