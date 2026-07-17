# 01 Design Principles

The taste bar for both surfaces. If a screen breaks a rule here, it is wrong even if it "works".

## Three sources, fused

1. **Refactoring UI** (Wathan/Schoger): hierarchy by size/weight/color not boxes; spacing as a first-class tool; limit choices; design in grayscale first; real content, never lorem.
2. **Abby Covert, information architecture**: label things the way the user says them; one clear structure; do not label the same thing twice; reduce the distance between intent and action.
3. **landing-page-taste skill** (Sam Crawford restraint + Marc Lou conversion + Pieter Levels honesty): the ban list below. Applies to product, not just marketing.

## The ban list (product surfaces too)

```
NEVER:
  - em-dashes / en-dashes in copy
  - pill shapes, radius > 12px (buttons 4-6px; number/avatar circles are the
    one allowed exception, used sparingly)
  - gradients, glassmorphism, floating orbs, blob SVGs, dot-grid glow
  - banned fonts: Inter, Roboto, Poppins, Space Grotesk, Montserrat, Open Sans, Lato
  - the symmetric 3-identical-card row
  - emoji as UI icons
  - fake proof, invented numbers
  - hype words: seamless, cutting-edge, unlock, elevate, supercharge, etc.
```

## Brand tokens (shared with the landing)

```
--paper    #FFFDF8   warm off-white
--ink      #171310   near-black text
--muted    #78716A   secondary text
--hairline #EDE8DF   borders, dividers
--accent   #E8442E   ONE loud accent (CTAs, links, highlights)
--wa-green #E7FFDB   WhatsApp bubble green (order/success cues only)

Fonts: Archivo (display/headings) · DM Sans (body) · Shantell Sans (accent word, sparingly)
Radius: 0, 4, 6, 8, 12 max. Spacing: 8px grid. Motion: 150-250ms ease-out, respect reduced-motion.
```

Note: the storefront is themeable per seller (see `04-templates-and-themes.md`), so tokens above are the zippp-brand defaults and the editor/dashboard chrome. Seller storefront themes swap their own paper/ink/accent within guardrails.

## Product-specific principles

```
1. FAST BEATS RICH. The buyer decides in seconds. First paint under 1s,
   catalog readable before any script runs (SSR). Setup under 5 minutes.

2. THE PRODUCT IS THE HERO. On the storefront, the seller's photos and
   prices dominate. zippp chrome is nearly invisible. We are the frame,
   not the picture.

3. ONE PRIMARY ACTION PER SCREEN. Buyer: Order. Seller onboarding: the
   next step. No competing CTAs.

4. PICK, DON'T CONFIGURE. Editor uses preset chips + live preview, never
   sliders or hex inputs (Taplink/Bento lesson, kept light).

5. LOOKS LIKE MONEY, ON FREE TOO. Free tier is beautiful-but-limited,
   never ugly-crippled. A cheap-looking free page kills the badge loop.

6. MOBILE IS THE REAL PRODUCT. Buyers arrive from IG/TikTok bios on phones.
   Design mobile-first; desktop is the afterthought.

7. ONE CHECKOUT, EVERYWHERE. The cart, cart sheet, checkout, and lightbox
   use fixed zippp chrome, identical across every shop and theme. Only the
   catalog is themed. A buyer learns the order flow once. Consistency is
   trust, and trust is part of the moat.

8. INSTANT FROM A BIO TAP. Performance is a feature. First paint under 1s,
   zero layout shift (images have aspect-ratio + lazy-load), minimal JS,
   font-display swap. Real product: edge-cached SSR per slug. A slow shop
   loses the sale before the catalog is seen.
```

## The one-sentence test

Before shipping any screen: "Does this look like a senior designer made it, and would a US jewelry seller be proud to put it in her bio?" If no, it is not done.
