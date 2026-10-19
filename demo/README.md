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

For the Google OAuth verification video, follow `RECORDING.md` and record with
the macOS recorder (Cmd+Shift+5). That is the primary path: a real session, real
clicks, no automation.

`npm run demo:live` (Playwright, page-only capture) exists as a fallback for a
re-record when the Mac path is unavailable. It needs a human to sign in.

Captions are burned in locally with Pillow and ffmpeg (no libass needed):

```
python3 demo/burn_captions.py --input demo/in/zippp-demo.mov \
  --output demo/out/zippp-google-verification-demo.mp4 \
  --captions demo/in/captions.json
```
