# Zippp.link — Business Concept & Blueprint

> Purpose of this document: give an AI agent (and the founder) a single, unambiguous source of truth to derive a PRD, a design spec, and a build plan. Every section pairs a diagram with a verbose explanation of what it means, why it exists, and what decision it locks. Read top to bottom; nothing here is decoration.

---

## 0. One-paragraph summary

Zippp.link is a link-in-bio catalog built for WhatsApp sellers. A seller pastes a Google Sheet of products and prices; buyers browse the catalog at `zippp.link/their-slug` and tap to order, which opens WhatsApp with the order already written. If the seller runs several WhatsApp numbers, incoming orders rotate across those numbers so none gets overloaded and no order is missed. The target buyer is a small shop in the US, UK, EU, or Australia that already sells on Instagram, TikTok, or Etsy and closes sales on WhatsApp with two to five numbers or staff. The goal is $1000 per month in recurring revenue, which for a solo builder means roughly 41 paying shops. The moat is not the feature (all features here are copyable); it is speed, brand, and being first into this specific niche's mind.

---

## 1. What this is

```
 ┌─────────────────────────────────────────────────────┐
 │                    ZIPPP.LINK                        │
 │                                                      │
 │   "One link for your WhatsApp shop.                  │
 │    Catalog + fair order routing. No website."        │
 │                                                      │
 │   A link-in-bio catalog for WhatsApp sellers:        │
 │                                                      │
 │   ┌──────────┐   ┌──────────┐   ┌──────────┐         │
 │   │  SHEET   │   │ CATALOG  │   │ ROUTING  │         │
 │   │  paste a │   │ buyers   │   │ orders   │         │
 │   │  Google  │   │ browse + │   │ spread   │         │
 │   │  Sheet = │   │ tap to   │   │ across   │         │
 │   │  instant │   │ order,   │   │ 2-5 WA   │         │
 │   │  store   │   │ WA pre-  │   │ numbers  │         │
 │   │          │   │ filled   │   │ fairly   │         │
 │   └──────────┘   └──────────┘   └──────────┘         │
 │                                                      │
 │   NOT a website. NOT a CRM. NOT WhatsApp API.        │
 │   Seller does step 3 (receive order). Done.          │
 └─────────────────────────────────────────────────────┘
```

**Explanation.** The product is three mechanics bolted into one link. First, a Google Sheet becomes a live catalog: the seller already keeps products and prices in a spreadsheet, so the learning curve is zero and editing is instant. Second, that catalog is a public page at `zippp.link/slug` where buyers browse photos and prices and tap a product to order. Third, the tap opens WhatsApp with the order pre-written, and when the seller has multiple numbers, a router decides which number receives it.

The three negatives matter as much as the positives. It is **not a website** (no hosting, no builder, no maintenance for the seller). It is **not a CRM** (no pipelines, no dashboards to learn; that complexity is what makes competitors too heavy). It is **not built on the official WhatsApp Business API** (no Meta approval, no BSP, no per-message fees). It uses plain `wa.me` deep links, which is the single technical decision that makes the whole thing buildable and runnable at zero cost. The mental model to preserve everywhere: the seller's job collapses to step 3, receive and process the order; browsing and cart are done for them.

---

## 2. Target market and niches

```
 GEOGRAPHY (high purchasing power; Indonesia deliberately skipped)
 ┌────────────────────────────────────────────┐
 │   US    UK    EU    Australia               │
 └────────────────────────────────────────────┘

 THE BUYER
 ┌────────────────────────────────────────────┐
 │ - small shop, real revenue, no website      │
 │ - sells on IG / TikTok / Etsy               │
 │ - closes the sale on WhatsApp ("DM me")     │
 │ - runs 2-5 numbers OR staff (not 1, not 50) │
 │ - no dev, no Shopify stack, wants SPEED      │
 └────────────────────────────────────────────┘

 NICHES (who this fits hardest)
 ┌─────────────┬─────────────┬─────────────┐
 │ fashion /   │ food / home │ beauty /    │
 │ jewelry /   │ bakery /    │ skincare /  │
 │ thrift      │ meal prep   │ cosmetics   │
 ├─────────────┼─────────────┼─────────────┤
 │ handmade /  │ digital /   │ resellers / │
 │ crafts      │ services    │ dropship    │
 └─────────────┴─────────────┴─────────────┘

 NOT for: enterprise, support call-centers,
          no-revenue hobbyists, CRM-wanters
```

**Explanation.** Geography is a pricing decision, not a preference. The US, UK, EU, and Australia are high-purchasing-power markets where $19 per month is a negligible business expense, which is exactly why the price can sit above the Southeast-Asian rotator tools without resistance. Indonesia is skipped on purpose: the founder lives there but has no market read on Western buyers, and the whole business is being validated against a market the founder cannot intuit, so every assumption must be tested with real humans rather than gut.

The buyer profile is deliberately narrow because a narrow buyer is a reachable buyer. The person has real revenue but no website and no developer, sells socially, and closes on WhatsApp. The "2 to 5 numbers or staff" band is the load-bearing qualifier: below it (one number, solo) the routing wedge is irrelevant and the buyer stays free; above it (large support teams) the buyer needs a real CRM and is served by heavier tools. The niches listed are the verticals where visual catalogs and DM-closing overlap most: fashion, food, beauty, handmade, digital, and resellers. The "not for" line is a guardrail against scope creep; every time a feature request implies a CRM, a call-center, or an enterprise workflow, it is out of scope by definition.

---

## 3. User intention

```
 SELLER wants...                 BUYER wants...
 ─────────────                   ────────────
 "stop retyping prices"          "just tell me the price"
 "stop dropping orders"          "order fast, no waiting"
 "spread load across phones"     "don't get ignored"
 "look pro, no website $"        "trust this is real"
 "5-min setup, I have ADHD too"  "browse before I commit"
        │                              │
        ▼                              ▼
 ┌──────────────────────────────────────────┐
 │  SHARED INTENTION: fewer steps to money   │
 │                                           │
 │  seller: skip step 1+2, just do step 3    │
 │  buyer:  skip the Q&A, just buy           │
 └──────────────────────────────────────────┘

 The whole product = collapse the distance
 between "saw it" and "bought it."
```

**Explanation.** Two parties, one shared intention, and the product only wins if it serves both at once. The seller's pains are operational: repeating prices in DMs all day, dropping orders when volume spikes, one phone flooded while others sit idle, wanting to look professional without paying for a website, and needing setup so fast it survives a short attention span. The buyer's pains are frictional: they want the price without asking, want to order without waiting on a reply, do not want to be ignored in a pile of messages, want to trust the shop is real, and want to see the goods before committing.

The synthesis is the design north star: **fewer steps to money.** For the seller that means skipping steps one and two (browsing and cart) and doing only step three (receive and process). For the buyer it means skipping the question-and-answer dance and going straight to purchase. Any feature that adds steps for either side is suspect; any feature that removes steps earns its place. This is the sentence to keep the whole team honest: the product collapses the distance between "saw it" and "bought it."

---

## 4. Product flow

```
 SELLER (one-time, under 5 min)
 ┌────────┐   ┌────────┐   ┌────────┐
 │ paste  │──►│ add    │──►│ share  │
 │ Sheet  │   │ 1-5 #s │   │ link   │
 │ URL    │   │ + mode │   │ in bio │
 └────────┘   └────────┘   └────────┘

 BUYER (every order)
 zippp.link/shop
     │
     ▼
 ┌──────────────┐   tap    ┌──────────┐   ┌───────────┐
 │ CATALOG      │─────────►│ ROUTER   │──►│ wa.me link│
 │ browse,pick  │  "Order" │ picks #  │   │ pre-filled│
 │ (step 1+2)   │          │(r-r/wght/│   │ message   │
 └──────────────┘          │ sticky)  │   └─────┬─────┘
                           └──────────┘         │
                                                ▼
                                    ┌──────────────────────┐
                                    │ Seller's WhatsApp     │
                                    │ order lands, pre-typed│
                                    │ SELLER DOES STEP 3    │
                                    └──────────────────────┘

 engine: Sheet -> card -> counter picks # -> wa.me deep link
 no API · no AI · no infra bill · $0 to run
```

**Explanation.** There are two flows and they must not be confused. The seller flow is one-time and must complete in under five minutes: paste the Google Sheet URL, add one to five WhatsApp numbers and choose a routing mode, share the link in a social bio. The five-minute ceiling is a hard product constraint, not an aspiration; if onboarding runs longer, the target buyer (and the founder's own attention) bounces.

The buyer flow runs on every order. A buyer lands on `zippp.link/shop`, browses the catalog and picks a product (this is steps one and two, done by the tool on the buyer's behalf), and taps "Order." The router selects which WhatsApp number should receive this order based on the seller's chosen mode. The tap resolves to a `wa.me` deep link with the order message pre-written, WhatsApp opens, and the order lands on the selected number where the seller does step three.

The engine line is the entire technical truth in one row: a Sheet becomes cards, a counter picks a number, a `wa.me` deep link carries the order. No official API, no AI inference, no server-side infrastructure that costs money at rest. This is why a solo builder with no budget can ship and run it.

---

## 5. System architecture

```
  SELLER SIDE                    BUYER SIDE
  ┌──────────────┐               ┌──────────────┐
  │ Google Sheet │               │ Buyer phone  │
  │ (their data) │               │ (browser)    │
  └──────┬───────┘               └──────┬───────┘
         │ paste URL                    │ visits
         │ (read-only)                  │ zippp.link/shop
         ▼                              ▼
  ┌─────────────────────────────────────────────┐
  │            ZIPPP  (your app)                 │
  │  ┌────────────┐    ┌──────────────────────┐  │
  │  │ Sheet sync │───►│  Catalog page (SSR)  │  │
  │  │ (fetch +   │    │  photos, price, stock │  │
  │  │  cache)    │    └──────────┬───────────┘  │
  │  └────────────┘               │              │
  │  ┌────────────┐               ▼              │
  │  │ Seller     │    ┌──────────────────────┐  │
  │  │ dashboard  │    │  Router (round-robin) │  │
  │  │ (edit UI)  │    │  picks next WA number │  │
  │  └────────────┘    └──────────┬───────────┘  │
  └───────────────────────────────┼──────────────┘
                                  │ builds wa.me link
                                  ▼
                        ┌────────────────────┐
                        │  WhatsApp (wa.me)  │
                        │  order pre-filled   │
                        │  -> seller's phone  │
                        └────────────────────┘

  NOTE: no WhatsApp API. Just wa.me deep links.
        = $0, no Meta approval, no BSP. THIS is why buildable.
```

**Explanation.** The system has a clean split. On the seller side sits their Google Sheet (their data, which the app reads but never owns) and the seller dashboard where they connect the sheet, manage numbers, and set routing. On the buyer side sits a phone with a browser. Between them sits the app, which does three jobs: sync the sheet (fetch and cache so the public page is fast and the sheet is not hammered), render the catalog page server-side (fast first paint, shareable, SEO-friendly), and run the router that picks the next number when a buyer orders. The output is always the same primitive: a `wa.me` link with a pre-filled message.

The architectural note is the business's foundation, not a footnote. By refusing the official WhatsApp Business API and using only `wa.me` deep links, the product avoids Meta approval, avoids a Business Solution Provider, avoids per-message fees, and avoids server infrastructure that bills at rest. That single constraint is what turns "SaaS for a broke solo founder" from a contradiction into a plan. The tradeoff, tracked in the risk section, is that the product depends on `wa.me` behavior continuing to work as it does today.

---

## 6. Router logic (the wedge, up close)

```
  Order comes in. Seller has 3 numbers.

  ROUND-ROBIN (Pro):          WEIGHTED (Team):
  order 1 -> #A               #A capacity 50% -> gets every 2nd
  order 2 -> #B               #B capacity 25%
  order 3 -> #C               #C capacity 25%
  order 4 -> #A  (loops)      (busy staff set lower)

  STICKY (Team):
  returning buyer ──► same # they bought from last time
  (looks up buyer phone -> remembers rep)

  ┌─────────────────────────────────────┐
  │  counter stored per shop            │
  │  next = (last + 1) mod (numbers)    │  ← round-robin = one line of logic
  │  skip # if seller marked "offline"  │  ← shift support
  └─────────────────────────────────────┘

  Simple. No AI. No API. Just a counter + rules.
```

**Explanation.** Routing is the paid wedge, so it is worth stating exactly how little it takes to build. Round-robin, the Pro-tier mode, is a single line: the next number is `(last + 1) mod number_count`; orders cycle A, B, C, A, and so on. Weighted, a Team-tier mode, lets the seller assign capacity shares so a busy staffer receives fewer orders. Sticky, the other Team-tier mode, routes a returning buyer back to the number they bought from last time by looking up their phone; this is a retention feature for the seller because customers reach a familiar person.

The boxed rules add the operational nuance: the counter is stored per shop, and a number marked "offline" is skipped, which is how shifts work (a staffer clocks out, their number leaves the rotation). The closing line is the point of the whole diagram: there is no AI and no API here, only a counter and a few rules. The feature is cheap to build and cheap to run, which is precisely why it can be the thing people pay for while everything around it stays free.

---

## 7. Sitemap (pages to build)

```
  PUBLIC (buyer sees)              PRIVATE (seller sees)
  ─────────────────                ─────────────────────
  zippp.link                       /dashboard
   └ landing/marketing              ├ connect sheet
                                    ├ manage numbers
  zippp.link/<shop-slug>           │  + routing mode
   └ THE catalog page              │  + offline toggle
     (the whole product            ├ preview page
      for the buyer)               ├ analytics (Pro)
                                   └ billing/plan

  AUTH
   ├ sign up / log in
   └ (Google login = easiest, they have Sheets anyway)

  BUILD ORDER (v1 smoke -> real):
   1. landing + waitlist   ← NOW (no product yet)
   2. /<slug> catalog page ← the magic, build first
   3. sheet sync
   4. dashboard + numbers + router
   5. auth + billing
   6. analytics/pixel later
```

**Explanation.** The surface area is small on purpose. Public pages are just two: the marketing landing page at the root, and the catalog page at `zippp.link/slug`, which is the entire product from the buyer's point of view. Private pages live behind auth: a dashboard to connect the sheet, manage numbers and routing, toggle a number offline, preview the page, see analytics (Pro), and manage billing. Auth should use Google login because the buyer already has a Google account for their Sheet, removing a signup step.

The build order is the anti-overwhelm plan and doubles as the ADHD guardrail. The landing page and waitlist come first and require no product, because their only job is to test demand. The catalog page is the first real thing to build because it is the magic moment; if that does not feel good, nothing else matters. Sheet sync, then the dashboard with numbers and router, then auth and billing, then analytics and pixel last. Each item is only started once the previous gate passes, which keeps the founder from building the whole system before knowing anyone wants it.

---

## 8. Pricing

```
┌──────────┬─────────────┬─────────────┬──────────────┐
│  FREE    │  PRO $19    │  TEAM $39   │ ENTERPRISE   │
│  hook    │  the money  │  grower     │ early access │
├──────────┼─────────────┼─────────────┼──────────────┤
│ 1 number │ up to 3 #s  │ up to 5-8 #s│ unlimited #s │
│ 10-15    │ unlimited   │ unlimited   │ unlimited    │
│  products│  products   │  products   │              │
│ round-   │ ROUTING ✓   │ + weighted  │ all routing  │
│  robin ✗ │  round-robin│ + sticky    │              │
│ zippp    │ custom slug │ CSV export  │ OWN DOMAIN   │
│  slug    │ PIXEL ✓     │ promo banner│ white-label  │
│ msg has  │ custom msg  │ templates   │              │
│ "via     │  + fields   │ extra pages │ [WAITLIST]   │
│  zippp"  │ no branding │             │  scarcity    │
│ badge    │ analytics   │             │              │
└──────────┴─────────────┴─────────────┴──────────────┘

 4 DOORS INTO PRO:          MONEY MATH:
 ┌─────────────────┐        30 x $19 + 11 x $39
 │ team → routing  │        = $999 ≈ $1000
 │ ads  → pixel    │        need ~41 paying
 │ brand→ custom   │        from ~500 free
 │       msg       │        (5-10% convert)
 │ grow → products │
 └─────────────────┘
```

**Explanation.** Four tiers, each with a job. **Free is the hook:** one number (so routing is impossible and stays paywalled by nature), a capped catalog of 10 to 15 products (enough to look real, tight enough to outgrow), the `zippp.link/slug`, and a "via zippp" line in the pre-filled message plus a page badge. The cap is deliberately not 5; a 5-product catalog looks empty, embarrasses the seller, and kills the badge-sharing loop that is the only free marketing. **Pro at $19 is the money tier:** up to three numbers with round-robin routing, unlimited products, custom slug, a Meta/TikTok pixel event on order tap, a customizable pre-filled message with fields, no branding, and analytics. **Team at $39 is the grower tier:** up to five to eight numbers, weighted and sticky routing, CSV export, promo banner, templates, extra pages. **Enterprise is early access:** unlimited numbers, own domain, white-label, held on a waitlist framed honestly as early access rather than a fake countdown, which doubles as a demand probe for the custom-domain feature.

Two structural points carry the revenue. First, the **four doors into Pro** widen the paying pool beyond just teams: a shop upgrades because it needs routing (team), or because it runs ads and wants the pixel, or because it wants a branded custom message, or because it outgrew the product cap. Any one pain converts, so solo sellers who do not need routing can still become paying customers. Second, the **money math** sets the concrete goal: a realistic mix of about 30 Pro and 11 Team shops is roughly $999, so the target is about 41 paying shops, which at a 5 to 10 percent free-to-paid conversion implies feeding roughly 500 free signups into the top of the funnel. Note for the smoke test: the pre-build landing page shows only the $19 price and one waitlist button; the full table is for after someone proves they will pay.

---

## 9. Positioning

```
                SIMPLE / seller-friendly
                        ▲
        Store.link ●    │    ● ZIPPP  ◄── empty quadrant.
        catalog,        │      catalog       nobody here.
        no routing,     │      + routing      YOU own it.
        free            │      + custom msg
                        │      one link
   no routing ◄─────────┼─────────► has routing
                        │
                        │    ● Konektor $13
                        │    ● Linkly $32
        Linktree ●      │    ● Privyr $20
        (just links)    │    ● Vepaar $13/user
                        │      routing, but
                        │      CS-team tools,
                        │      no catalog, heavy
                        ▼
                COMPLEX / support-team

 YOUR LINE: "made for sellers, not support teams."
 Store.link missing routing. Konektor missing catalog + too heavy.
 You = the only simple tool with both.
```

**Explanation.** The map has two axes: simple-and-seller-friendly versus complex-and-support-team on the vertical, and no-routing versus has-routing on the horizontal. The competitors cluster in three places. Store.link sits top-left: simple and free with a catalog, but no routing. Linktree sits lower-left: just links, no catalog, no routing. The routing tools (Konektor at about $13, Linkly at $32, Privyr at $20, Vepaar at $13 per user) sit bottom-right: they route, but they are built for customer-service teams, carry no product catalog, and are heavy to set up.

The top-right quadrant, simple **and** routing **and** catalog, is empty, and that is the position Zippp takes. The one-line articulation is "made for sellers, not support teams." Store.link is missing routing; the routing tools are missing the catalog and are too heavy for a small shop. Zippp is the only simple tool that carries both. Important honesty, expanded in the next section: this is a positioning wedge, not a technical moat. Every individual feature can be copied. The defensibility comes from occupying this quadrant in the buyer's mind first, and from speed and brand, the same way indie founders like Marc Lou and Pieter Levels defend their products.

---

## 10. Go-to-market

```
 You're in Indonesia. Buyers in US/UK/EU/AU. $0 budget.
 HOW does a Texas jewelry shop ever find zippp?

 ┌──────────────────┬────────┬──────┬─────┐
 │ CHANNEL          │ effort │ fit  │ $0? │
 ├──────────────────┼────────┼──────┼─────┤
 │ Reddit (r/small  │ high   │ ★★★  │ yes │ ← start here
 │  business, Etsy) │        │      │     │
 │ niche FB groups  │ high   │ ★★★  │ yes │
 │ X build-in-public│ med    │ ★★   │ yes │
 │ Product Hunt     │ 1 day  │ ★★   │ yes │ launch day
 │ SEO "whatsapp    │ slow   │ ★★★  │ yes │ compounds
 │  catalog"        │        │      │     │
 │ IG/TikTok ads    │ $$$    │ ★★★  │ NO  │ skip
 └──────────────────┴────────┴──────┴─────┘

 THE BET: 3-5 organic channels replace ad budget.
 THE RISK: slow. Maybe too slow. Smoke test tests this.
```

**Explanation.** Distribution is the hardest problem, harder than the product, because the founder is in Indonesia, the buyers are in the West, and the budget is zero. The channels are ranked by effort, fit, and whether they cost money. Reddit (small-business and Etsy communities) and niche Facebook groups are the starting point: high effort but high fit and free, and crucially they are where buyers already voice the exact pain. Build-in-public on X is medium effort and compounds through the indie-maker audience. Product Hunt is a one-day event reserved for launch. SEO around terms like "whatsapp catalog" is slow but compounds and fits perfectly. Paid IG and TikTok ads are the natural channel for this buyer but are skipped because there is no budget.

The bet and the risk are stated plainly so nobody pretends otherwise. The bet is that three to five organic channels together substitute for an ad budget. The risk is that organic is slow, possibly too slow to reach 500 signups in a reasonable window. This is not a risk that more planning can retire; it is exactly what the smoke test measures. The founder should not post as a fake Western shop owner but as the honest indie maker building in public, helping in seller communities and letting the tool surface naturally.

---

## 11. Assumptions and risks

```
 LEAP-OF-FAITH assumptions (if any is false, business dies):

 1. reachability  → can I get in front of 500 buyers at $0?
    kill test: does landing page get traffic from Reddit/X?

 2. willingness   → will they pay $19 for a copyable feature?
    kill test: does anyone join waitlist / pre-pay?

 3. wa.me holds   → does deep-link routing keep working?
    risk: WhatsApp changes wa.me rules → whole product breaks
    watch, can't control.

 4. no fast-follow→ Store.link doesn't add routing next month

 RANK: #1 and #2 are the real gates. Test both with ONE landing page.
```

**Explanation.** Four assumptions hold the business up, and if any collapses the business collapses with it. Reachability: can the founder get in front of roughly 500 target buyers at zero cost; the kill test is whether the landing page actually draws traffic from Reddit and X. Willingness: will those buyers pay $19 for a feature competitors can copy; the kill test is whether anyone joins the waitlist or pre-pays. `wa.me` durability: does WhatsApp keep allowing pre-filled deep-link behavior; this is an external dependency to watch, not control, and if WhatsApp changes the rules the core mechanic breaks. Fast-follow: does an incumbent like Store.link add routing before Zippp establishes its position.

The ranking is the important part. Assumptions one and two are the real gates, and both are tested by the same single artifact: the smoke-test landing page with a waitlist. Assumptions three and four are watched but cannot be pre-solved. The discipline this section enforces is to spend effort on what the landing page can answer, and to stop treating the other risks as reasons to keep planning instead of shipping the test.

---

## 12. Moat

```
 THREAT: Store.link (free, has catalog) adds round-robin → crushes you

 YOUR DEFENSES (thin but real):
  - speed: ship the niche-perfect tool while they serve everyone
  - brand: "zippp = the WhatsApp routing one" own positioning first
  - the slug: zippp.link/shop in 500 bios = distribution they can't take back
  - bundle: routing + pixel + custom msg + niche UX, not one copyable feature

 TRUTH: no hard moat early. Marc Lou / Levels have none either.
 Moat = speed + brand + being first to the niche's mind.
```

**Explanation.** The honest threat is that Store.link, which already has the free catalog and the audience, simply adds round-robin routing and erases the wedge. The defenses are real but thin, and pretending otherwise would be a mistake. Speed: a solo builder can ship the niche-perfect tool while a broad incumbent serves everyone and moves slower on any single niche. Brand: owning the phrase "the WhatsApp routing one" in buyers' minds is a position a latecomer has to fight for. The slug: every `zippp.link/shop` sitting in a social bio is distribution that cannot be clawed back, and the free tier deliberately multiplies these. Bundle: the paid value is routing plus pixel plus custom message plus niche-tuned UX, which is harder to match wholesale than any single feature.

The closing truth is a mindset, not a cope. Early-stage indie products rarely have a hard moat; Marc Lou and Pieter Levels built durable revenue without one. The moat is the compound of speed, brand, and being first into the niche's mind, defended by continuing to move faster and stay closer to this specific buyer than a generalist competitor will bother to.

---

## 13. Validation roadmap (gates)

```
 GATE 1: SMOKE TEST        ← you are HERE
 ┌──────────────────────┐
 │ landing page + $19    │
 │ waitlist. Post 3-5    │
 │ spots. 1-2 weeks.     │
 └──────────┬───────────┘
            │ PASS = signups / emails / "when ship?"
            │ FAIL = nobody bites → STOP. saved weeks.
            ▼
 GATE 2: MVP (catalog page + sheet + basic routing)
 ┌──────────────────────┐
 │ build ONLY if gate 1  │
 │ passed. ship to       │
 │ waitlist. get 1st use.│
 └──────────┬───────────┘
            │ PASS = people actually use it
            ▼
 GATE 3: FIRST DOLLAR
 ┌──────────────────────┐
 │ turn on billing.      │
 │ 1 paying = concept    │
 │ SOUND. then scale to  │
 │ 41. → $1000.          │
 └──────────────────────┘

 RULE: never build gate N+1 before gate N passes.
```

**Explanation.** The business advances through three gates, and the rule is absolute: never build gate N+1 before gate N passes. Gate one is the smoke test, where the founder is now: a landing page with a $19 waitlist, posted in three to five relevant places, run for one to two weeks. Passing looks like signups, emails, and people asking when it ships; failing looks like silence, and failing here is a win because it saves weeks of building the wrong thing. Gate two is the MVP, built only if gate one passed: the catalog page, sheet sync, and basic routing, shipped to the waitlist to earn first real usage; passing means people actually use it. Gate three is the first dollar: billing goes live, and a single paying customer proves the concept is sound, after which the work is scaling to about 41 paying shops for $1000 per month.

The rule is also the founder's protection against their own pattern. It converts an overwhelming "build a SaaS" into a sequence of small, reversible bets where each step is only funded by evidence from the last. The next action is not to build the product; it is to ship the landing page that tests gate one.

---

## Appendix: decisions locked by this document

- Product mechanic: Sheet catalog + `wa.me` order handoff + multi-number routing. No official WhatsApp API.
- Buyer: small WhatsApp-closing shops in US/UK/EU/AU running 2 to 5 numbers or staff.
- Wedge: the bundle in the empty "simple + routing + catalog" quadrant, positioned as "for sellers, not support teams."
- Pricing: Free (1 number, 10 to 15 products, badge) / Pro $19 / Team $39 / Enterprise waitlist. Routing is the paywall. Four doors into Pro.
- Goal: about 41 paying shops = $1000 per month.
- Smoke-test landing page shows one price ($19) and one waitlist CTA.
- Build order: landing + waitlist, then catalog page, then sheet sync, then dashboard/router, then auth/billing, then analytics/pixel.
- Gate rule: never build the next gate before the current one passes.
