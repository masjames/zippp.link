# zippp pricing

Updated: 2026-10-13. **Credits, not plans.** Revision 2 entry pack for ID.

## Credits

- 1 credit = 1 scan: one receipt sent to the sheet.
- Credit is spent on **Send / Accept**, never on read. A failed read costs nothing.
- Every top-up creates a **lot**; a lot expires **30 days** after grant.
- Spending uses the lot that expires first.
- Zero credits: Snap and Send are blocked and the user is sent to Top up.
- Low-credit warn in the header pill: under 10 credits (`LOW_CREDITS_WARN`).

## Indonesia (`/id`)

- **Rp 150 per credit.** Credits = `floor(base / 150)`.
- Minimum top-up **Rp 15.000 = 100 scans** (the entry preset).
- Presets: **Rp 15.000 / 30.000 / 50.000 / 100.000** → 100 / 200 / 333 / 666
  scans, plus a custom amount ≥ Rp 15.000.
- **Exclusive invite** (admin-issued link): the invited account may top up from
  **Rp 10.000** instead of Rp 15.000. The Rp 150 per credit rate is unchanged.
- **QRIS (Kasera Pay)**: one QRIS code, paid from any e-wallet or mobile bank.
  Credits land on Kasera's signed `payment.paid` webhook. Kasera's fee is 0.7% +
  Rp 250 (a Rp 500 minimum was observed), taken from the merchant net (see
  COGS). The payment page expires in 60 minutes. Manual GoPay stays as a
  fallback.

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
used only as a last-resort fallback. When photo proof is on, a copy is saved to
the user's Google Drive. No free tier is used for client work.
(See `COGS.md`, `SPEC.md`.)

## History (superseded)

The 24 Sep 2026 council set a single prepaid pack ($29 / Rp 499.000 for 20).
The 29 Sep review recommended Rp 99.000 / $9 → Rp 149.000 / $12. Then two paid
monthly plans were drafted, and v4 replaced all of it with **credits**. Each
market is still priced against its own alternatives; never quote Rp and $ as if
they match. Presets before 2026-10-13 started at Rp 50.000; entry is now
Rp 15.000 for 100 scans.
