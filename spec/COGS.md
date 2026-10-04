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

**PP-OCRv6 / Baidu AI Studio — free under a daily quota (we use the free plan).**
Source: Baidu _API 配额规则及错误码说明_ (`ai.baidu.com/ai-doc/AISTUDIO/Xmjclapam`).

| Rule | Value |
|---|---|
| Daily cap | **20,000 pages / day / user / model** |
| Over cap | requests return **HTTP 429** (Too Many Requests) |
| Single file | ≤ 1000 pages recommended; only the first 1000 are parsed |
| More capacity | **free quota increase** via Baidu's questionnaire |
| Published price | **none** — no public per-page rate; enterprise goes via sales |
| Other errors | 403 token, 422 invalid params, 503 too many requests, 504 gateway timeout |

Each photo is 1 page, so the free tier covers **~20,000 receipts/day**
(≈600k/month) at no cost. Our 10s OCR budget is unrelated to the quota; a 429
simply triggers the DeepSeek-vision fallback.

## Per-receipt estimate (1-page nota, ~645 DeepSeek tokens)

| Case | DeepSeek Flash | + OCR | + Gemini fallback |
|---|---|---|---|
| peak, cache miss | **~$0.00032** (~Rp 6) | $0 (quota) | — |
| off-peak, cache miss | **~$0.00016** (~Rp 3) | $0 (quota) | — |
| last-resort path | ~$0.0003 | $0 (quota) | **~$0.0016** (only when used) |

At ~Rp 17.900/USD. So a 20-receipt pack is **well under Rp 5.000** in DeepSeek
cost, and **PP-OCRv6 is $0 while inside the 20,000-page/day free quota**.

## Money vs volume (DeepSeek structuring only)

| | 1 | 20 | 100 / mo | 1,000 / mo |
|---|---|---|---|---|
| peak | $0.00032 | **$0.0064** | $0.032 | $0.32 |
| off-peak | $0.00016 | $0.0032 | $0.016 | $0.16 |

## Verdict

The model cost is fractions of a cent per nota. The real COGS is **human QA and
the operator's time**, not tokens. Do not optimise the model bill; optimise the
Check step and the OCR accuracy.

**PP-OCRv6 is free inside the daily quota** (20k pages/day/model); there is no
published per-page price and increases are granted free on request. So the only
metered leg in normal operation is **DeepSeek Flash structuring**, at fractions
of a cent per nota; Gemini appears only on the rare last-resort path.
