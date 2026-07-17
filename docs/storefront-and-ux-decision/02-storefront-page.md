# 02 Storefront Page

The buyer-facing catalog at `zippp.link/<slug>`. This is the entire product from the buyer's view and the single most important screen. It must look like a real shop, not a link list.

## Anatomy

```
 ┌─────────────────────────────┐
 │  [avatar]  Shop Name         │  ← header: avatar, name, one-line bio,
 │            one-line bio       │    optional socials. Small, calm.
 ├─────────────────────────────┤
 │  [ promo banner ]  (Team)     │  ← optional, dismissible
 ├─────────────────────────────┤
 │  ┌────────┐  Product name     │  ← product row/card: photo, name,
 │  │ photo  │  $ price          │    price, [Order] button
 │  └────────┘  [ Order ]        │
 │  ┌────────┐  Product name     │
 │  │ photo  │  $ price          │
 │  └────────┘  [ Order ]        │
 │            ...                 │
 ├─────────────────────────────┤
 │  made with zippp (Free badge) │  ← removed on paid
 └─────────────────────────────┘
```

## Layout decisions

```
- Single column on mobile (the real product). 2-column grid allowed on
  wider screens for photo-forward templates.
- Product photo is the visual anchor. Templates decide grid vs list vs
  gallery, but the photo always leads.
- Price is always visible next to the product. This is the whole point:
  the buyer never asks "how much".
- One [Order] action per product. No wishlist, no cart page, no account.
  Tap = wa.me handoff (see 03).
- Header is small. The products are the hero, not the shop's branding.
```

## Components

```
StorefrontHeader   avatar (rounded 8px, not circle unless template says),
                   shop name (display font), bio (1 line), optional socials
PromoBanner        Team only. one line + optional link. dismissible.
ProductCard        photo, name, price, optional short desc, Order button.
                   sold-out state. optional "from" price.
OrderButton        primary action. label configurable ("Order", "Ask",
                   "Buy"). accent-colored per theme.
Footer/Badge       "made with zippp" link on Free. Hidden on paid.
```

## States (design all of them, not just the happy path)

```
- Loading        skeleton rows, never a spinner-only blank screen.
- Empty catalog   friendly "This shop is setting up" (seller shared early).
- Sold out item   greyed, "Sold out" chip, Order disabled or hidden.
- Sheet error     stale cache still served; seller sees the error, buyer
                   never sees a broken page.
- Long catalog    lazy-load images, keep scroll fast. No pagination UI if
                   avoidable.
- No photo        graceful text-forward card, still tidy (some sellers skip
                   photos). Never a broken-image icon.
```

## Data mapping (from the Google Sheet)

```
Sheet column   → Storefront
Product        → ProductCard.name
Price          → ProductCard.price (currency from shop setting)
Photo (url)    → ProductCard.photo
Stock          → sold-out state when 0
Note/Desc      → optional short description
Category       → optional grouping (later)
```

## What the storefront is NOT

```
✗ a checkout / payments page (order closes in WhatsApp, 0% fees)
✗ an account/login for buyers (zero friction)
✗ a link list (it is a shop; products, not links)
✗ a full website builder (it is one page, themeable)
```

## Success criteria

A buyer landing from an Instagram bio on a mid-range phone can understand the shop, find a price, and start a pre-filled WhatsApp order in under 10 seconds, and the page looks good enough that the seller proudly shares it.
