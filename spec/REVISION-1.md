# zippp revision 1 — capture + batch review (from user feedback)

Status: **IMPLEMENTED** (shipped).
Supersedes the capture/check/sent parts of `USER-FLOW.md`. Owns: `USER-FLOW.md`,
`SPEC.md`, `wording.md`.

Source: real user feedback.
1. auto-snap (on by default)
2. blur detection that **blocks**
3. one screen for snap + review, **batch review**
4. per-item **Accept** / **Edit**
5. make editable regions *look* editable
6. survives a refresh
7. charge on success
8. mobile: ship as an installable **PWA** for now; native (Capacitor, maybe
   Flutter) later

---

## 1. Flow (replaces `/app/check/[id]` and `/app/sent`)

One screen, `/app/snap`, holds both capture and review.

```
camera (auto-snap on) → item queued → extract → review card → Accept
   → that row is appended to Google Sheets right away → next card, or camera
```

- Admin, Settings, Top-up, Sheet stay separate routes.
- Remove `/app/check/[id]` and `/app/sent`. `/app` → `/app/snap` (admins →
  `/admin`, unchanged).

## 2. Capture

- **The viewfinder is the shutter.** There is no separate capture button; a tap
  on the preview takes a photo (and starts the camera on the first tap). A short
  hint under the frame says so.
- **Auto-snap ON by default.** When the detector sees a receipt in frame, sharp,
  and steady, the shutter fires; one shot per receipt, then re-arms (cooldown +
  the receipt must leave the frame). A tap always works too. A preference to turn
  auto-snap off is saved.
- **Blur hard-blocks capture.** Blur = variance of Laplacian over the detected
  box. While blurry: auto-snap does not fire, a tap refuses, and the viewfinder
  shows "Blurry. Hold steady." The captured frame is re-checked before it is
  stored; a blurry frame never enters the batch. No override.
- **Fast path.** The camera opens with soft constraints (1920 ideal, not 4K). A
  capture is grabbed straight from the preview into a ~4 MP canvas and encoded
  once (JPEG 0.85); the stored blob and the thumbnail come from one decode
  (`prepareImage`). The detector reuses its buffers and only pushes state when
  sharp/steady/brightness change, so the screen does not re-render ~12x/second.

## 3. Review (one page, accordion)

- Every captured receipt is a card in a vertical list on the same screen.
- **Only one card is expanded** (the current one); the others are collapsed to a
  thumbnail + one-line summary. **Accepted cards are hidden.**
- The expanded card shows the extracted data as an **editable form**
  (merchant, date, subtotal, tax, total, line items: description, qty,
  unit price, amount) with two actions:
  - **Accept** — confirms as-is (or after an edit), hides the card, opens the next
    unaccepted receipt.
  - **Edit** — reveals the fields inline; editing does not accept; the user taps
    Accept when done.
- The **Accept / Delete** row is a fixed footer inside the card. Accept is never
  blocked by verification flags: every field is editable, and the verifier's
  flags stay server-side for telemetry only.
- **Accept writes the row.** Accepting a card appends that check to the sheet at
  once (1 credit per successful append) and hides the card. The next unaccepted
  card opens. There is no separate send step and no success screen.
- The card header shows how many checks are still to review. **Capture more**
  restarts the camera.
- A bottom **Open Google Sheets** link (green Sheets mark) opens the connected
  sheet at any time.

## 4. Send on accept

- Accepting a check appends it to the sheet immediately, spending 1 credit on
  success (the server refunds on failure). Sends run one at a time so the rows
  keep their order.
- Per-item status: `sending` then removed on success, or `ready` (kept for retry
  with the error shown). A failure never blocks the others.
- When the batch empties, the camera comes back so the next receipt can be
  captured without an extra tap.

## 5. Survives a refresh

The whole batch is persisted in **IndexedDB** (per device) and restored on reload:

```
DB: zippp
  store items (keyPath id):
    id, createdAt,
    blob            // downscaled image (Blob)
    thumb           // ~96px data URL
    status          // queued|reading|ready|failed|accepted|sending|sent
    receipt?        // raw extraction
    draft?          // edited form values
    debug?          // extraction trace
    error?          // last failure
    sentRows?       // rows written on success
  store meta:
    { key: "ui", openId, updatedAt }
```

On reload: restore the list and `openId`; any item left in `reading` is re-queued;
items in `sending` are treated as `ready` (retryable).

## 6. Make editable look editable (proposal)

Problem (confirmed in code): merchant, line descriptions, and total use
`bg-transparent` with no border, so they read as static text, while date/staff/
outlet/qty/amount have borders. Mixed signals.

Proposal — one consistent treatment for **every** editable value:
- Filled input: `rounded-xl border-2 border-line bg-surface px-3 py-2`, brand
  border on focus. Text/heading inputs get the same box (merchant as a bordered
  bold field, not a bare heading; total as a bordered bold right-aligned field).
- A small **pencil icon** in the card header next to "Edit", and the hint
  "Tap a value to edit" once, so the affordance is explicit.
- Every line item is a bordered field (description included).

## 7. Routes and files

Routes: `/app/snap` (capture + review). Remove `/app/check/[id]`, `/app/sent`.
Keep `/app/start`, `/app/topup`, `/app/topup/order/[id]`, `/app/settings`,
`/app/settings/sheet`, `/admin`.

Files (implementation): `src/lib/batch-db.ts` (IndexedDB),
`src/components/app/screens/CaptureScreen.tsx` (auto-snap, blur block),
`src/components/app/BatchReview.tsx` + `ReviewCard.tsx`,
`useReceiptDetector.ts` (expose blur score), `AppProvider` (batch state, persisted),
`/app/snap/page.tsx`, delete the two routes, `wording.md`, `USER-FLOW.md`,
`SPEC.md`.

## 8. Wording (new keys, EN + ID)

`app.capture.autoSnap`, `app.capture.holdSteady` ("Blurry. Hold steady."),
`app.review.title`, `app.review.progress` ("{done} of {total} accepted"),
`app.review.accept`, `app.review.edit`, `app.review.tapToEdit` ("Tap a value to
edit"), `app.review.sendAll` ("Send all accepted"), `app.review.sentSummary`
("{sent} of {total} sent"), `app.review.retry`, `app.review.sent`.
Remove the now-unused `app.check.*`/`app.sent.*` keys that no longer render.

## 9. Mobile

Ship as an **installable PWA** now (web manifest, app icon, standalone display,
offline batch via IndexedDB). Native later via Capacitor (reuses this code) or
Flutter — with the note that in-app digital purchases on iOS/Android must use
Apple IAP / Google Play Billing (15–30%); Apple Pay / Google Pay cannot be used
for the subscription. Web Paddle/GoPay remain the web channels.

## 10. Acceptance criteria (done when)

- A steady, sharp, in-frame receipt is captured **without tapping**.
- A blurry frame **cannot** be captured; the hint shows.
- Several receipts appear as cards; only one is expanded; accepted cards hide;
  accepting opens the next; after the last, **Send all accepted** appears.
- Reloading mid-review restores the batch and the open card.
- Send all appends sequentially; each success spends 1 credit; a failure stays for
  retry.
- After the batch a success screen shows Open the sheet + Scan more.
- Merchant / line / total fields are visibly editable.
- `npm run build` and `npx tsc --noEmit` pass.

## 11. Resolved

- The per-item **Debug** panel stays, inside the expanded review card.
- After a batch, a **success screen** shows first: **Open the sheet** and
  **Scan more** (back to the camera on the same screen).
