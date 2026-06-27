# zippp.link Spec

## Product

zippp.link is a WhatsApp-first sales page builder for small sellers who close purchases in WhatsApp.

## MVP Scope

- Public landing page explaining the product and pricing.
- No-auth seller app for the first shippable build.
- Seller can create a page with slug, store name, description, and WhatsApp number.
- Seller can add product cards with name, price, description, optional image URL, and custom WhatsApp message.
- Public page shows products and one-tap WhatsApp CTAs.
- Basic analytics track page views and WhatsApp clicks.
- Free plan limits pages to 6 products; Starter and Pro can be manually selected in the no-auth MVP.

## Non-goals for current build

- Authentication.
- Payments/checkout.
- CRM, email automation, WhatsApp Business API, A/B testing, heatmaps.
- High-fidelity UI.

## Infrastructure

- Cloudflare Worker runtime.
- Cloudflare D1 database.
- Wrangler deploy flow.
