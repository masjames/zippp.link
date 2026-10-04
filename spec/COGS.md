# zippp COGS — extraction pipeline

Updated: 2 Oct 2026. Supersedes the old "Gemini vision" COGS.
Pipeline: `ARCHITECTURE.md`. Privacy line: `SPEC.md`, `PRICING.md`.

## What actually runs

```
photo → PP-OCRv6 (Baidu AI Studio) → reconstructed rows → DeepSeek Flash → receipt JSON
             │ fails / times out              │ fails
             ▼                                ▼
     DeepSeek Flash vision  →  Gemini 2.5 Flash (last resort)
```

The vision leg is **PP-OCRv6**; the structuring leg is **DeepSeek Flash**.
Gemini is a rarely-used last resort, not the default.

## Measured usage (prod `extract.run` logs, 1-page 4-item nota)

| Leg | Tokens / time |
|---|---|
| PP-OCRv6 | 1 page, ~3–4s OCR (10s budget) |
| DeepSeek Flash (structure) | prompt ~495, completion ~145 → **~645 total**, ~1.1–1.6s |
| DeepSeek Flash vision (fallback) | ~750 total, ~1.5s |
| Gemini 2.5 Flash (fallback) | ~1.6–5s |

## Rates (per 1M tokens)

**DeepSeek Flash** — source: `api-docs.deepseek.com/quick_start/pricing`.
Off-peak is half price; peak = 01:00–04:00 and 06:00–10:00 UTC, Mon–Fri.
Vision is supported at the same rate.

| | off-peak | peak |
|---|---|---|
| input, cache hit | $0.003 | $0.006 |
| input, cache miss | $0.15 | $0.30 |
| output | $0.60 | $1.20 |

Concurrency limit: 2500 (flash).

**Gemini 2.5 Flash** (fallback only): $0.30 input / $2.50 output per 1M.

**PP-OCRv6 / Baidu AI Studio:** billed by Baidu AI Studio against the access
token (plan/credits based). **Rate to confirm in AI Studio billing** — it is not
priced here because it is not a public per-token rate we have verified.

## Per-receipt estimate (1-page nota, ~645 DeepSeek tokens)

| Case | DeepSeek Flash | + OCR | + Gemini fallback |
|---|---|---|---|
| peak, cache miss | **~$0.00032** (~Rp 6) | TBC | — |
| off-peak, cache miss | **~$0.00016** (~Rp 3) | TBC | — |
| last-resort path | ~$0.0003 | TBC | **~$0.0016** (only when used) |

At ~Rp 17.900/USD. So a 20-receipt pack is **well under Rp 5.000** in DeepSeek
cost; the OCR leg's cost depends on the AI Studio plan.

## Money vs volume (DeepSeek structuring only)

| | 1 | 20 | 100 / mo | 1,000 / mo |
|---|---|---|---|---|
| peak | $0.00032 | **$0.0064** | $0.032 | $0.32 |
| off-peak | $0.00016 | $0.0032 | $0.016 | $0.16 |

## Verdict

The model cost is fractions of a cent per nota. The real COGS is **human QA and
the operator's time**, not tokens. Do not optimise the model bill; optimise the
Check step and the OCR accuracy.

The one cost to nail down is **Baidu AI Studio (PP-OCRv6)** — confirm its
billing against the token, then update this table.
