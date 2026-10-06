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

- English `/` (USD) and Indonesian `/id` (IDR), no language toggle.
- Sections: hero ("Receipts in. Rows out."), How it works, audience, credit
  pricing + referral, FAQ, and CTAs that sign in with Google directly.

---

## App routes

`/app/snap` is home. State lives in a client provider mounted in
`/app/layout.tsx`, so the snap queue survives route changes.

| Route | Screen | Who |
|---|---|---|
| `/` | English landing (international) | everyone |
| `/id` | Indonesian landing (IDR) | everyone |
| `/app` | redirects via the guard to `/app/snap` | everyone |
| `/app/start` | Intro, then Sign in | logged out |
| `/app/snap` | Single screen: camera + batch review (home) | signed in, sheet OK, credits |
| `/app/topup` | Top up: GoPay (id) or Paddle (intl) | signed in |
| `/app/topup/order/[id]` | GoPay order: amount, countdown, "I have paid" | signed in |
| `/app/settings` | balance, invite link, sheet, sign out | signed in |
| `/app/settings/sheet` | sheet status, reconnect, picker | signed in |
| `/admin` | GoPay orders: approve/reject/manual grant | admin emails only |

`/` is English with USD; `/id` is Indonesian with IDR (no language toggle). The
region cookie is set at entry and drives the app language and top-up channel.
An Indonesian IP hitting `/` with no cookie is redirected to `/id` once.

A back-to-Snap control shows on every app screen except Snap and Start.

### Guard (server decides; stop at first failure)

1. `!authChecked` → loading spinner. Never show Sign in first.
2. No session → `/app/start`.
3. No usable sheet → `/app/settings/sheet` (auto-attempts find/create).
4. No credits → `/app/topup` (Settings stays reachable).
5. Ready: `/app` → `/app/snap`. A signed-in user on `/app/start` → `/app/snap`.

### Screens

- **Intro / Sign in** — what zippp does, then Google (the only login).
- **Snap** (single screen) — live camera with auto-snap (on by default), blur
  blocks capture, manual shutter + upload. Captured receipts join the batch
  **below the camera**: one card expanded (the current one), the rest collapsed,
  accepted cards hidden. Each expanded card is an editable form with
  **Accept** / **Edit**; after the last accept, **Send all accepted**.
- **Success** — after a batch send: "{sent} of {total} sent", **Open the sheet**
  and **Scan more**. Failed items reappear in the batch to retry.
- A collapsible **Debug** panel shows the extraction trace in the expanded card.

---

## Capture + batch review (Revision 1, implemented)

See `REVISION-1.md`. In short:

- Auto-snap is **on by default**; a **blurry frame cannot be captured**
  (hard block, "Blurry. Hold steady.").
- One screen holds camera + review. Cards: **one expanded**, rest collapsed,
  accepted hidden; **Accept**/ **Edit** per card; progress "{done} of {total}".
- **Send all accepted** appends sequentially, **1 credit per successful append**
  (charge on success); failures return to the batch to retry.
- The batch **survives a refresh** (IndexedDB): image, extraction, draft, status
  and the open card are restored; interrupted reads/sends become retryable.

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
