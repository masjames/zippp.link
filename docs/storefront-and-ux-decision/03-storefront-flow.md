# 03 Storefront Flow

The buyer journey end to end, and every branch. The whole product goal: collapse the distance between "saw it" and "bought it".

## Happy path

```
IG/TikTok bio  →  zippp.link/shop  →  browse  →  tap Order on a product
                                                        │
                                                        ▼
                                          router picks a WhatsApp number
                                                        │
                                                        ▼
                              wa.me/<number>?text=<pre-filled order>
                                                        │
                                                        ▼
                          buyer's WhatsApp opens, message pre-typed
                                                        │
                                                        ▼
                            seller receives, confirms, gets paid in chat
                            (zippp never touches the money = 0% fees)
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
✗ in-page checkout / card entry (breaks the 0% fees model + adds friction)
✗ buyer accounts
✗ cart persistence across sessions
The flow is intentionally 3 steps for the buyer: see, tap, chat.
```

## Success criteria

From bio tap to a pre-filled WhatsApp order in under 10 seconds, with the correct number chosen, and no state where the buyer sees a broken or confusing screen.
