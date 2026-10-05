# zippp ship plan (v4: credits)

Goal: ship today, in stages. Each stage ends at a ship point. If the day runs out, you keep a working product at the last point reached.

v4 replaces v3. What changed:
- Subscriptions and plans are gone. Everything is **credit packs**. One ledger.
- Two top-up channels: **Paddle** (international, English, `/`) and **manual GoPay** (Indonesia, Indonesian, `/id`).
- Referral: referrer earns 20% of each referred top-up in credit. Referred user gets 20 free credits after their first approved top-up.
- Admin panel and Telegram alerts for GoPay orders.
- Template picker and Drive photo are specified but moved to Later.

---

## 1. What exists vs what is missing

### Already built (per spec/)

- Google OAuth, encrypted refresh token, Blob or Upstash session store
- Find or create the `[zippp]` sheet, column map, append rows
- Extraction: PP-OCRv6 then DeepSeek Flash, with fallbacks
- Five screens in one `/app` page, snap queue, Check before send
- Region detection in middleware (`zippp_region`), bilingual copy in `spec/wording.md`
- Google Cloud and Upstash are set up

### Missing (this plan)

| Gap | Task |
|---|---|
| Login lost on reopen | 1 |
| No real routes, no back to Snap | 2 |
| No settings, no sign out | 3 |
| Credit ledger with 30 day expiry | 4 |
| `/id` route and region handling | 5 |
| GoPay orders, Telegram alerts, admin panel | 6 |
| Referral | 7 |
| Paddle credit pack (international) | 8 |
| Landing and wording | 9 |

---

## 2. Money model (locked)

### Credits

- 1 credit = 1 scan. A scan is one receipt sent to the sheet.
- Credit is spent on **Send**, not on read. A failed read costs nothing.
- Every top-up creates a **lot**. A lot expires **30 days** after it is granted.
- Spending uses the lot that expires first.
- Zero credits: the app sends the user to Top up. Snap is disabled.

### Indonesia (`/id`, GoPay, manual)

- Minimum top-up: Rp 15.000.
- Rp 150 per credit. Credits = floor(amount / 150). Rp 15.000 gives 100 credits.
- The unique code digits are not credited. Only the base amount counts.

### International (`/`, Paddle)

- One pack: **100 credits for $9**, one-time, not a subscription.
- This is 10x the Indonesian per-scan price on purpose. Each market is priced against its own alternatives (`PRICING.md` rule).
- Bigger packs later.

### Referral

| Rule | Value |
|---|---|
| Referrer reward | 20% of every approved top-up by a referred user, as credits (floor) |
| Referred user bonus | 20 credits, once, after their first approved top-up |
| Applies to | GoPay and Paddle top-ups |
| Reward lots | Also expire in 30 days |
| Locked at | First sign-in. One referrer per user. Cannot change. |
| Self-referral | Blocked (same Google account) |
| Keyla | Same link, same credit reward. Cash stays manual if she wants it. |

Free credit exists only through this referral bonus. No trial, no free tier.

### Constants (one file: `src/lib/billing/config.ts`)

`IDR_PER_CREDIT=150`, `MIN_TOPUP_IDR=15000`, `CREDIT_TTL_DAYS=30`, `REFERRER_PCT=20`, `REFERRED_BONUS_CREDITS=20`, `ORDER_TTL_MIN=60`, `INTL_PACK_CREDITS=100`, `INTL_PACK_USD=9`.

---

## 3. Spec files to update (the spec is the source of truth)

| File | Change |
|---|---|
| `PRICING.md` | Replace plans with credits, packs, expiry, referral |
| `OFFER.md` | Offer is now prepaid credits |
| `SPEC.md` | "No free tier" note: referral bonus is the only free credit |
| `LATER.md` | Remove paywall and credit wallet from parked. Add Paddle, GoPay, Telegram, admin. Add Later items from section 12. |
| `ARCHITECTURE.md` | Upstash keys, ledger, Paddle, Telegram, admin, new env vars |
| `USER-FLOW.md` | Routes, top-up flows, admin flow |
| `wording.md` | Section 10 |
| `COGS.md` | One line: at Rp 150 per scan, DeepSeek cost is about Rp 6. OCR cost still to confirm. |

Each task updates its own spec file in the same change.

---

## 4. Routes

| Route | Screen | Who |
|---|---|---|
| `/` | English landing (international) | Everyone |
| `/id` | Indonesian landing | Everyone |
| `/app` | Redirects through the guard | Everyone |
| `/app/start` | Intro and Sign in | Logged out |
| `/app/topup` | Top-up: Paddle (intl) or GoPay (ID) | Logged in |
| `/app/topup/order/[id]` | GoPay order page: amount, countdown, "I have paid" | Logged in |
| `/app/snap` | Capture and queue (home) | Logged in, has credits, sheet OK |
| `/app/check/[id]` | Check one queued item | Same |
| `/app/sent` | Sent | Same |
| `/app/settings` | Hub, balance, Sign out | Logged in |
| `/app/settings/sheet` | Sheet check, reconnect, picker | Logged in |
| `/admin` | Orders, approve or reject, manual grant | Admin emails only |

Navigation: `/app/snap` is home. Every other app screen has a back button to it.

**Queue gotcha:** the snap queue is in memory. Keep it in a client provider in `/app/layout.tsx` so route changes keep it.

### Guard (every app open, stop at first failure)

1. Ask the server who the user is. Show a loading screen. Do not show Sign in yet.
2. No session: `/app/start`.
3. Sheet missing or broken: `/app/settings/sheet`.
4. No credits: `/app/topup`.
5. All good: `/app/snap`.

### Region and language

- `/` is English. `/id` is Indonesian. The language toggle is removed. Language follows the entry route.
- Entering through `/id` sets `zippp_region=id` and the Indonesian copy for the app. Entering through `/` sets international.
- First visit to `/` from an Indonesian IP (`x-vercel-ip-country=ID`) with no cookie: redirect once to `/id`. Remember the choice in a cookie. Never redirect again.
- Both landings have a small link to switch site.
- Top-up channel follows the region cookie: `id` shows GoPay, otherwise Paddle.

---

## 5. Credit ledger

Store in Upstash (separate client, not `kv.ts`).

### Behaviour the code must guarantee

- Spending, granting, and expiry are **atomic** (use a Lua script, or a transaction that cannot double spend).
- Every grant has an **idempotency key**. The same key never grants twice (Paddle transaction id, GoPay order id, referral reward key).
- Spending uses the lot with the earliest expiry.
- Expired lots are ignored on read and cleaned up lazily.
- Every change writes an append-only **ledger entry**: `topup_gopay`, `topup_paddle`, `referral_reward`, `referral_bonus`, `admin_grant`, `scan`, `expired`.
- Balance shown to the user: total credits and the date of the soonest expiry.

### Keys (names are suggestions)

`user:{google_user_id}` (email, ref code, referred_by, first_topup_done), `refcode:{code}`, `lots:{id}`, `ledger:{id}`, `order:{orderId}`, `orders:open`, `gopay:codes`, `idem:{key}`.

### Before the admin panel exists

`npm run grant -- <email> <credits>` writes an `admin_grant` lot. Use it for Charlie and the supporters.

---

## 6. GoPay flow (Indonesia)

### User

1. `/app/topup`: choose an amount (presets 15.000, 30.000, 50.000, 100.000, or custom, at least 15.000, in steps of 1.000).
2. Create order. The server picks an unused code from 1 to 999. Pay amount = base + code.
3. Order page shows: GoPay number and name, the exact amount, a 60 minute countdown, and an "I have paid" button.
4. After payment the user taps "I have paid". Status becomes `claimed`.
5. When the admin approves, credits appear. The page updates.

### Order states

`pending` then `claimed` then `approved`, `rejected`, or `expired`. Approve is allowed from pending, claimed, or expired (people pay late).

### Telegram (to you)

- On order creation: "New order", order id, user email, pay amount (base plus code), link to `/admin`.
- On "I have paid": a second message so you know to check GoPay.
- A Telegram failure never blocks the order. Log it.
- Bot token and chat id are server env only.

### Admin panel `/admin`

- Pending and Recent tabs: order id, email, base amount, code, pay amount, status, time.
- Approve and Reject buttons. Approve grants credits, triggers referral rewards, and sets the first-top-up flag.
- Manual grant form: email, credits, reason.
- Admin check: server-side, on every `/admin` page and every admin API route, against `ADMIN_EMAILS`. Non-admins get a 404.
- Approve must work **once**, even on double click (idempotent).

### Safety rules

- One open order per user. Maximum 5 orders per hour per user.
- A code stays reserved while its order is open. Free it on expiry.
- The GoPay number and name come from env, not hardcoded.

### Honest limits

GoPay may limit or flag a personal account that receives many small payments. Check GoPay's terms and limits. This is fine for the first users. Plan a real gateway before volume.

---

## 7. Paddle flow (international)

Sandbox first. One product, one price: 100 credits, $9, one-time.

1. `/app/topup` (international): "Buy 100 credits, $9" opens Paddle checkout.
2. Pass `google_user_id` as custom data.
3. Webhook `/api/paddle/webhook`: verify the signature. On `transaction.completed`, grant a lot (idempotency key = transaction id). Run referral rewards.
4. User returns and sees the new balance.

No subscription events. No past_due. No discounts.

Paddle takes a per-transaction fee. Check the current Paddle pricing page. $9 is well above the USD 0.70 minimum charge.

Paddle docs: every page has a `.md` version and `https://developer.paddle.com/llms.txt` lists them. Tell Pi to read those. Pi has no built-in MCP, so skip the docs MCP.

### Env vars

`PADDLE_ENV=sandbox`, `PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET`, `PADDLE_PACK_PRICE_ID`, `PADDLE_CLIENT_TOKEN` (meant to be public).

---

## 8. Referral flow

1. Every user gets a short code at first sign-in. Link: `zippp.link/?ref=CODE` (or `/id?ref=CODE`).
2. A first visit with `?ref=` stores the code in a cookie for 30 days.
3. At first sign-in only: if no referrer yet and the code is valid and not the user's own, save `referred_by`.
4. On every approved or completed top-up by a referred user:
   - Referrer gets floor(20% of the credits granted) as a lot.
   - If it is the user's first top-up, the user also gets 20 bonus credits.
5. Settings shows the user's own link and how many credits referrals have earned.

---

## 9. Env vars (all new)

| Name | Where |
|---|---|
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | server (done) |
| `ADMIN_EMAILS` | server (comma list, your Google email) |
| `GOPAY_NUMBER`, `GOPAY_NAME` | server |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | server |
| `PADDLE_*` (section 7) | server, plus the client token |

Never `NEXT_PUBLIC_` for secrets.

---

## 10. Landing and wording

All strings live in `spec/wording.md`. Edit values only. Never start a value line with `##`.

### Changes

- Remove the Business and Team plan keys and the "Two plans" title.
- Add credit pricing, referral, and top-up strings. English for `/`, Indonesian for `/id`.
- Remove the language toggle and the `$xx` placeholders.
- Fix these em dashes (your rule: none):

| Key | New en | New id |
|---|---|---|
| `meta.title` | zippp: receipts in, rows out | zippp: resi masuk, baris keluar |
| `app.capture.detected` | Receipt detected. Hold steady. | Resi terdeteksi. Tahan stabil. |
| `app.queue.keepSnapping` | Keep snapping. They queue up on their own. | Terus foto. Otomatis masuk antrean. |

### Pricing section (draft copy)

| Key | en | id |
|---|---|---|
| `landing.pricing.title` | Pay for what you scan. | Bayar sesuai jumlah scan. |
| `landing.pricing.body` | 100 scans for $9. Credits last 30 days. | Mulai Rp 15.000 untuk 100 scan. Berlaku 30 hari. |
| `landing.pricing.cta` | Get started | Mulai |
| `landing.referral.title` | Invite a friend | Ajak teman |
| `landing.referral.body` | When they top up, you get 20% back in credit. | Saat mereka isi saldo, Anda dapat 20% kembali dalam kredit. |

Style rules for new copy: short sentences, real numbers, no exclamation marks, none of: seamless, effortless, unlock, supercharge, elevate, streamline, powerful, cutting-edge. The current copy is already plain. Do not rewrite it all.

---

## 11. Manual work for Adit

### Telegram

- [ ] Create a bot with @BotFather. Copy the token to `.env.local`.
- [ ] Send any message to the bot from your account.
- [ ] Ask Pi to write a small script that prints your chat id. Put it in `.env.local`.

### GoPay and admin

- [ ] Put your GoPay number and name in `.env.local`.
- [ ] Put your Google email in `ADMIN_EMAILS`.
- [ ] Turn on GoPay app notifications so you see incoming transfers.

### Paddle sandbox

- [ ] Create the sandbox account and an API key. Put it in `.env.local`.
- [ ] Create the client-side token in the dashboard. Put it in `.env.local`.
- [ ] Let Pi create the product "100 credits" with a $9.00 one-time price through the sandbox API.
- [ ] Webhook secret: from the webhook destination Pi creates, or the dashboard. Copy it to `.env.local`.
- [ ] Add the webhook URL (a Vercel preview URL works).
- [ ] Test one sandbox purchase.

### Vercel and stores

- [ ] Confirm `BLOB_READ_WRITE_TOKEN` is set in Vercel production. If missing, tokens fall back to temporary storage and users are logged out. Prime suspect for the re-login bug.
- [ ] Push env vars with the script Pi writes. You run it.

### Pi setup

- [ ] Put this file at `spec/zippp-ship-plan.md`.
- [ ] Add `AGENTS.md` at the repo root (section 16).
- [ ] Install Paddle skills: `npx skills add https://developer.paddle.com/`.
- [ ] Use the newest DeepSeek Flash. Have Pro ready for Tasks 4, 6, 8.

### Real-device tests

- [ ] Log in, close the browser fully, reopen. Still logged in?
- [ ] Back to Snap from every screen. Queue survives navigation.
- [ ] Settings: balance shows, sign out works.
- [ ] Indonesian flow: create order, Telegram arrives, approve in panel, credits appear.
- [ ] Double click Approve: credits granted once.
- [ ] Referral: second Google account via link, first approved top-up gives the 20 credits and the referrer 20%.
- [ ] International: sandbox purchase grants 100 credits.
- [ ] Credits expire: change the lot date in Upstash, balance drops.

---

## 12. Later (specified, not today)

### Template picker and two templates

After login, pick **Expense tracker** or **Purchasing and inventory**. Existing workspaces keep their sheet.

Purchasing and inventory columns: Date, Supplier, Item, Qty, Unit, Unit price, Line amount, Tax, Receipt total, Currency, Staff, Logged by, Ref, Scan ID, Captured at, Notes. Keep Staff: everyone shares the owner's Google login, so "Logged by" is always the owner.

Expense tracker columns: Date, Merchant, Description, Qty, Amount, Tax, Total, Currency, Payment, Ref, Scan ID, Captured at, Notes. No Category.

### Receipt photo to Drive

Client compresses the photo (long edge about 1600 px, JPEG about 70%). On Send: check credits, upload to the `[zippp] receipts` Drive folder as `{ref}.jpg`, append rows with Ref and Scan ID, then spend a credit. Ref = `ZP-` plus the first 8 characters of the scan UUID. If the upload fails, nothing is sent and Retry stays. No new Google scope needed. `SPEC.md` must change: zippp keeps no copy, it writes a compressed copy to the user's own Drive.

### Also later

Batch review, team members by Google account, per-minute guard, bigger Paddle packs, QRIS gateway (replaces manual GoPay), Axiom logs.

---

## 13. Pi and DeepSeek workflow

Pi has no plan mode. This file is the plan. Pi runs one task at a time.

1. One task per fresh Pi session.
2. Prompt: "Do Task N from spec/zippp-ship-plan.md. Read sections 2 to 10 first."
3. Plan-first tasks: ask Pi to write `spec/plans/task-N.md`. Read it. Then say go.
4. Each task updates its spec file in the same change.
5. Run build and typecheck. Run the "done when" check yourself before the next task.
6. Do not edit `AGENTS.md` mid-session.
7. If the agent loops on one problem, stop and restart that task.
8. Flash with thinking on for planning and tricky logic, off for small edits. Pro for money logic and long chains.

### Safety

- Pi has no sandbox and no permission popups. It runs with your computer's permissions and can read `.env`.
- Only sandbox and dev keys in this folder. No live Paddle keys.
- Never paste keys into the agent chat. `.env` stays in `.gitignore`.
- Read `AGENTS.md` yourself before trusting it.
- Money code (ledger, approvals, webhook) is the part to review line by line.

---

## 14. Tasks and ship points

| Task | Model | Thinking | Plan first | Spec to update |
|---|---|---|---|---|
| 1 Login persistence | Flash | On | No | ARCHITECTURE |
| 2 Routes and guard | Flash | On | Yes | USER-FLOW |
| 3 Settings | Flash | Off | No | USER-FLOW |
| 4 Credit ledger | Pro | On | Yes | ARCHITECTURE, PRICING, SPEC |
| 5 Region and `/id` | Flash | On | No | ARCHITECTURE, USER-FLOW |
| 6 GoPay, Telegram, admin | Pro | On | Yes | ARCHITECTURE, USER-FLOW |
| 7 Referral | Flash | On | No | ARCHITECTURE, PRICING |
| 8 Paddle credit pack | Pro | On | Yes | ARCHITECTURE, LATER |
| 9 Landing and wording | Flash | Off | No | wording, PRICING, OFFER |

### Task 1: Login persistence

Do: find why login is lost on reopen. Check in order: (a) Blob store failing and falling back to temporary storage (look for `store.read.failed` and `store.write.failed`), (b) cookie flags and max-age, (c) does the app ask the server who the user is before showing Intro or Sign in. Report the cause first, then fix it.
Done when: log in, close the browser fully, reopen, land in the app without signing in.

### Task 2: Routes and guard

Do: write the plan, wait for review, then split the screens into the routes in section 4. Shared layout holds the queue provider. Add the guard. Back button to Snap everywhere.
Done when: each route opens only for the right state, back reaches Snap, the queue survives navigation.

### Task 3: Settings

Do: build `/app/settings` and `/app/settings/sheet`. Balance display (credits and soonest expiry, placeholder until Task 4). Sign out button (strings exist: `app.auth.signout`). Sheet check with reconnect and the existing sheet picker.
Done when: sign out works, a broken sheet shows a clear error with a fix path.

### Task 4: Credit ledger

Do: write the plan, wait for review, then build the ledger in section 5 with the Lua or transactional guarantees. Add `npm run grant`. Spend one credit on Send. Block Send and Snap at zero credits with a link to Top up. Show balance in the app header.
Done when: grant 3 credits, spend 3, the 4th Send is blocked. Two parallel Sends cannot spend the same credit. A lot dated in the past is ignored.

**Ship point A (after Tasks 1 to 4):** the app works for existing users. Top up Charlie and the supporters with `npm run grant`.

### Task 5: Region and `/id`

Do: extend the middleware per section 4. Add the `/id` landing from the Indonesian keys. Cookie-based one-time redirect. Remove the language toggle. Region cookie sets the top-up channel.
Done when: an Indonesian IP on `/` lands on `/id` once. The switch link works. No redirect loop.

### Task 6: GoPay, Telegram, admin

Do: write the plan, wait for review, then build section 6: order creation with unique codes, order page, Telegram messages, `/admin` with approve, reject, manual grant. Server-side admin check. Idempotent approve.
Done when: create order, Telegram arrives, approve in `/admin`, credits appear, double-click approve grants once, a non-admin gets 404 on `/admin`.

**Ship point B (after Tasks 5 and 6):** Indonesia can pay you. Public launch for `/id`.

### Task 7: Referral

Do: section 8. Code generation, cookie, first-sign-in lock, rewards through the ledger (idempotent), settings shows the link and earnings.
Done when: a second Google account joining by link gets 20 credits after its first approved top-up, and the referrer gets 20% of each top-up.

**Ship point C.**

### Task 8: Paddle credit pack

Do: write the plan, wait for review, then build section 7. Checkout button, webhook with signature check, idempotent grant, referral rewards.
Done when: a sandbox purchase grants 100 credits once, even if the webhook is delivered twice.

**Ship point D:** international can pay you.

### Task 9: Landing and wording

Do: section 10. English `/`, Indonesian `/id`, credit pricing and referral blocks, em dash fixes, remove plan cards and `xx` placeholders.
Done when: no em dashes remain in `wording.md`, and both landings show the right pricing.

**Ship point E.**

---

## 15. Order

1, 2, 3, 4 (ship A), 5, 6 (ship B), 7 (ship C), 8 (ship D), 9 (ship E).

If you must cut: 9 can be a copy-only edit, 8 can wait (international has no users yet), 7 can wait. Never cut the ledger tests in Task 4 or the idempotency checks in Tasks 6 and 8. Those protect your money.

---

## 16. AGENTS.md draft (repo root)

Keep under 150 lines. Do not edit mid-session. Fill in the commands.

See [`AGENTS.md`](../AGENTS.md).
