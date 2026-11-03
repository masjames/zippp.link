# zippp

Receipt photo to Google Sheet intake. Site: zippp.link. Prepaid credits.

## Truth
- **Agent source of truth (only doc required):**  
  `spec/themes/03-zippp-software-factory/zippp-context-for-claude.md`  
  Do not require other `spec/**/*.md` to understand the product. Update that
  file when contracts change. Edit `spec/wording.txt` for copy only.
- Every user-visible string lives in spec/wording.txt. Never hardcode copy.
- The Google Sheet is the system of record for receipts. zippp keeps no receipt ledger.
- Optional photo proof lands in the **user's** Google Drive only.
- The credit ledger (Upstash) is the only record of money and credits.
- **Next build:** Phase 4, FEAT-102 + FEAT-115. Factory already built.
  One task at a time. Details and priority live in the context file §19.

## Stack
Next.js App Router, TypeScript, Tailwind, Vercel.
google-auth-library for OAuth and Sheets. Vercel Blob or Upstash for session data (src/lib/google/kv.ts).
Upstash Redis (separate client) for credits, orders, referrals.
Paddle (sandbox) for international packs. DOKU Checkout for Indonesia. Telegram bot for admin and user alerts. Android companion under android/.
Extraction: PP-OCRv6 then DeepSeek Flash. Mobile API is dark unless MOBILE_API_ENABLED=true.

## Rules
- Do one task at a time from the context file §19 (not from archived audits).
- Never read, print or commit .env or any key. No NEXT_PUBLIC for secrets.
- Credits, orders and admin checks are decided on the server. Never trust the browser.
- Every credit grant needs an idempotency key. Spending must be atomic.
- Admin routes check ADMIN_EMAILS on the server and return 404 otherwise.
- Constants live in src/lib/billing/config.ts (and sheet-style.ts for Sheets). No magic numbers elsewhere.
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
- grant: `npm run grant -- <email> <credits>`
