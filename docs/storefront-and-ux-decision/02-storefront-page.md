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
StorefrontHeader   avatar, shop name (display font), bio (1 line), socials
PromoBanner        Team only. one line + optional link. dismissible.
ProductCard        tappable photo, name, price, "Add to cart" button.
                   sold-out state. optional "from" price.
Lightbox           tap a photo -> full image, zoom (tap 1x/2x, pinch).
                   holds TWO actions: Add to cart + Ask (chat-bubble icon).
CartBar            floating, sticky bottom. item count + running total.
CartSheet          bottom sheet: line items, qty steppers, remove, total,
                   "Send order on WhatsApp" (one message, all items).
Footer/Badge       "made with zippp" link on Free. Hidden on paid.
```

The per-product card shows only **Add to cart** (one clear action). The **Ask** action (a question about that specific product) lives inside the photo lightbox, next to Add to cart, so it does not clutter the grid.

## Cart and checkout are theme-agnostic (consistency = trust)

```
Themed per shop:   catalog only (photos, names, prices, card layout, avatar,
                   accent, fonts).
Fixed zippp chrome: cart bar, cart sheet, qty steppers, checkout button,
                   lightbox. IDENTICAL across every shop and every theme.
```

A buyer who orders from one zippp shop already knows how to order from the next. One checkout to learn, everywhere. The cart/lightbox CSS uses fixed `--z-*` tokens, never the per-theme `--accent`.

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
✓ HAS a cart (client-side) that builds ONE WhatsApp order with all items
✗ but NOT an in-page payment/checkout (buyer pays the seller in WhatsApp,
  0% fees preserved: zippp never touches the money)
✗ an account/login for buyers (zero friction)
✗ a link list (it is a shop; products, not links)
✗ a full website builder (it is one page, themeable)
```

## Success criteria

A buyer landing from an Instagram bio on a mid-range phone can understand the shop, find a price, and start a pre-filled WhatsApp order in under 10 seconds, and the page looks good enough that the seller proudly shares it.
