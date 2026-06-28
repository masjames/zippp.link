# Deployment Notes

zippp.link deploys on Vercel as a static single-page app from `public/index.html`.

## Why the Vercel page was blank

The repository previously contained a non-Vercel server entrypoint and deployment config. Vercel did not have a static entry file to serve, so a Vercel project pointed at this repository could build without showing the intended application. The fix is to provide Vercel-native static assets and a `vercel.json` rewrite that sends all routes to `/index.html`.

## Current deployment shape

- Runtime: Vercel static hosting.
- Entry file: `public/index.html`.
- Routing: hash routes plus Vercel SPA fallback rewrites.
- Persistence: browser `localStorage` for the launch editor.
- External services: WhatsApp deep links and QR image generation.

## Verification checklist

1. `npm run check` passes locally.
2. `npx vercel deploy --prod` completes and prints a production URL.
3. Open `/`, `/#/pricing`, `/#/demo`, and `/#/app` on the production URL.
4. Click a WhatsApp CTA and confirm it opens `wa.me` with a pre-filled product message.
5. Create a page in `/#/app`, edit the store name, and open `/#/my-page`.
