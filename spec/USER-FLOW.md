# zippp user flows

Depends on: `SPEC.md`, `ARCHITECTURE.md`, `TEMPLATES.md`
Owns: who does what, in order. Not stack. Not prices.
Revision 2 decisions: `AUDIT-2026-10.md`.

---

## Actors

| Actor | Job |
|---|---|
| **Sonny** | Purchasing staff. Photographs supplier notas. Picks staff name / outlet. Does not own the sheet. |
| **Bibian** | One person tracking personal spend. Uses `personal-expense`. |
| **Fais** | Seller. Photographs his own sales notas. Needs the **daily recap** on the month tab. |
| **Bagas** | Staff claiming reimbursement. Needs month tab + **photo proof** in Drive. |
| **Operator** | Owns the Google account / sheet (often Sonny's manager, or the same person as Bibian/Fais/Bagas). Sets template once, staff list, outlets. |
| **zippp** | Reads the photo, maps to columns, appends rows. Does not become the books. |

The sheet stays the system of record. zippp is the intake mill.

---

## Landing page `/` (master)

- Worldwide `/` (USD, English) and Indonesia `/id` (IDR, Indonesian). A region
  dropdown in the nav switches language and currency. App Settings language is
  copy-only; currency stays with the region.
- Sections: hero + Google Sheets/Drive badges, How it works (app-flow mock),
  product showcase (sheet mock or `public/landing/` assets), **four persona
  cards** linking to `/for-*` pages, impact proof + sample stories (Aldan
  Arkara), credit pricing + referral, FAQ, CTAs that sign in with Google.
- Card order: `/id` leads with purchasing; `/` leads with personal expense.
- Optional media: drop `public/landing/app-<lang>.png`, `sheet-<lang>.png`, or
  `demo-<lang>.mp4` (`src/lib/landing-assets.ts`).
- Footer links to public information pages and the operator contact line.

## Use-case landing pages (flat `for-*`)

Master is the hub. Each persona has its own route (same slug EN and ID):

| Persona | Template | Soft-launch | `/` (intl) | `/id` |
|---|---|---|---|---|
| Purchasing (Sonny) | `resto-inventory` | no — ads OK | `/for-purchasing` | `/id/for-purchasing` |
| Expenses (Bibian) | `personal-expense` | no — ads OK | `/for-expenses` | `/id/for-expenses` |
| Sales (Fais) | `sales-recap` | no — create OK | `/for-sales` | `/id/for-sales` |
| Reimburse (Bagas) | `reimbursement` | no — create OK | `/for-reimbursement` | `/id/for-reimbursement` |

Templates `sales-recap` and `reimbursement` can be created from Settings.
Month-tab / daily-block flywheel may still be incomplete; ads can still prefer
purchasing + expenses. Copy in `wording.txt` under `landing.persona.*`.
Helpers: `src/lib/personas.ts`, `src/components/landing/PersonaLanding.tsx`.

## Compare pages (PhotoAI-style)

Flat slugs under `/` and `/id/`:

| Page | Route |
|---|---|
| zippp vs Snaply | `/vs-snaply` · `/id/vs-snaply` |
| zippp vs Sheetify | `/vs-sheetify` · `/id/vs-sheetify` |
| zippp vs Scan2Sheet | `/vs-scan2sheet` · `/id/vs-scan2sheet` |
| zippp vs Expensify | `/vs-expensify` · `/id/vs-expensify` |
| zippp vs SmartScan Doc | `/vs-smartscandoc` · `/id/vs-smartscandoc` |
| zippp vs typing | `/vs-typing` · `/id/vs-typing` |

Linked from the site footer. Helpers: `src/lib/competitors.ts`,
`src/components/landing/VsLanding.tsx`.

## Public information pages

Required by payment gateway review (DOKU, Paddle) and Google OAuth
verification. Static, bilingual, copy in `wording.txt` under `legal.*`.

| Page | `/` (en) | `/id` |
|---|---|---|
| Pricing | `/pricing` | `/id/harga` |
| Terms | `/terms` | `/id/syarat` |
| Privacy | `/privacy` | `/id/privasi` |
| Refund | `/refund` | `/id/refund` |
| Contact | `/contact` | `/id/kontak` |

Pricing page lists top-up presets (`IDR_TOPUP_PRESETS`). Actual payment stays
behind sign-in at `/app/topup`.

Unknown routes render a custom 404 (`src/app/not-found.tsx`): a short message
plus a small playable game. Copy lives under `notfound.*` in `wording.txt`.

---

## App routes

`/app/snap` is home. State lives in a client provider in `/app/layout.tsx`.

| Route | Screen | Who |
|---|---|---|
| `/` | English master landing | everyone |
| `/id` | Indonesian master landing | everyone |
| `/for-*` · `/id/for-*` | Use-case landings (see above) | everyone |
| `/app` | guard → `/app/snap` | everyone |
| `/app/snap` | Camera + batch review (home) | signed in, sheet OK, credits |
| `/app/topup` | DOKU (id) or Paddle (intl); `?doku=INVOICE` return status | signed in |
| `/app/settings` | balance, language, invite, sheet, staff/outlets, photo toggle, sign out | signed in |
| `/app/settings/sheet` | sheet status, create/choose, template wizard | signed in |
| `/admin` | Recent DOKU payments, manual grant | admin emails only |

### Guard (server decides; stop at first failure)

1. `!authChecked` → loading spinner. Never show Sign in first.
2. No session → `/` (or `/id`) to sign in.
3. No usable sheet → `/app/settings/sheet`. Phases: **check** (find only, never
   create) → **choose source** → **picker** → **template wizard** →
   **creating** → **connected** / **error**. Templates: five (see
   `TEMPLATES.md`). Settings reachable from the header. A **Sign out** link on
   the choose-source screen is the escape.
4. No credits → `/app/topup` (Settings stays reachable).
5. Ready: `/app` → `/app/snap`.

### Chrome

- Header: **Home** (off Snap only, back to `/app/snap`) + **credit pill**
  (tap → top-up; amber under 10; red at 0) + **Settings** + **Admin** for
  admins. Sign out on Settings.
- `/app/snap` is home. Every other screen returns there with the Home button.
- The sheet setup has a sign-out link, so a user without a sheet is not stuck.

---

## Capture + review (shipped Revision 1)

One screen `/app/snap`:

```
camera (auto-snap on) → queued → extract → review card → Accept
  → append to month tab (1 credit) → next card or camera
```

- Viewfinder is the shutter. Blurry frame hard-blocks. Auto-snap on by default.
- Accordion: one card open, accepted hidden. Accept writes immediately.
  Accept label: **Accept · 1 credit**.
- Batch persists in IndexedDB (image, draft, status, open card).
- Ops on the card depend on template (below). Never from the model.
- Soft **Saved to {tab}** toast + **Open this month**. No separate success
  route.

---

## Flow A — First-time setup (once)

1. Sign in with Google (Sheets + Drive-file scope only).
2. Choose create new sheet or use existing `[zippp]` sheet.
3. Wizard: pick template by **persona wording** (kitchen, spending, sales,
   reimbursement, own sheet).
4. zippp creates spreadsheet: `Summary` + current month tab, headers,
   formatting, dropdowns, daily block (`TEMPLATES.md`).
5. T1 only: Settings → staff names, outlets, default outlet.
6. T1 / T4: Settings → Save photo to Drive (T4 default on).
7. Top up if zero credits. Done.

---

## Flow B — Shopping / capture day

1. Open zippp on a phone. Photograph each nota (or upload).
2. zippp extracts (PP-OCRv6 → DeepSeek Flash).
3. Review card: merchant, date, items, totals, category + **template ops**.
4. **Accept** → spend 1 credit → ensure month tab from **receipt date** →
   optional Drive photo → append rows → hide tabs older than 12 months.
5. Next ready card opens. Failures stay for retry; nothing appended on fail.

### Ops per template (review card)

| Template | Extra fields |
|---|---|
| resto-inventory | Staff (dropdown, device-remembered), Outlet (default / dropdown) |
| personal-expense | Payment (optional) |
| sales-recap | Payment (Cash / QRIS / Transfer), Customer (optional) |
| reimbursement | Purpose (session-remembered) |
| custom | none beyond mapped fields |

### Fail paths

- Unreadable / not a receipt → failed with Retry; nothing appended.
- Sheets 401 → Sign in with a message.
- Append error → error shown; item ready to retry; credit refunded.
- Photo upload fail → row saved without link; soft notice.

---

## Flow C — Per template (same screens)

| Template | Who | Extra |
|---|---|---|
| resto-inventory | Sonny | staff/outlet required when lists exist |
| personal-expense | Bibian | category + optional payment |
| sales-recap | Fais | lands on Summary; daily block is the win |
| reimbursement | Bagas | photo on; month tab = claim; share via Google |
| custom | anyone | their headers, single tab |

---

## Top-up flow

1. Credits pill or guard → `/app/topup`.
2. Indonesia: presets Rp 15.000 / 30.000 / 50.000 / 100.000 (100 / 200 / 333 /
   666 scans) or custom ≥ Rp 15.000. Preview: now → after → expires.
3. Pay on DOKU hosted page. Return `?doku=INVOICE` → poll until paid. The
   paid state shows the credits from this top-up and their expiry.
4. **Back to camera** → `/app/snap`.
5. International: Paddle pack 100 credits / $9.

---

## Out of flow (do not draw)

Accountant close, P&L, journals, bank rec, tax, payroll, multi-entity, per-staff
Google logins, zippp-hosted history, replacing Google Sheets, reimbursement
approval status, PDF share-from-app (later).
