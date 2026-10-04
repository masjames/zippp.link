# zippp offer

Updated: 2 Oct 2026. Supersedes the prepaid-pack offer.

Not a SaaS clone. A mill: a receipt/invoice photo → structured rows in the
Google Sheet the operator already uses.

USD/IDR ~ **Rp 17.900** ([spot 24 Sep 2026](https://koran-jakarta.com/2026-09-24/dolar-as-ngamuk-lagi-rupiah-terjun-bebas-lewati-rp17900-ini-pemicunya)).
Do not quote Rp and $ as if they match.

## What we sell now

- **Self-serve app** at `zippp.link`: sign in with Google, photograph notas,
  check, send to your sheet.
- **Bilingual, region-aware:** Indonesia → Indonesian + IDR; everyone else →
  English (US) + international pricing.
- **Two paid plans, no free tier, no trial.** Prices are `xx` placeholders until
  set (see `PRICING.md` / `wording.md`).
- **Google Sheets only** — no CSV/JSON export.
- Optional **custom install** (the `$497` class) is a WhatsApp quote after a
  plan is live and rows are trusted. Not on the pricing page.

## What changed from the pack

- **Was:** $29 / Rp 499.000 prepaid pack for 20 docs, manual paste, no OAuth.
- **Now:** self-serve Google OAuth (Sheets + Drive-file), find/create the
  `[zippp]` sheet, append rows; two monthly plans, regional currency.
- CSV/JSON is gone; the sheet is the destination.

## Why the price is what it is

- **COGS is not the price.** DeepSeek Flash structuring is ~$0.0003 per receipt
  and PP-OCRv6 is low; you are selling trusted rows + done-for-you setup, not
  tokens (`COGS.md`).
- **Local alternatives set the floor.** Fastwork data-entry packs and Indonesian
  bookkeeping apps are the comparison a UMKM buyer actually makes.
- **The mill must land in their sheet, in their columns.**

## Privacy

Client receipts: photo → **Baidu AI Studio (PP-OCRv6)** for OCR; text →
**DeepSeek** for structuring; **Gemini** only as a last-resort fallback. No free
tier for client work. (See `COGS.md`, `SPEC.md`.)

## One sentence

I automate receipt and invoice data entry. Here it is working. I put it in your
stack in days.

## This flow

1. Sign in at `zippp.link` (Google).
2. Photograph notas; the queue processes them.
3. Check each one; **Send to sheet** appends the rows.
4. Rows trusted → quote the custom install via WhatsApp.

Success = a real nota landing in a real sheet without retyping.

## Parked

- Per-market price tuning and real numbers (`PRICING.md`).
- Monthly vs prepaid mechanic — monthly plans are what the app shows today.
- The `$497` custom install (quote only, after value lands).
