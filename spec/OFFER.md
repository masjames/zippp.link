# zippp offer

Updated: 2026-10-06. **Prepaid credits**, not a pack or a plan.

Not a SaaS clone. A mill: a receipt/invoice photo → structured rows in the
Google Sheet the operator already uses.

USD/IDR ~ **Rp 17.900** ([spot 24 Sep 2026](https://koran-jakarta.com/2026-09-24/dolar-as-ngamuk-lagi-rupiah-terjun-bebas-lewati-rp17900-ini-pemicunya)).
Do not quote Rp and $ as if they match.

## What we sell now

- **Credits.** 1 credit = 1 scan. Spent on **Send**, never on read.
- **Indonesia** (`/id`): GoPay, minimum Rp 15.000 (Rp 150 per credit). Pay to the
  number in env; an admin approves in `/admin`.
- **International** (`/`): Paddle, **100 credits for $9**, one-time.
- **Referral**: the referrer earns 20% of each referred top-up in credit; the
  referred user gets 20 credits after their first approved top-up. This bonus is
  the only free credit we give. No trial, no free tier.
- **Google Sheets only.** No CSV/JSON.
- Optional **custom install** (the `$497` class) is a WhatsApp quote after a
  credit top-up and trusted rows. Not on the pricing page.

## Why credits

- COGS is fractions of a cent per scan (`COGS.md`); we are selling trusted rows,
  not tokens.
- A cheap first top-up is a low-risk door; the sheet is where value lands.
- One ledger, two channels (GoPay local, Paddle international), referrals on top.

## Privacy

Client receipts: photo → **Baidu AI Studio (PP-OCRv6)** for OCR; text →
**DeepSeek** for structuring; **Gemini** only as a last-resort fallback. No free
tier for client work. (See `COGS.md`, `SPEC.md`.)

## One sentence

I automate receipt and invoice data entry. Here it is working. I put it in your
stack in days.

## This flow

1. Sign in at `zippp.link` (Google).
2. Top up credits (GoPay in Indonesia, card via Paddle elsewhere).
3. Photograph notas; the queue processes them; **Send** spends one credit.
4. Rows trusted → quote the custom install via WhatsApp.

Success = a real nota landing in a real sheet without retyping.
