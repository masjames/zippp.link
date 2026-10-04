# zippp COGS (vision model, 24 Sep 2026)

Assumption per receipt: Google ~258 image tokens + ~250 prompt + ~600 JSON out. zippp already downscales to 1280px. 10% retry. Labor is not in this table.

## Cheapest that can see a photo

| Rank | Model | Paid in / out per 1M tok | Est. **paid** / receipt | Notes |
|---|---|---|---|---|
| 0 | **Gemini free tier** (what you have) | $0 / $0 | **$0** | [Google](https://ai.google.dev/gemini-api/docs/pricing). May train on data. Fine for cafe nota. Not for client PII. |
| 1 | **Gemini 2.5 Flash-Lite Flex / Batch** | $0.05 / $0.20 | **~$0.00014** | Same family, slower/queued. Cheapest *paid* Google. |
| 2 | **Gemini 2.5 Flash-Lite** | $0.10 / $0.40 | **~$0.00029** | Official `gemini-2.5-flash-lite`. Vision + JSON schema. [Google](https://ai.google.dev/gemini-api/docs/pricing) |
| 3 | Gemini 2.0 Flash-Lite (if still served) | $0.075 / $0.30 | **~$0.00021** | Cited as cheapest token rate in [Mar 2026 comps](https://aicostcheck.com/blog/ai-vision-multimodal-api-pricing-2026). Confirm it still exists before betting. |
| 4 | **zippp today: Gemini 2.5 Flash** | $0.30 / $2.50 | **~$0.0016** | `gemini-2.5-flash`. ~5× Lite. |
| 5 | GPT-4o mini | $0.15 / $0.60 | **~$0.0005+** | Image uses ~765 tokens, so not as cheap as the token sticker. |
| 6 | Groq `qwen/qwen3.8-27b` | $0.80 / $4.00 | **~$0.004** | Vision is live ([Groq](https://console.groq.com/docs/vision)) but **each image = 2048 input tokens**. Fast, not cheap. |
| 7 | Local Ollama / own GPU | electricity | **$0 API** | Cheapest forever. Quality, speed, and your Mac are the cost. |

OpenRouter `:free` can be $0. Do not build a mill on it (catalog rotates). That is already in `SPEC.md`.

## Money vs the pack

| | 1 receipt | 20 (one pack) | 100 / month | 1,000 / month |
|---|---|---|---|---|
| Free Flash / Lite | $0 | $0 | $0 | $0 until quota |
| Flash-Lite paid | $0.00029 | **$0.006** | $0.03 | $0.29 |
| Flash paid (now) | $0.0016 | **$0.03** | $0.16 | $1.60 |
| Groq Qwen vision | $0.004 | $0.08 | $0.40 | $4 |

At ~Rp 17.900 / USD: Flash-Lite is about **Rp 5 per nota**. A 20-pack of model cost is about **Rp 100**.

Revenue on the prepaid pack ($29 / Rp 499k) minus model COGS is ~100%. The real COGS is **your eyes and the cafe hours**, not Gemini.

## Verdict

The cheapest *working* vision call is still **Gemini free**. The cheapest *paid* managed vision call that still fits this stack (JSON schema, image in, one key) is **`gemini-2.5-flash-lite`**, Flex if you can wait.

Do not switch Groq to save money. It is slower-wallet, not slower-model. Do not chase a $0.02/pack save until a client’s receipts fail Lite. Quality on crumpled Indonesian thermal paper is the constraint, not tokens.
