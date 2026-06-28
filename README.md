# zippp.link

WhatsApp-first sales pages for micro-sellers. The production target is Vercel, so the live app is a static, zero-backend experience that works immediately: landing page, pricing, demo pages, a localStorage-powered seller editor, WhatsApp deep links, and QR generation.

## What ships now

- Landing page with zippp.link positioning and annual/lifetime pricing.
- Seller app at `/#/app` with four templates: DapurKit, OvenCraft, KopiSpot, and StyleLink.
- Split-screen editor saved in the browser with public preview at `/#/my-page`.
- Product cards with WhatsApp pre-filled order messages.
- Public demo at `/#/demo`.
- Vercel deployment config with SPA rewrites and basic security headers.

## Local development

```bash
npm install
npm run dev
```

## Vercel deployment

The app is intentionally static-first for the current launch. Deploy the `public/` directory through Vercel using the included `vercel.json` rewrite config:

```bash
npm run deploy
```

If the deployed site shows a blank page, check that Vercel is using this repository root and that `public/index.html` is present in the deployment output. No serverless database binding is required for the current launch build.

## Smoke check

```bash
npm run check
```
