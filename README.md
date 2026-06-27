# zippp.link

Black-and-white MVP for WhatsApp-first sales pages.

## What ships now

- Landing page with zippp.link positioning and annual pricing.
- No-auth seller app at `/app`.
- Create/edit sales pages.
- Add products with prices and WhatsApp messages.
- Public slug pages at `/:slug`.
- WhatsApp click redirects and basic D1 analytics.
- Cloudflare Worker + D1 deployment config.

## Local development

```bash
mise install
npm install
npm run dev
```

## Cloudflare

This project uses Cloudflare Workers and D1. Wrangler 4 requires Node.js 22+, pinned through `mise.toml`. Create or bind the `zippp-link-db` D1 database, run migrations, then deploy:

```bash
npx wrangler d1 migrations apply zippp-link-db --remote
npm run deploy
```
