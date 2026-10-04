# zippp

zippp (zippp.link) turns a receipt or invoice photo into clean rows in the
user's own Google Sheet. Photograph a nota, check what was read, send it.

- **Landing `/`** — bilingual (EN/ID). Region-aware: visitors from Indonesia get
  Indonesian + IDR pricing, everyone else English (US) + international pricing.
- **App `/app`** — Intro → Sign in → Capture → Check → Sent, with a per-device
  snap queue (snapping never blocks) and a live receipt-detection overlay.
- **Destination** — Google Sheets only. No CSV/JSON.

## Extraction

```
photo → PP-OCRv6 (Baidu AI Studio) → reconstructed rows → DeepSeek Flash → receipt JSON
                    │ fails/times out        │ fails
                    ▼                        ▼
            DeepSeek Flash vision  →  Gemini (last resort)
```

Every response carries an always-on **debug trace** (stages, OCR tokens, rows
sent to DeepSeek, raw model output). Structured `extract.run` JSON is logged to
Vercel runtime logs; `npm run logs` streams it live.

## Stack

Next.js (App Router) + TypeScript + Tailwind. Google OAuth + Sheets API.
Token/workspace store: private Vercel Blob → Upstash Redis → filesystem.

## Run

```bash
npm install
cp .env.example .env.local   # fill values
npm run dev                  # http://localhost:3000
```

## Env (server only — never `NEXT_PUBLIC_*`)

| Variable | Purpose |
|---|---|
| `EXTRACT_PROVIDER` | `paddle` (default) or `gemini` |
| `PADDLEOCR_AISTUDIO_TOKEN` | Baidu AI Studio token (vision/OCR) |
| `PADDLEOCR_MODEL` | default `PP-OCRv6` |
| `PADDLEOCR_BASE_URL` | default `https://paddleocr.aistudio-app.com` |
| `PADDLEOCR_TIMEOUT_MS` | OCR stage budget (default 10000) |
| `DEEPSEEK_API_KEY` / `DEEPSEEK_MODEL` / `DEEPSEEK_BASE_URL` | text structuring + vision fallback |
| `DEEPSEEK_MAX_TOKENS` / `DEEPSEEK_TIMEOUT_MS` | model call budget |
| `GEMINI_API_KEY` / `GEMINI_TIMEOUT_MS` | last-resort fallback |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI` | Sheets OAuth |
| `TOKEN_ENCRYPTION_KEY` | AES-256-GCM for the refresh token (`openssl rand -hex 32`) |
| `BLOB_READ_WRITE_TOKEN` **or** `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` | durable session store |
| `ZIPPP_DATA_DIR` | optional local override; defaults to `<repo>/.data` |

## Docs

Everything lives in **`spec/`** — start at [`spec/README.md`](./spec/README.md).
Inactive/old material is in `spec/archived/`.
