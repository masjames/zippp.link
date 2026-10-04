# zippp user flows

Depends on: `SPEC.md`, `ARCHITECTURE.md`
Owns: who does what, in order. Not stack. Not prices.

Primary design partner: **Charlie**, F&B manager. His staff shop for resto
inventory and type every nota into Google Sheets today. zippp ends that typing.

---

## Actors

| Actor | Job |
|---|---|
| **Staff** | Buys inventory, holds the paper nota, photographs it. Does not own the sheet. |
| **Charlie** | Owns the Google Sheet. Reviews rows. Sets outlet, staff list, column map once. |
| **zippp** | Reads the photo, maps to columns, appends rows. Does not become the books. |

The sheet stays the system of record. zippp is the intake mill.

---

## Landing page `/`

- Region-aware, bilingual. Indonesian visitors get Indonesian + IDR pricing.
- Sections: hero ("Receipts in. Rows out."), How it works (Snap / Check / Send),
  audience, two paid plans (no free tier), FAQ, sign-in CTA.
- Prices are `xx` placeholders until set in `wording.md`.

---

## App `/app` — five screens

1. **Intro** — what zippp does; "Get started".
2. **Sign in** — Google is the only login. On success the app finds or creates
   the `[zippp]` sheet, then goes to Capture. If several `[zippp]` sheets exist,
   a picker is shown.
3. **Capture** — live camera, receipt-detection overlay, manual shutter, and an
   "upload a photo" link. Snapped photos go into the **snap queue**; the camera
   stays live so staff can keep shooting.
4. **Check** — the editable result for a queued item: merchant, date, staff,
   outlet, line items, total. Date (and staff, for resto) are required. "Send to
   sheet" appends one row per line item.
5. **Sent** — rows added, with a link to open the sheet and "Scan another".

A collapsible **Debug** panel is always available on Check (and expands on the
unreadable screen) showing the extraction trace.

---

## Snap queue

- Per device, in memory. Each snap becomes a queue item.
- Items process **one at a time**: `queued → reading → ready/failed`.
- The queue strip under the viewfinder shows thumbnails and status.
- **Check is required per item** before it is sent (review-before-send).
- After a send, the next ready item opens automatically.
- Failed items stay in the strip with **Retry**; nothing is lost.
- Concurrency across users is handled by the platform: extraction is stateless,
  so Vercel runs requests in parallel instances.

---

## Flow A — First-time setup (Charlie, once)

1. Charlie signs in with Google (Sheets + Drive-file scope only).
2. zippp finds a `[zippp]` sheet or creates `[zippp] Resto inventory`.
3. zippp reads row 1 as headers and builds the field map; unmatched columns get a
   constant or prompt-at-submit (Staff, Outlet).
4. He adds staff names (plain list) and outlets. Done — no chart of accounts.

---

## Flow B — Shopping day (the time save)

1. Staff open zippp on a phone. They photograph each nota; it queues.
2. zippp extracts each one (PP-OCRv6 → DeepSeek Flash).
3. Staff open a ready item on **Check**: date, staff, outlet, line items, total.
   Anything wrong is corrected on this screen.
4. **Send to sheet** appends the rows using the saved map. Header facts repeat on
   each line.
5. "Sent" confirms the row count. Next ready item opens automatically.

**Fail paths**
- Unreadable / not a receipt → the item is marked failed with Retry; nothing is
  appended.
- Sheets 401 (session lost) → the app returns to Sign in with a message.
- Append error → the error is shown; the item stays ready to retry.

---

## Flow C — Personal expense template

Same screens, one person, template `personal-expense`. No staff list, no
inventory units. Not an accounting system.

---

## Out of flow (do not draw)

Accountant close, P&L, journals, bank rec, tax, payroll, multi-entity, per-staff
logins beyond "pick my name", zippp-hosted history, replacing Google Sheets.
