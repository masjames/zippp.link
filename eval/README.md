# eval

Labeled receipts for measuring extraction accuracy. Real photos are supplied by
the operator and are **not committed** (`eval/images/` is gitignored).

## Format

`labels.json` holds one case per photo:

```json
{
  "cases": [
    {
      "file": "nota-01.jpg",
      "merchant": "Toko Sumber Jaya",
      "date": "2026-10-06",
      "items": [
        { "description": "Beras 5kg", "qty": 1, "amount": 75000 }
      ],
      "total": 75000
    }
  ]
}
```

`merchant`, `date`, `items` and `total` are optional. A missing field is not
scored. Put the photos in `eval/images/` (or pass `--images <dir>`).

## Run

```
npm run eval
npm run eval -- --ocr PP-OCRv6 --model deepseek-flash
npm run eval -- --ocr PaddleOCR-VL-1.6 --model deepseek-pro
npm run eval -- --list
npm run eval -- --json
```

The script imports the pipeline with the requested `PADDLEOCR_MODEL`,
`DEEPSEEK_MODEL` and `EXTRACT_PROVIDER`, runs each image, and prints per-field
accuracy plus **wrong and unflagged**, the number of wrong values that the
verifier did not flag. That last number is the one to drive to zero.

Do not run paid model comparisons without asking first.

## Admin UI

`/admin/eval` (admins only, linked from `/admin`) does the same comparison in
the browser:

- edit the model configs (provider, OCR model, DeepSeek model, Gemini model),
- take a photo with the phone camera or upload several, and label merchant,
  date, total and items; the photo list and labels persist in the browser, so a
  phone session survives a refresh,
- optionally import a `labels.json` to fill labels by file name,
- run, then read the per-config accuracy table and the wrong-and-unflagged count.

Two exercise toggles let you observe the reliability paths:

- **Force the vision retry** runs the OCR-aware vision re-read even when the
  verifier did not ask for it. The Debug panel then shows the `vision-retry`
  stage and whether it was accepted.
- **Hedge delay** overrides `PADDLEOCR_HEDGE_MS`. Set it to a small value (for
  example 1) to start the vision leg in parallel and observe the `hedge` stage.

OCR is computed once per (photo, OCR model) and reused across the structuring
configs, both inside one request and in a short-lived in-process cache, so a
comparison does not pay for the same OCR several times. Keep the hedge disabled
(0, the default) for fair comparisons.

## The improvement loop

1. Run a comparison, pick the best reading per photo, or mark it all wrong and
   describe what zippp got wrong and how it should be. Save feedback.
2. An all-wrong correction becomes a **lesson** on `/admin/lessons`, together
   with a summary of which config won the most.
3. Review the lesson, edit its title and detail, then approve or reject it.
4. Approving opens a **change request**: a branch `zippp/lesson/<id>` from the
   default branch, a dossier at `eval/lessons/<id>.md`, and a pull request. It
   sends a Telegram message with the pull request link and records a **release**
   on `/admin/releases`.
5. A developer (or the agent) implements the fix on that branch, runs `npm test`
   and `npm run build`, and merges. Merging deploys through the Vercel GitHub
   integration. The releases page has a manual **Deploy now** button for a
   `VERCEL_DEPLOY_HOOK_URL` if you ever need one.

Prerequisites: `GITHUB_TOKEN` (Contents and Pull requests write) and optionally
`GITHUB_REPO` (default `masjames/zippp.link`). Without the token, approving
still records the release and notifies Telegram, but no branch or pull request is
opened. `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` are already used by the
top-up alerts. Feedback, lessons and releases are stored with the same backend
as the session store (Vercel Blob or Upstash Redis, else the `.data`
filesystem).
