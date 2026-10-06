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
