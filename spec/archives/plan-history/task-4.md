# Task 4 plan — Credit ledger

Owns: `spec/ARCHITECTURE.md`, `spec/PRICING.md`, `spec/SPEC.md`.

## Store

Upstash Redis REST (`src/lib/billing/{config,redis,ledger}.ts`). `billingConfigured()`
is true only when `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` are set;
otherwise an in-process fallback runs in **unconfigured mode** and credits are
**not enforced**, so the app still works for review.

## Guarantees

- 1 credit = 1 scan, spent on **Send**, never on read.
- Every top-up is a **lot**; lots expire `CREDIT_TTL_DAYS` (30) after grant.
- Spend takes the **earliest-expiry** lot first and is **atomic** (Upstash `EVAL`
  Lua; a process-level mutex in the fallback).
- Grants are **idempotent** on `idem` (`SET idem:{key} 1 NX` inside the script);
  the same key never grants twice.
- Expired lots are ignored on read and dropped lazily.

## Keys

`bill:acct:{userId}` (lots), `bill:ledger:{userId}` (LPUSH entries),
`bill:user:{userId}` (email, refCode, referredBy, firstTopupDone),
`bill:ref:{code}`, `bill:email:{email}`, `bill:idem:{key}`,
`bill:order:{id}`, `bill:orders:open`, `bill:codes`.

## Wiring

- `GET /api/billing/balance` → `{ configured, credits, soonestExpiry, refCode }`.
- `AppProvider` loads balance, refreshes after Send; exposes it.
- Guard: no credits → `/app/topup` (Settings stays reachable).
- Snap is disabled and Send is blocked at zero credits, both link to Top up.
- `npm run grant -- <email> <credits>` writes an `admin_grant` lot (needs the
  email index, created on first sign-in).

## Verified against the live Redis

Grant 5 → 1; grant 5 again (same idem) → 0 (deduped); grant 2 earlier-expiry;
spend 3 → 1 (earliest lot first); spend the remaining 4 → 1; balances zeroed;
4 ledger entries written. Atomic and idempotent confirmed.

## Open

- Upstash is currently a **3-day temporary** database (`upstash-redis-start`).
  Claim it (console URL) or replace with a proper Upstash DB before launch.
- Formal "two parallel Sends cannot spend one credit" test still to run with a
  real signed-in user.
