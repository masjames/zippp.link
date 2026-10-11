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

## Collecting a real golden set

1. Take 30 to 50 photos with your phone, including the ugly ones: handwritten
   warung notes, carbon copy, faded thermal paper, low light, a hand in frame,
   torn edges.
2. Get the files onto this machine and into `eval/images/` (Google Drive,
   AirDrop, USB, or email).
3. Create the labels skeleton:
   ```
   npm run eval -- --init
   ```
   This writes `eval/labels.json` with one case per photo and empty fields.
4. Fill in what you can: merchant, date, total, items. A field left out is not
   scored. If you only have time for one field, do totals.
5. Run the four-method comparison (paid):
   ```
   npm run eval -- --compare
   ```
   It prints, per method, accuracy and wrong and unflagged.

Photos in `eval/images/` are gitignored and never committed. You can also label
on the phone in `/admin/eval`; both paths share the same scoring.

## Admin UI

`/admin/eval` (admins only, linked from `/admin`) runs four fixed methods on each
photo and shows the reads side by side:

- OCR + DeepSeek Flash
- DeepSeek Flash vision only
- OCR + Gemini Flash
- Gemini Flash vision only

Workflow:

- Take a photo with the phone camera or upload several. Photos and labels persist
  in the browser, so a phone session survives a refresh.
- Press Run on one photo, or Run all.
- The photo is shown large and tappable to zoom, next to each method's merchant,
  date, total, items and verification flags.
- A **Test OCR** button shows the raw PP-OCRv6 result or the exact error, so a
  slow or failed OCR is visible instead of silently falling back to vision.
- Tap the method that read it best, or **All wrong** with a correction. The pick
  is also the label. Expected values are optional and collapsed; fill them to
  score accuracy against the fields.
- Save feedback. An all-wrong correction becomes a lesson.

Each run is stored server-side, and the page shows a **Set summary**: per-method
accuracy and wrong-and-unflagged across every stored run that has expected
values. Re-running a photo updates its run instead of adding a duplicate. So the
whole loop, capture, run, label, and compare, can be done from the page alone, on
a phone. The CLI is only an alternative.

The model names and the exercise toggles live in an **Advanced** drawer, closed
by default. **Force the vision retry** runs the OCR-aware re-read so you can
observe the `vision-retry` stage, and **Hedge delay** set to a small value
starts the vision leg in parallel to observe the `hedge` stage. Leave both off
for a fair comparison.

OCR is computed once per (photo, OCR model), reused across the OCR methods, and
cached in process memory for a short time. The eval gives OCR a longer budget
than production (30s) so the comparison reflects real OCR rather than a slow
fallback.

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
