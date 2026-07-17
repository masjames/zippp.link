# 03 Storefront Flow

The buyer journey end to end, and every branch. The whole product goal: collapse the distance between "saw it" and "bought it".

## Happy path (cart)

```
IG/TikTok bio → zippp.link/shop → browse → Add to cart (repeat as needed)
                                                    │
                                                    ▼
                                    cart bar shows count + total
                                                    │
                                                    ▼
                                    open cart → adjust qty → Send order
                                                    │
                                                    ▼
                              router picks a WhatsApp number
                                                    │
                                                    ▼
                    wa.me/<number>?text=<all items + qty + total, pre-filled>
                                                    │
                                                    ▼
                    buyer's WhatsApp opens, whole order pre-typed
                                                    │
                                                    ▼
              seller receives, confirms, gets paid in chat (0% fees)
```

## Low friction from a bio tap (non-negotiable)

The buyer taps a link in an Instagram or TikTok bio on a phone. The shop must appear almost instantly, no layout shift, no heavy load. See the performance principle in `01-design-principles.md`. Slow first paint here loses the sale before the catalog is even seen.

## Side actions

```
Ask about a product   tap the photo -> lightbox -> Ask (chat-bubble icon)
                       -> wa.me question about that one product.
Zoom a photo          tap the photo -> lightbox -> tap to zoom (1x/2x),
                       pinch on mobile. Add to cart also lives here.
```

## The pre-filled message (the craft detail that matters)

```
Default template:
  "Hi {shop}! I'd like to order:
   • {product} — {price} (x1)
   Name:
   Address:"

- Free: fixed template + "Sent via zippp.link" line.
- Pro: seller customizes wording, fields, language, removes the zippp line.
- Quantity defaults to 1; buyer edits in WhatsApp.
- Keep it short. The seller should be able to act on it in one read.
```

## Routing at tap time

```
Seller numbers: [A, B, C]
On Order tap, router returns the next number:
  round-robin (Pro):  A → B → C → A ...
  weighted (Team):    by capacity share
  sticky (Team):      returning buyer → last number they used
  offline skip:       a number marked offline is skipped (shift support)

The buyer never sees this. They just get the right chat.
```

## Branches and edge cases

```
- Buyer has no WhatsApp        wa.me still opens web WhatsApp / prompts
                               install. Fallback: show the number + copy.
- Multiple items              v1: one product per tap (simple). Later:
                               a lightweight "add more" before handoff.
- Sold-out item               Order hidden/disabled; no dead handoff.
- Seller has 1 number         no routing; direct to that number (Free).
- Slug not found              clean 404 with a link to zippp.link, not a
                               stack trace.
- Sheet temporarily broken    serve last good cache; buyer flow unaffected.
- Very long message           trim gracefully; wa.me URL length is finite.
```

## Analytics touchpoints (Pro)

```
page_view        storefront opened
product_view     (optional) scroll/focus on a product
order_tap        Order pressed  ← the key conversion event
pixel_fire       Meta/TikTok pixel event on order_tap (Pro)
```

## Non-goals in the flow

```
✗ in-page checkout / card entry (breaks the 0% fees model)
✗ buyer accounts / login
The cart is client-side and persists in localStorage, but there is no
server-side order, no payment page. The order still closes in WhatsApp.
```

## Success criteria

From bio tap to a pre-filled WhatsApp order in under 10 seconds, with the correct number chosen, and no state where the buyer sees a broken or confusing screen.
