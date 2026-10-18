# zippp session summary

Repo: `github.com/masjames/zippp.link` · Live: `www.zippp.link`
Vercel: `masjames-projects/zippp-link` (web analytics enabled)
Last main commit in this session: `517347e`
Purpose: handoff. Read this first, then the owning spec files.

## Shipped in this session

### Snap, capture, review

- **Accept writes the row immediately.** One check, one sheet row, one credit.
  No batch send and no success screen. The camera returns when the queue
  empties. A bottom **Open Google Sheets** link opens the sheet.
- **Review card** edits merchant, category, date, subtotal, tax, total, and
  per-line description, qty, unit price, amount. Accept/Delete live in a fixed
  footer. The verification flags no longer block Accept.
- **Auto category**: the model picks one of `Bahan baku`, `Minuman`, `Kemasan`,
  `Peralatan`, `Kebersihan`, `Lainnya`; it is editable and mapped to the sheet.
  The old `Category: Bahan baku` constant is gone.
- **Capture**: tap the viewfinder (no separate shutter). It flashes, grabs the
  frame, and stops the camera. The viewfinder is a small box until live.
  Capture is ~3 MP JPEG 0.72, one draw and one encode, thumbnail from the same
  canvas, card added optimistically. Detector reuses buffers and only pushes
  state on change.
- **Sheet-name pill** is a dropdown; the current sheet is always listed.
- Merchant placeholder is "Nama toko". The Snap title/body copy was removed.
  "Saved" toast on append.

### Sheets and routing

- Sheet page is a **phase machine**: checking, choose-source, picking, wizard,
  creating, connected, error. Find never creates silently.
- **Create a new sheet** wizard with three templates: Purchasing and inventory
  (`resto-inventory`), Expense tracker (`personal-expense`), Custom (`custom`).
  Each has headers and a default map. The connected sheet opens in Google
  Sheets.
- Settings entry point is a **gear + Settings** in the app header. Sign out
  lives only in Settings. No in-app back button (device back). Header padding
  rebalanced.
- **Invite welcome page**: `/?invite=CODE` shows "Welcome, {email}! 😄" with a
  Continue with Google button and the Rp 10.000 price.

### Money: credits, top-up, invites

- **QRIS via Kasera Pay** is the primary Indonesian top-up:
  - `POST /api/topup/qris` → `POST /v1/transactions` (`payment_methods: ["qris"]`)
    → redirect to the hosted checkout.
  - Signed `payment.paid` webhook at `/api/kasera/webhook` verifies
    `Kasera-Signature-V1` (`t.<rawBody>` HMAC-SHA256, 5 minute window) and
    grants once (`idem: kasera:<txId>`).
  - Return page `/app/topup/qris/[id]` polls and refreshes from Kasera, so a
    delayed webhook still settles.
  - Live key and webhook secret are set. Live test: create 201; valid signature
    200, bad signature 401.
- **Manual GoPay** remains the fallback (`/api/topup/orders`, admin approve,
  `/app/topup/order/[id]`). DOKU is halted. Paddle stays for international.
- **Invitations** (`src/lib/billing/invites.ts`, admin `GET/POST/DELETE
  /api/admin/invites`):
  - Admin adds an email; the server mints a unique `/?invite=CODE` link.
  - The link is bound to that email. A different signed-in email is rejected and
    keeps the invite open. The top-up page shows which email it belongs to.
  - Claiming lowers the minimum from Rp 15.000 to Rp 10.000.
  - The app header shows "Special invitation price for {email}" on every `/app`
    screen until `firstTopupDone`.
  - Cancel order closes an open order and frees its code.
- **Grant notice + email**: a manual grant with a reason writes a one-off
  in-app notice (shown once on Snap) and sends the reason by Mailtrap.

### Stores

- JSON/session records (Google tokens, workspace, eval/telemetry, notices) use
  **Upstash** first, then Blob, then the filesystem. Blob is legacy.
- `BLOB_READ_WRITE_TOKEN` was removed from Vercel because the Blob store was
  suspended for exceeding Hobby simple operations. Blob stores are still
  suspended until 16/11/2026 and unused.
- Token/workspace remote read/write failures now log and **throw**; no silent
  `/tmp` fallback (that caused the admin 404).
- **Donated photos** go to the operator's Google Drive, not Blob. A dedicated
  refresh token is copied from the admin session on OAuth login and on `/admin`
  (encrypted in Upstash). Folder: `[zippp] donations`.

### Email

- Mailtrap via the official `mailtrap` Node SDK. Every email sends **HTML and
  plain text** with one branded inline layout. HTML subject/body for grants,
  invites, and the one-off thank-you samples.
- Env: `MAILTRAP_API_TOKEN`, `MAILTRAP_FROM_EMAIL` (`hello@zippp.link`),
  `MAILTRAP_FROM_NAME`, optional `MAILTRAP_USE_SANDBOX` + `MAILTRAP_INBOX_ID`.
- Copy: "We've given you {credits} free credits." and "Sincerely, Zippp team".

### Analytics

- Vercel Analytics installed and `<Analytics />` in the root layout; Web
  Analytics enabled on `zippp-link`.
- PostHog via `@posthog/react` `PostHogProvider` in the root layout.
  `NEXT_PUBLIC_POSTHOG_KEY` (project token, public) and
  `NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com` are set. Verified the
  token and host in the live client bundle.

### Wording and legal

- Copy source of truth is `spec/wording.txt` (renamed from `.md`; loader and
  Vercel tracing updated). `AGENTS.md` was already updated to `.txt`.
- Legal pages and contact email reveal exist from an earlier change.

## Current runtime map

```
/app                 guard -> /app/snap
/app/snap            camera + per-accept review; accept appends immediately
/app/topup           QRIS (Kasera) or Paddle (intl); manual GoPay fallback
/app/topup/qris/[id] QRIS return page (polls + refreshes from Kasera)
/app/topup/order/[id] manual GoPay order (fallback)
/app/settings        balance, referral, top-up, sheet, sign out
/app/settings/sheet  sheet phase machine + template wizard
/admin               orders, manual grant, invitations
/api/kasera/webhook  signed payment.paid / expired / failed
```

## Env (names only, server unless NEXT_PUBLIC)

Upstash: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.
Google: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`,
`TOKEN_ENCRYPTION_KEY`.
Email: `MAILTRAP_*`.
QRIS: `KASERA_API_KEY`, `KASERA_WEBHOOK_SECRET`, `KASERA_BASE_URL`.
Paddle: `PADDLE_*`. DOKU halted: `DOKU_*`. Manual GoPay: `GOPAY_NUMBER`,
`GOPAY_NAME`. Admin: `ADMIN_EMAILS`. Contact: `CONTACT_EMAIL`,
`CONTACT_REVEAL_SECRET`. Analytics: `NEXT_PUBLIC_POSTHOG_KEY`,
`NEXT_PUBLIC_POSTHOG_HOST`. Extraction: `PADDLEOCR_*`, `DEEPSEEK_*`,
`GEMINI_*`. Telegram: `TELEGRAM_*`.

## Known caveats

1. The old Blob data (tokens, workspaces, donated photos) is unreachable while
   the stores are suspended. Users re-sign-in and reconnect the `[zippp]` sheet.
2. QRIS live is connected. A `kp_test_` key needs a separate test webhook
   endpoint and secret.
3. Manual GoPay is still the fallback if `KASERA_API_KEY` is unset.
4. `spec/discussions/continuation-vercel-doku.md` is stale (DOKU is halted).
5. `spec/discussions/continuation-humanize-wording.md` is still pending
   (`spec/wording.txt` has not been humanized).
6. `tsconfig.tsbuildinfo` is tracked and changes on every build; it is a build
   artifact.
7. Some `spec/archived/*` docs still say `wording.md`; active specs say
   `wording.txt`.

## Continuation prompt

> Continue zippp (repo: github.com/masjames/zippp.link, local:
> /Users/mm/Dev/adit/zippp). Read `spec/discussions/session-summary.md`,
> `spec/ARCHITECTURE.md`, `spec/USER-FLOW.md`, `spec/PRICING.md`,
> `spec/TEMPLATES.md`, and `AGENTS.md` first.
>
> Current state: QRIS via Kasera Pay is live for `/id` (create request, hosted
> checkout, signed webhook, return page). Manual GoPay is the fallback, DOKU is
> halted, Paddle is international. Sessions/JSON are on Upstash because the
> Vercel Blob store is suspended; `BLOB_READ_WRITE_TOKEN` is removed. Donated
> photos go to the operator's Google Drive. Invitations are email-bound with a
> Rp 10.000 minimum, a welcome page, and a persistent banner until the first
> top-up. Grants write a one-time in-app notice and send a Mailtrap HTML+text
> email. Vercel Analytics and PostHog are connected.
>
> No tasks are queued. Wait for the user's next instruction; do not invent
> work. When asked to verify something, use the live site, Vercel logs, and the
> owning spec.
>
> Rules: specs are the source of truth; update the owning spec in the same
> change. Every user-visible string lives in `spec/wording.txt`. No em dashes.
> No secrets in git, no `NEXT_PUBLIC` for secrets (the PostHog project token is
> public by design). Constants in `src/lib/billing/config.ts`. Run
> `npm run build` and `npx tsc --noEmit` before done. One task at a time. Do not
> edit `AGENTS.md` mid-session.
>
> Do not deploy zippp to `antep-mvp`; the correct project is
> `masjames-projects/zippp-link`, linked locally in `.vercel`.
