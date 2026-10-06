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

## App routes

`/app/snap` is home. State lives in a client provider mounted in
`/app/layout.tsx`, so the snap queue survives route changes.

| Route | Screen | Who |
|---|---|---|
| `/app` | redirects via the guard to `/app/snap` | everyone |
| `/app/start` | Intro, then Sign in | logged out |
| `/app/snap` | Capture + queue (home) | signed in, sheet OK |
| `/app/check/[id]` | Check one queued item (or BadPhoto if it failed) | same |
| `/app/sent` | rows added | same |
| `/app/topup` | placeholder until Tasks 4/6 | signed in |
| `/app/settings` | placeholder until Task 3 | signed in |
| `/app/settings/sheet` | sheet status, reconnect, picker | signed in |

A back-to-Snap control shows on every app screen except Snap and Start.

### Guard (server decides; stop at first failure)

1. `!authChecked` → loading spinner. Never show Sign in first.
2. No session → `/app/start`.
3. No usable sheet → `/app/settings/sheet` (auto-attempts find/create).
4. No credits → `/app/topup` (**stubbed until Task 4**).
5. Ready: `/app` → `/app/snap`. A signed-in user on `/app/start` → `/app/snap`.

### Screens

- **Intro / Sign in** — what zippp does, then Google (the only login).
- **Capture** — live camera, receipt-detection overlay, manual shutter, upload
  link. Snaps go into the queue; the camera stays live.
- **Check** — editable result: merchant, date, staff, outlet, line items,
  total. Date (and staff, for resto) required. **Send to sheet** appends one row
  per line item; the item then leaves the queue.
- **Sent** — rows added, link to open the sheet, "Scan another".
- A collapsible **Debug** panel shows the extraction trace on Check and expands
  on unreadable.

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

## Flow C — Personal expense template (not implemented)

Same screens, one person, template `personal-expense`. No staff list, no
inventory units. Not an accounting system. **Spec-only for now** — the app only
creates the `resto-inventory` template (`LATER.md`).

---

## Out of flow (do not draw)

Accountant close, P&L, journals, bank rec, tax, payroll, multi-entity, per-staff
logins beyond "pick my name", zippp-hosted history, replacing Google Sheets.
