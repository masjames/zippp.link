# zippp pricing

Updated: 2026-10-06. **Credits, not plans.** Supersedes the prepaid pack and
the two-plan drafts.

## Credits

- 1 credit = 1 scan: one receipt sent to the sheet.
- Credit is spent on **Send**, never on read. A failed read costs nothing.
- Every top-up creates a **lot**; a lot expires **30 days** after grant.
- Spending uses the lot that expires first.
- Zero credits: Snap and Send are blocked and the user is sent to Top up.

## Indonesia (`/id`)

- Minimum top-up **Rp 15.000**. **Rp 150 per credit.** Credits = `floor(base / 150)`.
- Presets shown: Rp 50.000 / 100.000 / 200.000 / 300.000, plus a custom amount.
- **DOKU Checkout**: QRIS, virtual account, e-wallet, card on DOKU's hosted
  page. Credits land automatically on DOKU's notification. The customer pays
  the base amount; DOKU's fee is on us (see COGS). Page expires in 60 minutes.

## International (`/`, Paddle)

- One pack: **100 credits for $9**, one-time, not a subscription.
- Bigger packs later.

## Referral

| Rule | Value |
|---|---|
| Referrer reward | 20% of each referred top-up, in credit (floor) |
| Referred bonus | 20 credits, once, after their first approved top-up |
| Applies to | DOKU and Paddle |
| Reward lots | Expire in 30 days |
| Locked | At first sign-in; one referrer, cannot change |
| Self-referral | Blocked (same Google account) |

Free credit exists **only** through the referral bonus. No trial, no free tier.

## Privacy

Client receipts: the photo goes to **Baidu AI Studio (PP-OCRv6)** for OCR; the
reconstructed text goes to **DeepSeek** for structuring. **Google Gemini** is
used only as a last-resort fallback. No free tier is used for client work.
(See `COGS.md`, `SPEC.md`.)

## History (superseded)

The 24 Sep 2026 council set a single prepaid pack ($29 / Rp 499.000 for 20).
The 29 Sep review recommended Rp 99.000 / $9 → Rp 149.000 / $12. Then two paid
monthly plans were drafted, and v4 replaced all of it with **credits**. Each
market is still priced against its own alternatives; never quote Rp and $ as if
they match.
