# Continuation: DOKU on Vercel + sandbox credential fix

Repo: `github.com/masjames/zippp.link` · Live: `www.zippp.link`
Vercel project: `masjames-projects/zippp-link` (auto-deploys from GitHub)
Local path on the first machine: `/Users/mm/Dev/adit/zippp`

This doc is a handoff. The first machine cannot reach the Vercel scope, so run
the steps below on the machine/account that has `masjames-projects` access.

## State

Code on `main` already includes: DOKU Checkout for `/id` top-up, GoPay removed,
bilingual legal pages, contact email reveal behind a signed challenge. Latest
commit: `ce7b879`.

Signed-in `/id` shows "Isi saldo belum tersedia" because `dokuConfigured()` is
false on the live project.

`dokuConfigured()` = `DOKU_CLIENT_ID` + `DOKU_SECRET_KEY` + `billingConfigured()`
(`UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`). All must exist on
`zippp-link`.

## Two blockers, both verified

1. Vercel access. On the first machine the CLI is logged in as `b0bthcdrz` and
   only sees `pradityas-projects-3c9afc8e`. `--scope masjames-projects` returns
   "The specified scope does not exist". `~/.vercel/auth.json` holds a single
   token. The GitHub CLI there is authenticated as `masjames`, but that does not
   grant Vercel env access.

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

## Task (in order)

1. Link and set env on `masjames-projects/zippp-link`:

   ```
   git clone https://github.com/masjames/zippp.link.git   # if needed
   cd zippp.link
   vercel link --project zippp-link --scope masjames-projects
   vercel env add DOKU_ENV production        # value: sandbox
   vercel env add DOKU_CLIENT_ID production  # correct Checkout Client/Brand ID
   vercel env add DOKU_SECRET_KEY production # matching secret
   vercel env ls                             # confirm DOKU_* and UPSTASH_*
   ```

2. Redeploy: `vercel --prod`, or push any commit (the project auto-deploys).

3. In the DOKU sandbox back office set the Notification URL to
   `https://www.zippp.link/api/doku/notify`.

4. Verify end to end: signed in on `/id`, open `/app/topup`, pick a preset,
   press Bayar, pay on the DOKU sandbox simulator, return to
   `/app/topup?doku=ZP...`, status flips to paid, credits appear. The grant is
   once per invoice (idempotency key `doku:<invoice>`); confirm a replayed
   notification does not double-grant.

## Env to confirm on zippp-link (Production)

Required for this task:

```
DOKU_ENV=sandbox
DOKU_CLIENT_ID=<dashboard Client/Brand ID>
DOKU_SECRET_KEY=<matching secret>
UPSTASH_REDIS_REST_URL=<present?>
UPSTASH_REDIS_REST_TOKEN=<present?>
```

Also needed by the rest of the app (see `.env.example`): `GOOGLE_CLIENT_ID`,
`GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
(`https://www.zippp.link/api/auth/callback`), `TOKEN_ENCRYPTION_KEY`,
`BLOB_READ_WRITE_TOKEN` (or the Upstash pair), `ADMIN_EMAILS`, `CONTACT_EMAIL`,
`CONTACT_REVEAL_SECRET`.

## Do not

- Do not deploy zippp to `antep-mvp`. That project is the wrong one; the DOKU
  env was mistakenly set there (aliases `ante-framemalang-mvp.vercel.app`).
  Optionally remove `DOKU_*` from `antep-mvp` to avoid confusion.
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
user-visible string lives in `spec/wording.md`. No em dashes. No secrets in git,
no `NEXT_PUBLIC` for secrets. Constants live in `src/lib/billing/config.ts`. Run
`npm run build` and `npx tsc --noEmit` before done. One task at a time.
