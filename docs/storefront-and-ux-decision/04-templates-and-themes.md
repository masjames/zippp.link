# 04 Templates & Themes

Leg 2 of the moat lives here. The rule from `business-concept.md` section 14: a few gorgeous, niche-tuned selling templates, not 100 generic ones, and never a full theme editor.

## Selling templates, not bio templates

```
Linktree / Taplink / Store.link  =  a list of links with a header
ZIPPP                            =  a SHOP layout: product grid, photo,
                                    price, tap-to-order, tuned per niche
```

## The starter set (3 to 4, ship quality over quantity)

```
1. "Boutique"   fashion / jewelry / thrift
                large photos, 2-col grid, elegant serif display, airy.
2. "Kitchen"    food / bakery / meal prep
                warm, appetizing, list with big photos, bold prices,
                daily-specials friendly.
3. "Glow"       beauty / skincare / cosmetics
                clean, soft, product-forward, minimal.
4. "Maker"      handmade / crafts / digital (optional 4th)
                story-forward, single column, personal.
```

Each must look like a paid Shopify theme. If it looks like a generic template, it fails.

## Theme token system

Each template exposes a small, safe set of tokens the seller can tweak. Presets only, no raw inputs.

```
theme = {
  palette:   one of ~6 curated palettes per template (paper/ink/accent)
  font:      one of 3-4 curated pairings (display + body)
  rounding:  4 presets, max 12px (on-brand, no pills)
  layout:    grid | list | gallery (template decides defaults)
  button:    label + fill/outline style (curated)
}
```

Guardrails: palettes are pre-checked for contrast and taste; fonts are from the allowed set (no banned fonts); rounding capped at 12px. The seller cannot build something ugly.

## Free vs paid split (design as a lever)

```
FREE   3-4 base templates, 1 curated palette each, default font.
       Beautiful but limited. "made with zippp" badge. 0% fees.
PRO    all premium templates, all palettes, font + rounding controls,
       remove branding, custom order message.
TEAM   save your own customized template, promo banner, extra pages.
ENTERPRISE  fully bespoke, own domain, white-label.
```

The paywall is variety and control, never quality. Free must still look great.

## Editing model

```
- Seller picks a template, then tweaks via preset chips (see 05).
- Live phone preview updates instantly.
- No HTML, no CSS, no background-image library, no per-block styling.
- Changing a template preserves the seller's products (sheet-driven).
```

## Explicitly out of scope

```
✗ full theme editor / 100 themes (Taplink scope trap)
✗ background image gallery
✗ custom HTML / CSS
✗ per-element design controls
These are how a solo dev loses. Depth-in-one-niche, not breadth.
```

## Success criteria

A seller in any of the four niches can, in under two minutes, land on a template that already looks like their brand, tweak two or three chips, and have a storefront they would pay to keep and proud to share.
