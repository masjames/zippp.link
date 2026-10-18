# zippp offer

Updated: 2026-10-13. **Prepaid credits**, not a pack or a plan.

Not a SaaS clone. A mill: a receipt/invoice photo → structured rows in the
Google Sheet the user already uses — one month tab, daily totals, optional
photo proof in Drive.

USD/IDR ~ **Rp 17.900** ([spot 24 Sep 2026](https://koran-jakarta.com/2026-09-24/dolar-as-ngamuk-lagi-rupiah-terjun-bebas-lewati-rp17900-ini-pemicunya)).
Do not quote Rp and $ as if they match.

## Who we sell to

| Persona | Pitch |
|---|---|
| Sonny (purchasing) | Staff snap supplier notas; the kitchen sheet fills itself. |
| Bibian (personal) | Photograph every spend; day and month totals in Sheets. |
| Fais (sales) | Recap daily sales from paper without retyping. |
| Bagas (reimburse) | One month tab + Drive photos = the claim pack. |

## What we sell now

- **Credits.** 1 credit = 1 scan. Spent on **Accept**, never on read.
- **Indonesia** (`/id`): **QRIS via Kasera Pay**, from **Rp 15.000 for 100
  scans** (Rp 150 per credit). Presets 15k / 30k / 50k / 100k; invited accounts
  start at Rp 10.000. Manual GoPay remains as a fallback.
- **International** (`/`): Paddle, **100 credits for $9**, one-time.
- **Referral**: referrer 20% of each referred top-up; referred gets 20 credits
  after first approved top-up. Only free credit. No trial, no free tier.
- **Google Sheets only.** Month tabs + Summary for zippp templates. No CSV/JSON.
- Optional **custom install** (the `$497` class) is a WhatsApp quote after a
  credit top-up and trusted rows. Not on the pricing page.

## Why credits

- COGS is fractions of a cent per scan (`COGS.md`); we sell trusted rows, not
  tokens.
- A Rp 15.000 first top-up is a low-risk door; the sheet is where value lands.
- One ledger, two channels (Kasera QRIS local, Paddle international), referrals
  and admin invitations on top.

## Privacy

Client receipts: photo → **Baidu AI Studio (PP-OCRv6)** for OCR; text →
**DeepSeek** for structuring; **Gemini** only as a last-resort fallback. Photo
proof (when on) lands in the user's Drive. No free tier for client work.
(See `COGS.md`, `SPEC.md`.)

## One sentence

I automate receipt and invoice data entry. Here it is working. I put it in your
stack in days.

## This flow

1. Sign in at `zippp.link` (Google).
2. Pick a template (kitchen, spending, sales, reimbursement, or own sheet).
3. Top up credits (QRIS in Indonesia, card via Paddle elsewhere).
4. Photograph notas; **Accept** spends one credit; rows land in the month tab.
5. Rows trusted → quote the custom install via WhatsApp.

Success = a real nota landing in a real sheet without retyping.
