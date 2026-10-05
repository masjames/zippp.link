# zippp

Receipt photo to Google Sheet intake. Site: zippp.link. Prepaid credits.

## Truth
- spec/ is the source of truth. Update the owning spec file in the same change.
- Every user-visible string lives in spec/wording.md. Never hardcode copy.
- The Google Sheet is the system of record for receipts. zippp keeps no receipt ledger.
- The credit ledger (Upstash) is the only record of money and credits.
- The ship plan is spec/zippp-ship-plan.md. Do one task at a time.

## Stack
Next.js App Router, TypeScript, Tailwind, Vercel.
google-auth-library for OAuth and Sheets. Vercel Blob or Upstash for session data (src/lib/google/kv.ts).
Upstash Redis (separate client) for credits, orders, referrals.
Paddle (sandbox) for international packs. Manual GoPay orders for Indonesia. Telegram bot for admin alerts.
Extraction: PP-OCRv6 then DeepSeek Flash.

## Rules
- Do one task at a time from spec/zippp-ship-plan.md.
- Never read, print or commit .env or any key. No NEXT_PUBLIC for secrets.
- Credits, orders and admin checks are decided on the server. Never trust the browser.
- Every credit grant needs an idempotency key. Spending must be atomic.
- Admin routes check ADMIN_EMAILS on the server and return 404 otherwise.
- Constants live in src/lib/billing/config.ts. No magic numbers elsewhere.
- Check is required before Send. No auto-send.
- Never invent values from a receipt. Unknown stays empty.
- No em dashes and no hype words in user-facing text.
- After each task run build and typecheck. Report results. Do not say done until both pass.
- If a task is unclear, ask one question. Do not guess.

## Commands
- dev: `npm run dev`
- build: `npm run build`
- typecheck: `npx tsc --noEmit`
- logs: `npm run logs`
- grant: `npm run grant -- <email> <credits>` (added in Task 4)
