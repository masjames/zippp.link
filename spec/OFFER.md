# zippp offer (repriced 24 Sep 2026)

Not a SaaS. A mill: receipt/invoice photo → structured rows in the sheet they already use.

USD/IDR ~ **Rp 17.900** ([spot 24 Sep 2026](https://koran-jakarta.com/2026-09-24/dolar-as-ngamuk-lagi-rupiah-terjun-bebas-lewati-rp17900-ini-pemicunya)). Do not quote Rp and $ as if they match.

## The [NOW] product — one prepaid pack

Same pack, two currencies. This is the list (see `PRICING.md`).

| | IDR | USD |
|---|---|---|
| Pack | **Rp 499.000** | **$29** |
| Documents | 20 receipts / invoices | 20 receipts / invoices |
| Extra | buy the pack again | buy the pack again |
| CSV / JSON | included | included |
| Their Google Sheet | included (we paste) | included (we paste) |
| Setup / install fee | no | no |
| Monthly | no, until they buy again | no, until they buy again |
| Login / OAuth | no | no |

We parse after the transfer lands. No OAuth — we paste manually into their sheet. Google OAuth for self-serve sheet write is Phase 1 (see `SPEC.md`), not this pack.

## What was wrong last time

- **Rp 350.000 ≠ $49.** $49 is ~Rp 880.000. Rp 3.500.000 ≠ $497 (~Rp 8.9jt). The two currencies were different products pretending to be twins.
- **COGS is not the price.** Gemini 2.5 Flash paid is $0.30 / 1M input tokens and $2.50 / 1M output ([Google](https://ai.google.dev/gemini-api/docs/pricing)). Free tier is still free. One receipt is cents or zero. You are selling hands + QA + 48h, not tokens.
- **Local trial was expensive vs typists, cheap vs APIs.** Fastwork input-nota packs sit around **Rp 50rb / 100rb / 175rb for 50 nota** ([example](https://fastwork.id/user/waliyyunrrz_/data-entry-42433185)). Rp 350.000 for **20** is ~5× that per nota. Taggun's API is ~**$0.05–0.06 / scan** ([Taggun](https://www.taggun.io/pricing)). Veryfi receipts **$0.08** with a **$500 / mo** floor on starter ([Veryfi FAQ, Mar 2026](https://faq.veryfi.com/en/articles/3743986-what-are-the-plans-prices-for-ocr-api)). $49 for 20 ($2.45/doc) is a paid sample with your hands, not an API war.

## Two books. Same pack, different channel.

### Book A — Indonesia (pembukuan, UMKM, WA)

Rp 499.000 / 20 docs. WhatsApp-first. Same pack as Book B, IDR price.

### Book B — USD (Product Hunt shape)

$29 / 20 docs. Same pack as Book A, USD price.

PH comps: Nolain ~$25/mo (2,000 pages), Airparser free 20 then $33/100, Receiptor from $29/mo, Receipt Converter $9/100. Lead with the pack — not a subscription, not a free tier. No $497 on the list.

## Privacy

Client receipts go through **paid Gemini**. The free tier may train on data — we do not use it for client work. Tell them. (See `COGS.md` and `SPEC.md`.)

## One sentence

I automate receipt and invoice data entry. Here it is working. I put it in your stack in days.

## This week

1. Who already has the Loom: **Book A or Book B. One number.** (Same pack, different currency.)
2. Nine more names in the same book.
3. Paid → 20 rows in *their* sheet. We paste. No OAuth.
4. Rows trusted → quote custom install via WhatsApp (not on this page).

Success = one transfer.

## Parked (not this week)

- **Rp 250.000 trial** — Bryan's "cheaper door if they flinch" (from `PRICING.md`). Not on Lili's list. Revisit if the Rp 499k door sticks.
- **Monthly (Rp 750k/mo or $29/mo tiers)** — Lili: "Monthly: no, until they buy again." Park until a buyer asks.
- **Google OAuth self-serve** — Phase 1 spec. Manual paste for now.
