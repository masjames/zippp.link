# zippp pricing

Updated: 2 Oct 2026. The old prepaid pack ($29 / Rp 499.000) is **superseded** —
see "History" at the bottom. Numbers below are **not set yet**.

## Structure

- **Two plans, both paid. No free plan, no free trial.**
- **Regional pricing:**
  - Visitors from **Indonesia** see **IDR** and the Indonesian plan copy.
  - Everyone else sees **USD** and English (US) copy.
  - The language toggle changes copy only; currency follows the visitor's region.
- Prices show as **`xx`** placeholders in the app until they are set in
  [`wording.md`](./wording.md) (`landing.planN.price.id` / `.intl`).

## The plans

| | Business / Usaha | Team / Tim |
|---|---|---|
| Price (ID) | `Rp xx` / month | `Rp xx` / month |
| Price (intl) | `$xx` / month | `$xx` / month |
| Scans | 300 / month | 1,000 / month |
| Google Sheets | 3 | 10 |
| Staff + outlet per row | yes | yes |
| Extras | saved categories | up to 10 staff, multiple outlets |

Feature lists and names are **drafts** (set in `wording.md`), not a committed
offer. There is no CSV/JSON export; Google Sheets is the only destination.

## What ships today

- Self-serve **Google sign-in** (Sheets + Drive-file scope) — no manual paste.
- Find/create the `[zippp]` sheet, map columns, append rows.
- Bilingual, region-aware landing and app.

## Privacy

Client receipts are processed by two services: the photo goes to **Baidu AI
Studio (PP-OCRv6)** for OCR, and the reconstructed text goes to **DeepSeek** for
structuring. **Google Gemini** is used only as a last-resort fallback. No free
tier is used for client work. (See `COGS.md`, `SPEC.md`.)

## History (superseded)

The 24 Sep 2026 council set a single prepaid pack: **$29 / Rp 499.000 for 20
receipts**, no monthly, manual paste. The 29 Sep review argued it was 2–7× a
human typist and moved the recommendation to **Rp 99.000 / $9** first pack →
**Rp 149.000 / $12** repeat. Neither is live. The app now presents two paid
monthly plans with regional currency and `xx` prices.

The one rule that survives every revision: **do not quote Rp and $ as if they
match.** Price each market against its own alternative.
