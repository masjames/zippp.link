# zippp end-to-end demo video

Animated product walkthrough (landing → snap/upload → review → Sheets).

## Output

- `demo/out/zippp-end-to-end-demo.mp4` — master file (1080×1920)
- `public/zippp-demo.mp4` — same file, served at `https://zippp.link/zippp-demo.mp4`

## Regenerate

```bash
npx playwright install chromium   # once
node demo/record.mjs
```

Requires `ffmpeg` on PATH.

## Note

This is a branded storyboard demo (not a live OAuth session recording).
Auth + real camera cannot be automated without credentials / device access.

## Live verification recording

For the Google OAuth verification video, see `RECORDING.md`. Run
`npm run demo:live` for a clean page-only recording with a persistent Chrome
profile.

Captions for that recording are burned in locally:

```
python3 demo/burn_captions.py --input demo/in/zippp-demo.mov \
  --output demo/out/zippp-google-verification-demo.mp4 \
  --captions demo/in/captions.json
```
