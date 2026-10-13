# Continuation: DOKU on Vercel + sandbox credential fix

Repo: `github.com/masjames/zippp.link` · Live: `www.zippp.link`
Vercel project: `masjames-projects/zippp-link` (auto-deploys from GitHub)
Local path on the first machine: `/Users/mm/Dev/adit/zippp`

This doc is a handoff. The first machine cannot reach the Vercel scope, so the
steps below were run on the machine/account that has `masjames-projects`
access.

## Status: resolved (2026-10-13)

- `DOKU_ENV=sandbox`, `DOKU_CLIENT_ID`, and `DOKU_SECRET_KEY` are set on
  `masjames-projects/zippp-link` (Production) with the sandbox dashboard
  Client/Brand ID and its matching secret. Values are in Vercel only.
- Production was deployed with `vercel --prod`. Live `/app/topup` (region id)
  now renders `"doku":true`, so the Bayar button is enabled.
- The sandbox credentials were proven against
  `https://api-sandbox.doku.com/checkout/v1/payment`: HTTP 200 with a payment
  URL.
- A signed SUCCESS notification for an unknown invoice returns HTTP 404
  `Unknown invoice` on live `/api/doku/notify`, so the deployed secret and the
  HMAC scheme line up. An unsigned post still returns 401.
- An isolated run (scratch Upstash Redis + the real sandbox checkout API)
  covered: checkout creation, amount-mismatch rejection, first grant (333
  credits on Rp 50.000), and a replay that did not double-grant.
- Still to do by hand in the DOKU sandbox back office: set the Notification
  URL to `https://www.zippp.link/api/doku/notify`. Each checkout also sends
  `override_notification_url` to the same URL, so notifications are targeted
  even if the back-office default is stale.

## State

Code on `main` already includes: DOKU Checkout for `/id` top-up, GoPay removed,
bilingual legal pages, contact email reveal behind a signed challenge. Latest
commit: `75cc6bb`.

Signed-in `/id` showed "Isi saldo belum tersedia" because `dokuConfigured()` was
false on the live project. It is now true.

`dokuConfigured()` = `DOKU_CLIENT_ID` + `DOKU_SECRET_KEY` + `billingConfigured()`
(`UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`). All must exist on
`zippp-link`.

## Two blockers, both fixed

1. Vercel access. On the first machine the CLI is logged in as `b0bthcdrz` and
   only sees `pradityas-projects-3c9afc8e`. `--scope masjames-projects` returns
   "The specified scope does not exist". `~/.vercel/auth.json` holds a single
   token. The GitHub CLI there is authenticated as `masjames`, but that does not
   grant Vercel env access.

   Fixed: the Vercel steps were run on the account that has `masjames-projects`.
   `vercel project ls` and `vercel env ls` resolve `masjames-projects/zippp-link`.

2. The DOKU sandbox Client-Id is invalid. A real signed request to
   `https://api-sandbox.doku.com/checkout/v1/payment` (same HMAC scheme the app
   uses) returns:

   ```
   HTTP 400
   {"error":{"code":"invalid_client_id","message":"Invalid Client-Id","type":"invalid_request_error"}}
   ```

   `doku_key_sandbox_3e8035a5f3b849f394bee3eafb40e48b` is not a DOKU Checkout
   Client-Id. Use the sandbox dashboard's Client/Brand ID (`BRN-...` / `MCH-...`)
   and its matching secret key.

   Fixed: the sandbox dashboard Client/Brand ID and its matching secret were
   used. The same signed request now returns HTTP 200 with a payment URL.

## Task (done)

1. Done: env set on `masjames-projects/zippp-link`:

   ```
   git clone https://github.com/masjames/zippp.link.git   # if needed
   cd zippp.link
   vercel link --project zippp-link --scope masjames-projects
   vercel env add DOKU_ENV production        # value: sandbox
   vercel env add DOKU_CLIENT_ID production  # correct Checkout Client/Brand ID
   vercel env add DOKU_SECRET_KEY production # matching secret
   vercel env ls                             # confirm DOKU_* and UPSTASH_*
   ```

2. Done: `vercel --prod` deployed and aliased `https://www.zippp.link`.

3. Outstanding (manual, DOKU sandbox Back Office): set the Notification URL
   to `https://www.zippp.link/api/doku/notify` on each enabled payment channel.
   DOKU docs (Setup Notification URL): sign in at
   `https://sandbox.doku.com/bo/login`, then **Settings > Payment Settings** and
   click **Configure** on each channel:
   - Virtual Account (use the Non-SNAP list to match our HMAC scheme)
   - Cards > tab Payment Configuration (paste in the notification URL box)
   - Convenience Store, per channel
   - e-Wallet, per channel
   - Paylater, per channel
   - QRIS, if it appears as its own entry

   The override only works when a Notification URL is already configured, and
   the override path must equal the configured path. Our override is
   `https://www.zippp.link/api/doku/notify`, so configure exactly that path
   (same path on any host is fine). Requirements from the docs: public HTTPS,
   no ngrok, no auth/VPN/localhost.

4. Verified with the live site plus an isolated run (see Status at the top):
   checkout creation, amount-mismatch rejection, one-time grant, and replay
   protection. The browser step (pay on the sandbox simulator) is the only part
   left to a human hand.

## Env to confirm on zippp-link (Production)

Required for this task:

```
DOKU_ENV=sandbox
DOKU_CLIENT_ID=<sandbox Client/Brand ID, set on Vercel>
DOKU_SECRET_KEY=<matching secret, set on Vercel>
UPSTASH_REDIS_REST_URL=<present>
UPSTASH_REDIS_REST_TOKEN=<present>
```

Also needed by the rest of the app (see `.env.example`): `GOOGLE_CLIENT_ID`,
`GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
(`https://www.zippp.link/api/auth/callback`), `TOKEN_ENCRYPTION_KEY`,
`BLOB_READ_WRITE_TOKEN` (or the Upstash pair), `ADMIN_EMAILS`, `CONTACT_EMAIL`,
`CONTACT_REVEAL_SECRET`.

## Do not

- Do not deploy zippp to `antep-mvp`. That project is the wrong one; the DOKU
  env was mistakenly set there (aliases `ante-framemalang-mvp.vercel.app`).
  Resolved: the stale `DOKU_*` env was removed from `antep-mvp`.
- Do not commit `.env`. No `NEXT_PUBLIC` for secrets.

## Verified good (first machine)

- `npx tsc --noEmit` exit 0; `npm run build` exit 0.
- Live `www.zippp.link/id` returns 200.
- Live `POST /api/doku/notify` returns 401 `Bad signature` (route deployed and
  rejects unsigned posts).
- DOKU code audit: signature over
  `Client-Id/Request-Id/Request-Timestamp/Request-Target/Digest`,
  `override_notification_url`, `callback_url` with `?doku=<invoice>`,
  amount-mismatch guard, one-time grant, owner-only status read.

## Key files

- `src/lib/billing/doku.ts` (config, signature, orders, notification apply)
- `src/app/api/topup/doku/route.ts`, `src/app/api/topup/doku/[invoice]/route.ts`
- `src/app/api/doku/notify/route.ts`
- `src/components/app/screens/TopUpClient.tsx`, `src/app/app/topup/page.tsx`
- `src/lib/billing/config.ts` (constants), `src/lib/billing/redis.ts`

## After DOKU works (optional, deferred)

- Make `/` (international) and `/id` visually distinct.
- Remove stale GoPay mentions in `HANDOFF`, `OFFER`, `LATER`, `REVISION-1`,
  `zippp-ship-plan`, `discussions`.

## Rules (AGENTS.md)

Specs are the source of truth; update the owning spec in the same change. Every
user-visible string lives in `spec/wording.txt`. No em dashes. No secrets in git,
no `NEXT_PUBLIC` for secrets. Constants live in `src/lib/billing/config.ts`. Run
`npm run build` and `npx tsc --noEmit` before done. One task at a time.
