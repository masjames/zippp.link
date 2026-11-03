# zippp pricing

**Direction override:** Factory `DIR-001`, `DEC-002`, `ROAD-001`.  
Monthly subscription + fair-use usage % · web checkout only (2026-11-01).  
Factory: `DEC-002`. Living offer: `OFFER.md`.

Legacy credit packs below remain **as-implemented in code** until ROAD-001 Phase 6 migrates the ledger. Do not design new screens around credits.

---

## Target model (build toward)

| Rule | Value |
|---|---|
| Plan | Monthly subscription |
| Meter | Fair-use **usage %** (Claude Pro / Max style) |
| Checkout | **Web only** |
| Android | Plan status + usage % only — no IAP, no pricing page, no purchase CTA |
| Tiers | Exact IDR/USD and cap numbers = later DEC (tune after meter ships) |

Referral / invite economics will be redesigned under subscription (not 20 credit bonuses).

---

## Legacy — prepaid credits (code today)

Updated historically: 2026-10-13. **Credits, not plans** — obsolete as north star.

- 1 credit = 1 scan spent on Accept / Terima, never on read.
- Top-up lots expire 30 days after grant; FIFO expiry spend.
- Zero credits block Snap/Send; low warn under 10.
- Indonesia: Rp 150/credit; presets from Rp 15.000; Kasera QRIS + GoPay fallback.
- International: Paddle 100 credits / $9 one-time.
- Referral: 20% referrer floor credits; referred +20 once after first top-up.

When implementing Space billing, replace this section’s authority with the subscription DEC — keep this block only as migration notes.
