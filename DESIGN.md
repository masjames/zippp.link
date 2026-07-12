# Zippp.link - Design System & Wireframes

## 1. Design Philosophy (Iteration 1)
- **Theme:** Minimalist Black & White.
- **Focus:** Content, typography, and clear conversion paths.
- **Colors:**
  - Background: #FFFFFF (White)
  - Text: #111827 (Near Black)
  - Primary Action (Buttons): #000000 (Black) with #FFFFFF text.
  - Borders/Dividers: #E5E7EB (Light Gray)
- **Components:** High contrast, sharp edges or slight rounding (2px-4px radius). No unnecessary shadows.
- **Responsive:** Mobile-first approach. All views must look perfect on mobile since this is a WhatsApp store builder.

## 1.1 Typography

Unified B&W type system. Both body/UI text and main headings use Archivo, while section titles and accents on landing pages use Excalifont.

- **Body / UI text & Headings:** **Archivo** (Google Fonts). All product copy, form labels, dashboard tables, product descriptions, and main H1 headings use Archivo (tight letter-spacing for headings, normal weights for body).
- **Section Titles (Landing H2s) & Accents:** **Excalifont** (Excalidraw's open-source hand-drawn font). Used for landing page H2 section titles (e.g. "WHY ZIPPP", "HOW IT WORKS", "PRICING") and section eyebrow labels/badges to give a hand-drawn accent.
- Both are open-source/free and load via `next/font/google` (Archivo) and self-hosted woff2 (Excalifont, from the Excalidraw repo).

```css
--font-body: 'Archivo', sans-serif;
--font-heading: 'Archivo', sans-serif;
--font-accent: 'Excalifont', cursive;
```

Usage rule: one Excalifont element per section, max. If everything is hand-drawn, nothing reads as an accent.

---

## 2. Seller Journey Wireframes (S1–S10)

> Screen IDs match SPEC.md §3 Seller Screen Inventory.

### S1. Landing Page

```text
+-------------------------------------------------------------+
|  ZIPPP.LINK                    [ View Demo ] [ Login ]      |
+-------------------------------------------------------------+
|  Turn Instagram followers into WhatsApp orders               |
|  in 2 minutes              <- H1, Archivo                    |
|  Stop juggling DMs, screenshots, and a Sheet 6 versions      |
|  behind. One link, qty + auto total, straight to WhatsApp.   |
|                                                              |
|  [ Create my WhatsApp store, free ]  [ Continue w/ Google ]  |
|  23/100 spots claimed • 247 sellers in 12 countries          |
|                                                              |
|  --- Jane's Thrift (live preview) ---                        |
|  [IMG] Brownie Box 6pcs   $12   [-] 1 [+]                   |
|  [IMG] Vintage Hoodie M   $18   [-] 1 [+]                   |
|  [IMG] Gel Nail Set       $22   [-] 1 [+]                   |
|  3 items · Total: $52     [ Order on WhatsApp ]              |
+-------------------------------------------------------------+
|  WORKS WITH  <- eyebrow, Excalifont                          |
|  Sheets, Shopify, Zapier                                    |
+-------------------------------------------------------------+
|  WHY ZIPPP  <- H2, Excalifont                                 |
|  DMs full of "price?" / screenshots lost / Sheet out of sync |
+-------------------------------------------------------------+
|  HOW IT WORKS  <- H2, Excalifont                              |
|  1. Import  2. Share, qty, live total                        |
|  3. Order → WhatsApp + auto-append Sheet                     |
+-------------------------------------------------------------+
|  [ Try the full demo ]  →  /demo                             |
+-------------------------------------------------------------+
|  OUTCOMES  <- H2, Excalifont                                  |
|  2-min setup / no double inventory / paid before delivery /  |
|  Zapier → 5000 apps                                          |
+-------------------------------------------------------------+
|  Integrations: Sheets (Live) | Roadmap: Shopify, Zapier...   |
+-------------------------------------------------------------+
|  Testimonials: 3 quotes + "be next" CTA                      |
+-------------------------------------------------------------+
|  PRICING  <- H2, Excalifont                                   |
|  Early Believer $0 | Coffee $5 | Pro $19 [MOST POPULAR       |
|                                           <- Excalifont badge]|
|  | Lifetime $59                                              |
+-------------------------------------------------------------+
|  Founder: Lucky, Malang → X DM, WA                           |
+-------------------------------------------------------------+
|  FAQ (6 Q&A)                                                 |
+-------------------------------------------------------------+
|  Final CTA: [ Create my store, free, 2 min ]                |
+-------------------------------------------------------------+
```

### S2. Google Sign-In

```text
+-------------------------------------------------------------+
|  ┌─────────────────────────────────┐                        |
|  │   ┌──┐  Sign in with Google    │                        |
|  │   │G │                         │                        |
|  │   └──┘  Choose an account      │                        |
|  │                                │                        |
|  │   📧 user@gmail.com            │                        |
|  │   ─────────────────────        │                        |
|  │   📧 other@gmail.com           │                        |
|  │   ─────────────────────        │                        |
|  │   + Use another account        │                        |
|  │                                │                        |
|  └─────────────────────────────────┘                        |
|  (Native Google OAuth popup — we don't control this UI)     |
+-------------------------------------------------------------+
```

### S3. Store Setup (Onboarding)

```text
+-------------------------------------------------------------+
|  ZIPPP.LINK                                    [Avatar] v   |
+-------------------------------------------------------------+
|                                                             |
|  Let's set up your store ✨        <- H1, Archivo           |
|  Takes about 30 seconds.          <- body, Archivo          |
|                                                             |
|  Store name                                                 |
|  ┌─────────────────────────────────────────────────────┐    |
|  │ My Coffee Shop                                      │    |
|  └─────────────────────────────────────────────────────┘    |
|  zippp.link/my-coffee-shop  ← auto-generated slug preview  |
|                                                             |
|  WhatsApp number                                            |
|  ┌────────┐ ┌──────────────────────────────────────────┐    |
|  │ +62  ▼ │ │ 812 3456 7890                            │    |
|  └────────┘ └──────────────────────────────────────────┘    |
|  This is where your customers will message you.             |
|                                                             |
|              [ Create my store → ]                          |
|                                                             |
+-------------------------------------------------------------+
```

### S4. Add Product

```text
+-------------------------------------------------------------+
|  ZIPPP.LINK                                    [Avatar] v   |
+-------------------------------------------------------------+
|                                                             |
|  Add a product                    <- H1, Archivo            |
|                                                             |
|  ┌─────────────────────────────────────────────────────┐    |
|  │                                                     │    |
|  │           📷 Drag image here                        │    |
|  │           or click to upload                        │    |
|  │           (max 5MB, JPG/PNG/WebP)                   │    |
|  │                                                     │    |
|  └─────────────────────────────────────────────────────┘    |
|                                                             |
|  Product name                                               |
|  ┌─────────────────────────────────────────────────────┐    |
|  │ Coffee Beans 200g                                   │    |
|  └─────────────────────────────────────────────────────┘    |
|                                                             |
|  Price                                                      |
|  ┌──────────────────────┐                                   |
|  │ $ 10.00              │                                   |
|  └──────────────────────┘                                   |
|                                                             |
|  Description (optional)                                     |
|  ┌─────────────────────────────────────────────────────┐    |
|  │ Single-origin Arabica from Malang, medium roast.    │    |
|  │                                                     │    |
|  └─────────────────────────────────────────────────────┘    |
|                                                             |
|  [ + Add another product ]       [ Done, show my store → ] |
|                                                             |
+-------------------------------------------------------------+
|                                                             |
|  Products added (2/5):           <- Free tier counter       |
|  ✓ Coffee Beans 200g — $10                                  |
|  ✓ V60 Dripper — $25                                        |
|                                                             |
+-------------------------------------------------------------+
```

### S5. Preview & Copy Link (First Visit)

```text
+-------------------------------------------------------------+
|  ZIPPP.LINK    [Store] [Products] [Settings]    [Avatar] v  |
+-------------------------------------------------------------+
|                                                             |
|  🎉 Your store is live!          <- H1, Archivo             |
|                                                             |
|  ┌─────────────────────────────────────────────────────┐    |
|  │  zippp.link/my-coffee-shop            [ 📋 Copy ]   │    |
|  └─────────────────────────────────────────────────────┘    |
|  ✓ Link copied!  <- appears after click, fades after 2s    |
|                                                             |
|  Share on:  [Instagram] [TikTok] [WhatsApp Status]          |
|                                                             |
|  ┌───────────────── LIVE PREVIEW ─────────────────────┐    |
|  │  +----------------------+                          │    |
|  │  |      MY COFFEE SHOP  |                          │    |
|  │  |                      |                          │    |
|  │  |  ----------------    |                          │    |
|  │  |  [IMG]               |                          │    |
|  │  |  Coffee Beans 200g   |                          │    |
|  │  |  $10    [ + Add ]    |                          │    |
|  │  |  ----------------    |                          │    |
|  │  |  [IMG]               |                          │    |
|  │  |  V60 Dripper         |                          │    |
|  │  |  $25    [ + Add ]    |                          │    |
|  │  |                      |                          │    |
|  │  | [Order on WhatsApp]  |                          │    |
|  │  +----------------------+                          │    |
|  └────────────────────────────────────────────────────┘    |
|                                                             |
|  [ Go to Dashboard → ]                                      |
|                                                             |
+-------------------------------------------------------------+
```

### S6. Dashboard (Daily Use — Free Tier)

```text
+-------------------------------------------------------------+
|  ZIPPP.LINK    [Store] [Products] [Settings]  [Avatar 🔴] v |
+-------------------------------------------------------------+
|  ┌─────────────────────────────────────────────────── [ ✕ ]┐ |
|  │  📢 New: We just launched Shopify Import! Try it now.   │ |
|  └─────────────────────────────────────────────────────────┘ |
|                                                             |
|  Your Store: zippp.link/my-store           [ Copy Link ]    |
|                                                             |
|  +----------------+  +----------------+  +----------------+ |
|  | 📈 Views       |  | 💬 WA Clicks   |  | 📦 Plan        | |
|  | 120            |  | 15             |  | Free           | |
|  | today          |  | today          |  | [ Upgrade ]    | |
|  +----------------+  +----------------+  +----------------+ |
|                                                             |
|  Products (2/5)                                [ + Add ]    |
|  ---------------------------------------------------------  |
|  [IMG] Coffee Beans 200g           $10         [ Edit ]     |
|  [IMG] V60 Dripper                 $25         [ Edit ]     |
|                                                             |
|  ---------------------------------------------------------  |
|  Analytics (last 24 hours only)    🔒 Full history          |
|  ┌─────────────────────────────────────────────────────┐    |
|  │  ▁▂▃▅▇▅▃▂▁  (24h sparkline)                        │    |
|  └─────────────────────────────────────────────────────┘    |
|                                                             |
+-------------------------------------------------------------+
|  Powered by Zippp.link                                      |
+-------------------------------------------------------------+
```

**Avatar dropdown (notification badge):**
```text
  ┌──────────────────────┐
  │  👤 My Account       │
  │  ─────────────────── │
  │  🔔 Notifications (2)│  <- unread count
  │  ─────────────────── │
  │  📢 New: Shopify!    │  <- latest notification preview
  │  📢 v2.1 Release     │
  │  ─────────────────── │
  │  [ Log out ]         │
  └──────────────────────┘
```

### S6b. Dashboard — Free Tier Product Limit Reached

```text
+-------------------------------------------------------------+
|  Products (5/5)                                             |
|  ---------------------------------------------------------  |
|  [IMG] Coffee Beans 200g           $10         [ Edit ]     |
|  [IMG] V60 Dripper                 $25         [ Edit ]     |
|  [IMG] Chemex 6-cup                $45         [ Edit ]     |
|  [IMG] Aeropress                   $30         [ Edit ]     |
|  [IMG] Gooseneck Kettle            $35         [ Edit ]     |
|                                                             |
|  ┌─────────────────────────────────────────────────────┐    |
|  │  🔒 [ + Add ] — Upgrade to add unlimited products   │    |
|  └─────────────────────────────────────────────────────┘    |
|                                                             |
+-------------------------------------------------------------+
```

### S7. Upsell Popup (Bottom Sheet — Two Steps)

**Step 1: Micro-commitment question**
```text
+-------------------------------------------------------------+
|  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ (dimmed dashboard)       |
|  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░                          |
|  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░                          |
|  +----------------------------------------------------------+
|  |                                                          |
|  |  Quick check — are you getting       <- body, Archivo    |
|  |  WhatsApp chats from your link? 👀                       |
|  |                                                          |
|  |  [ Yes, love it! ]                   <- primary button   |
|  |  [ Not yet ]                         <- secondary button |
|  |                                                          |
|  |  ──── or ────                                            |
|  |  [ ✕ Dismiss ]                       <- text link        |
|  |                                                          |
|  +----------------------------------------------------------+
```

**Step 2: Name Your Price (if "Yes")**
```text
|  +----------------------------------------------------------+
|  |                                                          |
|  |  Awesome! 🎉                         <- H2, Archivo      |
|  |  Keep your link alive for a whole year!                  |
|  |                                                          |
|  |  Name your price:                                        |
|  |  ┌──────────────────────┐                                |
|  |  │ $  ________         │  /yr                            |
|  |  └──────────────────────┘                                |
|  |  (minimum $5)                                            |
|  |                                                          |
|  |  What you unlock:                                        |
|  |  ✓ Unlimited products & links                            |
|  |  ✓ Remove Zippp branding                                 |
|  |  ✓ Full analytics history                                |
|  |  ✓ Custom WhatsApp message                               |
|  |  ✓ Shopify product import                                |
|  |  ✓ Google Sheets order sync                              |
|  |                                                          |
|  |  [ Pay & Unlock All → ]              <- primary button   |
|  |                                                          |
|  |  I don't want to pay / don't have the money.             |
|  |  Contact me, I will help you.        <- empathy text     |
|  |                                                          |
|  +----------------------------------------------------------+
```

**Step 2b: "Not yet" path**
```text
|  +----------------------------------------------------------+
|  |                                                          |
|  |  No worries! 🤝                                          |
|  |  Here are a few tips to get your first orders:           |
|  |                                                          |
|  |  1. Share your link on Instagram Stories                  |
|  |  2. Pin it in your TikTok bio                            |
|  |  3. Send it to your WhatsApp contacts                    |
|  |                                                          |
|  |  [ Got it, back to dashboard ]                           |
|  |                                                          |
|  +----------------------------------------------------------+
```

### S8. Polar Checkout (External)

```text
+-------------------------------------------------------------+
|  polar.sh                                                   |
+-------------------------------------------------------------+
|                                                             |
|  Zippp.link — Yearly Plan                                   |
|                                                             |
|  Amount: $____ /yr  (pre-filled from user's choice)         |
|                                                             |
|  ┌─────────────────────────────────────────────────────┐    |
|  │  Card number                                        │    |
|  │  ____  ____  ____  ____                             │    |
|  │  MM/YY          CVC                                 │    |
|  └─────────────────────────────────────────────────────┘    |
|                                                             |
|  [ Pay $____ ]                                              |
|                                                             |
|  (We don't control this UI — Polar.sh handles it.)          |
|  After success → redirect to /dashboard?upgraded=true       |
|                                                             |
+-------------------------------------------------------------+
```

### S9. Paid Dashboard (After Upgrade)

```text
+-------------------------------------------------------------+
|  ZIPPP.LINK    [Store] [Products] [Settings]    [Avatar] v  |
+-------------------------------------------------------------+
|                                                             |
|  🎉 Welcome to the paid plan!     <- toast (first load)     |
|                                                             |
|  Your Store: zippp.link/my-store           [ Copy Link ]    |
|                                                             |
|  +----------------+  +----------------+  +----------------+ |
|  | 📈 Views       |  | 💬 WA Clicks   |  | 📦 Plan        | |
|  | 1,247          |  | 89             |  | Paid ($10/yr)  | |
|  | all time       |  | all time       |  | Renews Jan '27 | |
|  +----------------+  +----------------+  +----------------+ |
|                                                             |
|  Products (7)                                  [ + Add ]    |
|  ---------------------------------------------------------  |
|  [IMG] Coffee Beans 200g           $10         [ Edit ]     |
|  [IMG] V60 Dripper                 $25         [ Edit ]     |
|  [IMG] Chemex 6-cup                $45         [ Edit ]     |
|  [IMG] Aeropress                   $30         [ Edit ]     |
|  [IMG] Gooseneck Kettle            $35         [ Edit ]     |
|  [IMG] Filter Papers (100pk)       $8          [ Edit ]     |
|  [IMG] Coffee Grinder              $55         [ Edit ]     |
|                                                             |
|  ---------------------------------------------------------  |
|  Analytics (full history)                                   |
|  ┌─────────────────────────────────────────────────────┐    |
|  │  Views ▼                  [7d] [30d] [All]          │    |
|  │                                                     │    |
|  │  1,500 ┤                                            │    |
|  │  1,000 ┤          ╱╲     ╱╲                         │    |
|  │    500 ┤    ╱╲╱╲╱╱  ╲╱╲╱  ╲╱╲                      │    |
|  │      0 ┤╱╲╱                    ╲                    │    |
|  │        └────────────────────────────                 │    |
|  │        Jan  Feb  Mar  Apr  May  Jun                 │    |
|  └─────────────────────────────────────────────────────┘    |
|                                                             |
+-------------------------------------------------------------+
```

### S10. Settings (Paid — Tabbed View)

```text
+-------------------------------------------------------------+
|  ZIPPP.LINK    [Store] [Products] [Settings●]   [Avatar] v  |
+-------------------------------------------------------------+
|                                                             |
|  Settings                         <- H1, Archivo            |
|                                                             |
|  [Shopify] [Sheets] [Branding]                              |
|  ───────── ──────── ─────────────── ──────────              |
```

**Tab: Shopify Import**
```text
|  ┌─────────────────────────────────────────────────────┐    |
|  │  Shopify Import                 <- H2               │    |
|  │                                                     │    |
|  │  Shopify store URL                                  │    |
|  │  ┌──────────────────────────────────────────────┐   │    |
|  │  │ my-shop.myshopify.com                        │   │    |
|  │  └──────────────────────────────────────────────┘   │    |
|  │                                                     │    |
|  │  [ Import products → ]                              │    |
|  │                                                     │    |
|  │  Last import: 12 products on Jun 15, 2026           │    |
|  └─────────────────────────────────────────────────────┘    |
```

**Tab: Google Sheets Sync**
```text
|  ┌─────────────────────────────────────────────────────┐    |
|  │  Google Sheets Sync             <- H2               │    |
|  │                                                     │    |
|  │  Webhook URL (Make/Zapier)                          │    |
|  │  ┌──────────────────────────────────────────────┐   │    |
|  │  │ https://hooks.zapier.com/hooks/catch/...     │   │    |
|  │  └──────────────────────────────────────────────┘   │    |
|  │                                                     │    |
|  │  — OR —                                             │    |
|  │                                                     │    |
|  │  Google Sheet URL                                   │    |
|  │  ┌──────────────────────────────────────────────┐   │    |
|  │  │ https://docs.google.com/spreadsheets/d/...   │   │    |
|  │  └──────────────────────────────────────────────┘   │    |
|  │                                                     │    |
|  │  [ Save & test connection ]                         │    |
|  │  Status: ✓ Connected — last sync 3 hours ago       │    |
|  └─────────────────────────────────────────────────────┘    |
```

**Tab: Branding**
```text
|  ┌─────────────────────────────────────────────────────┐    |
|  │  Branding                       <- H2               │    |
|  │                                                     │    |
|  │  "Powered by Zippp" footer                          │    |
|  │  [ ● Hidden ]  [ ○ Visible ]    <- toggle           │    |
|  │                                                     │    |
|  │  Custom WhatsApp message                            │    |
|  │  Appended after the auto-generated order text.      │    |
|  │  ┌──────────────────────────────────────────────┐   │    |
|  │  │ Thanks for ordering! Please transfer to      │   │    |
|  │  │ BCA 123-456-789. I'll confirm within 1 hour. │   │    |
|  │  └──────────────────────────────────────────────┘   │    |
|  │                                                     │    |
|  │  [ Save ]                                           │    |
|  └─────────────────────────────────────────────────────┘    |
+-------------------------------------------------------------+
```

### S10-locked. Settings (Free Tier — Locked View)

```text
+-------------------------------------------------------------+
|  ZIPPP.LINK    [Store] [Products] [Settings]    [Avatar] v  |
+-------------------------------------------------------------+
|                                                             |
|  Settings                         <- H1, Archivo            |
|                                                             |
|  [Shopify 🔒] [Sheets 🔒] [Branding 🔒]                     |
|  ──────────────────────────────────────                     |
|                                                             |
|  ┌─────────────────────────────────────────────────────┐    |
|  │                                                     │    |
|  │  🔒 Unlock all settings with your Paid plan.        │    |
|  │                                                     │    |
|  │  ✓ Shopify product import                           │    |
|  │  ✓ Google Sheets order sync                         │    |
|  │  ✓ Remove "Powered by Zippp" branding               │    |
|  │  ✓ Custom WhatsApp message                          │    |
|  │                                                     │    |
|  │  [ Name Your Price & Unlock → ]                     │    |
|  │                                                     │    |
|  └─────────────────────────────────────────────────────┘    |
|                                                             |
+-------------------------------------------------------------+
```

---

## 3. Buyer Journey Wireframes (B1–B5)

> Screen IDs match SPEC.md §3 Buyer Screen Inventory.
> All buyer screens are mobile-first — shown at 320px viewport.

### B1. Store Page (Public — Mobile)

```text
+----------------------+
|  MY COFFEE SHOP      |
|  "Best coffee gear    |
|   in Malang"         |
+----------------------+
|                      |
|  ┌──────────────┐    |
|  │  [  IMG  ]   │    |
|  │              │    |
|  │ Coffee Beans │    |
|  │ 200g         │    |
|  │ $10          │    |
|  │  [ + Add ]   │    |
|  └──────────────┘    |
|                      |
|  ┌──────────────┐    |
|  │  [  IMG  ]   │    |
|  │              │    |
|  │ V60 Dripper  │    |
|  │              │    |
|  │ $25          │    |
|  │  [ + Add ]   │    |
|  └──────────────┘    |
|                      |
|  ┌──────────────┐    |
|  │  [  IMG  ]   │    |
|  │              │    |
|  │ Chemex 6-cup │    |
|  │              │    |
|  │ $45          │    |
|  │  [ + Add ]   │    |
|  └──────────────┘    |
|                      |
|  ───────────────     |
|  Powered by Zippp    |
+----------------------+
```

### B1-empty. Store Page (No Products Yet)

```text
+----------------------+
|  MY COFFEE SHOP      |
|  "Best coffee gear"  |
+----------------------+
|                      |
|                      |
|    ┌──────────┐      |
|    │  🏗️     │      |
|    └──────────┘      |
|                      |
|  This store is       |
|  setting up —        |
|  check back soon!    |
|                      |
|                      |
+----------------------+
```

### B1-limit. Store Page (200 Views/Mo Limit Hit)

```text
+----------------------+
|  MY COFFEE SHOP      |
+----------------------+
|                      |
|  ┌──────────────┐    |
|  │  ⚠️          │    |
|  │              │    |
|  │ This store   │    |
|  │ has reached  │    |
|  │ its monthly  │    |
|  │ view limit.  │    |
|  │              │    |
|  │ Contact the  │    |
|  │ seller:      │    |
|  │ [WhatsApp]   │    |
|  └──────────────┘    |
|                      |
+----------------------+
```

### B2. Inline Cart Bar (Appears After First Add)

```text
+----------------------+
|  (... products ...)  |
|                      |
+══════════════════════+
|  🛒 2 items · $35    |
|  [ View Cart ]       |
+══════════════════════+
```

With quantity controls visible inline per product:
```text
+----------------------+
|  ┌──────────────┐    |
|  │  [  IMG  ]   │    |
|  │ Coffee Beans │    |
|  │ 200g         │    |
|  │ $10          │    |
|  │ [-]  1  [+]  │    |  <- replaces [+ Add] after first add
|  └──────────────┘    |
|                      |
|  ┌──────────────┐    |
|  │  [  IMG  ]   │    |
|  │ V60 Dripper  │    |
|  │ $25          │    |
|  │ [-]  1  [+]  │    |
|  └──────────────┘    |
|                      |
+══════════════════════+
|  🛒 2 items · $35    |
|  [ View Cart ]       |
+══════════════════════+
```

### B3. Cart Modal (Bottom Sheet)

```text
+----------------------+
|  ░░░░░░░░░░░░░░░░░░  |  <- dimmed store page behind
|  ░░░░░░░░░░░░░░░░░░  |
+══════════════════════+
|  YOUR CART      [ ✕ ]|
|                      |
|  Coffee Beans 200g   |
|  $10  [-]  1  [+]    |
|  ────────────────    |
|  V60 Dripper         |
|  $25  [-]  1  [+]    |
|  ────────────────    |
|                      |
|  Subtotal:     $35   |
|                      |
| [🟢 Order on         |
|     WhatsApp ]       |
|                      |
+══════════════════════+
```

### B3-empty. Cart Modal (Empty State)

```text
+══════════════════════+
|  YOUR CART      [ ✕ ]|
|                      |
|                      |
|    Your cart is      |
|    empty.            |
|    Browse the store  |
|    and add items!    |
|                      |
|  [ ← Back to store ]|
|                      |
+══════════════════════+
```

### B4. WhatsApp Redirect

```text
+----------------------+
|  Opening WhatsApp... |  <- brief loading state (< 1 second)
|                      |
|  ┌──────────────┐    |
|  │   Loading    │    |
|  │     ...      │    |
|  └──────────────┘    |
|                      |
|  If WhatsApp doesn't |
|  open automatically: |
|  [ Tap here ]        |
+----------------------+

       ↓ deep link opens WhatsApp ↓

+----------------------+
|  WhatsApp            |
+----------------------+
|  To: +62 812 345 678 |
|                      |
|  ┌──────────────────┐|
|  │ Hi, I want to    │|
|  │ order:           │|
|  │                  │|
|  │ 1x Coffee Beans  │|
|  │ 200g - $10       │|
|  │ 1x V60 Dripper   │|
|  │ - $25            │|
|  │                  │|
|  │ Total: $35       │|
|  │                  │|
|  │ (custom seller   │|
|  │  message here    │|  <- only if Paid seller has custom_wa_message
|  │  if set)         │|
|  └──────────────────┘|
|  [ Send ]            |
+----------------------+
```

### B5. Order Completion (Off-Platform)

```text
  ┌────────────────────────────────────────────────┐
  │  This happens entirely in WhatsApp.            │
  │  Zippp has no visibility or control here.      │
  │                                                │
  │  Typical flow:                                 │
  │  1. Buyer sends pre-filled order message       │
  │  2. Seller confirms availability               │
  │  3. Seller shares payment details              │
  │     (bank transfer / wallet apps)              │
  │  4. Buyer sends payment screenshot             │
  │  5. Seller confirms and arranges delivery      │
  │                                                │
  │  If Paid: order row auto-pushed to             │
  │  seller's Google Sheet via webhook.            │
  └────────────────────────────────────────────────┘
```

---

## 4. Admin Journey Wireframes (A1–A8)

> Screen IDs match SPEC.md §3 Admin Screen Inventory.
> Admin UI uses the same B&W design system but with a sidebar navigation layout.

### A1. Login (RBAC Redirect)

> Same login screen as Seller (S2). After authentication, NextAuth checks `user.role`:
> - `ADMIN` → redirect to `/z-cms/`
> - `SELLER` → redirect to `/app/dashboard`

### A2. Admin Dashboard (Overview)

```text
+------------------+------------------------------------------+
|  Z-CMS           |                                          |
|  ─────────────── |  Dashboard                <- H1, Archivo |
|  📊 Dashboard  ● |                                          |
|  📄 Pages        |  +----------+  +----------+  +----------+|
|  ✏️ Blog         |  | Users    |  | Stores   |  | MRR      ||
|  👥 Users        |  | 1,247    |  | 892      |  | $2,480   ||
|  📢 Announce     |  | +12 today|  | +5 today |  | +$45/mo  ||
|  🔔 Notifs       |  +----------+  +----------+  +----------+|
|                  |                                          |
|  ─────────────── |  Recent Signups                          |
|  Admin: Lucky    |  ─────────────────────────────────────── |
|  [Log out]       |  jane@gmail.com    Free    2 min ago     |
|                  |  bob@outlook.com   Paid    1 hour ago    |
|                  |  maria@yahoo.com   Free    3 hours ago   |
|                  |                                          |
|                  |  Conversion Funnel                       |
|                  |  Signup → Store → Product → WA Click     |
|                  |  1247   →  892  →  2,140  →  8,560      |
|                  |  (100%)  (71.5%) (per store) (per store) |
+------------------+------------------------------------------+
```

### A3. Landing Page Editor (Inline Overlay)

```text
+------------------+------------------------------------------+
|  Z-CMS           |  Landing Page Editor     <- H1, Archivo  |
|  ─────────────── |                                          |
|  📊 Dashboard    |  [ Save & Commit ]  Last saved: 5m ago   |
|  📄 Pages      ● |  ─────────────────────────────────────── |
|  ✏️ Blog         |                                          |
|  👥 Users        |  ┌─── LIVE PREVIEW (editable) ─────────┐ |
|  📢 Announce     |  │                                     │ |
|  🔔 Notifs       |  │  ZIPPP.LINK        [Demo] [Login]   │ |
|                  |  │                                     │ |
|                  |  │  ┌─────────────────────────────────┐ │ |
|                  |  │  │ Turn Instagram followers into   │ │ |
|                  |  │  │ WhatsApp orders in 2 minutes    │ │ |
|                  |  │  │          ← click to edit        │ │ |
|                  |  │  └─────────────────────────────────┘ │ |
|                  |  │                                     │ |
|                  |  │  ┌── Floating Toolbar ──┐           │ |
|                  |  │  │ B  I  U  [Font ▼]   │           │ |
|                  |  │  └─────────────────────┘           │ |
|                  |  │                                     │ |
|                  |  └─────────────────────────────────────┘ |
|                  |                                          |
+------------------+------------------------------------------+
```

### A4. Blog Manager

**Post list view:**
```text
+------------------+------------------------------------------+
|  Z-CMS           |  Blog Posts              <- H1, Archivo  |
|  ─────────────── |                     [ + New Post ]       |
|  📊 Dashboard    |  ─────────────────────────────────────── |
|  📄 Pages        |                                          |
|  ✏️ Blog       ● |  | Title          | Status  | Date      ||
|  👥 Users        |  |────────────────|─────────|───────────||
|  📢 Announce     |  | Getting Started| Published| Jul 10   ||
|  🔔 Notifs       |  | New Features   | Draft   | Jul 12   ||
|                  |  | Seller Tips    | Published| Jul 8    ||
|                  |                                          |
+------------------+------------------------------------------+
```

**Post editor view:**
```text
+------------------+------------------------------------------+
|  Z-CMS           |  Edit Post               <- H1, Archivo |
|  ─────────────── |                                          |
|                  |  Title                                   |
|                  |  ┌──────────────────────────────────────┐|
|                  |  │ Getting Started with Zippp           │|
|                  |  └──────────────────────────────────────┘|
|                  |                                          |
|                  |  Slug: /z-insights/getting-started       |
|                  |                                          |
|                  |  ┌──────────────────────────────────────┐|
|                  |  │ B  I  U  H1  H2  •  1.  🔗  📷  🤖 │|
|                  |  │──────────────────────────────────────│|
|                  |  │ Welcome to Zippp! In this guide,    │|
|                  |  │ we'll walk you through setting up   │|
|                  |  │ your first WhatsApp store...        │|
|                  |  │                                     │|
|                  |  └──────────────────────────────────────┘|
|                  |                                          |
|                  |  Status: [ Draft ▼ ]                     |
|                  |                                          |
|                  |  [ Save Draft ]  [ Publish ]  [ 🤖 AI ] |
|                  |                                          |
+------------------+------------------------------------------+
```

### A5. User Manager

```text
+------------------+------------------------------------------+
|  Z-CMS           |  Users (1,247)           <- H1, Archivo |
|  ─────────────── |                                          |
|  📊 Dashboard    |  Filter: [All ▼] [Free ▼] [Paid ▼]      |
|  📄 Pages        |  Search: [________________] 🔍           |
|  ✏️ Blog         |  ─────────────────────────────────────── |
|  👥 Users      ● |                                          |
|  📢 Announce     |  | Name    | Email         | Plan | Stores | Last Active ||
|  🔔 Notifs       |  |─────────|───────────────|──────|────────|─────────────||
|                  |  | Jane    | jane@mail.com | Free | 1      | 2 min ago   ||
|                  |  | Bob     | bob@mail.com  | Paid | 3      | 1 hour ago  ||
|                  |  | Maria   | maria@m.com   | Free | 1      | 3 hours ago ||
|                  |                                          |
|                  |  ← 1 2 3 ... 42 →                       |
+------------------+------------------------------------------+
```

### A6. User Detail & Contact

```text
+------------------+------------------------------------------+
|  Z-CMS           |  ← Back to Users                        |
|  ─────────────── |                                          |
|  📊 Dashboard    |  Jane Doe                <- H1, Archivo  |
|  📄 Pages        |  jane@gmail.com                          |
|  ✏️ Blog         |  Plan: Free | Joined: Jun 1, 2026       |
|  👥 Users      ● |                                          |
|  📢 Announce     |  Stores                                  |
|  🔔 Notifs       |  ─────────────────────────────────────── |
|                  |  My Coffee Shop | 120 views | 15 WA clicks|
|                  |                                          |
|                  |  Usage                                   |
|                  |  Products: 3/5 | Views: 120/200          |
|                  |                                          |
|                  |  ─── Contact ───                         |
|                  |                                          |
|                  |  [ 💬 WhatsApp ]  <- opens wa.me link    |
|                  |                                          |
|                  |  Subject                                 |
|                  |  ┌──────────────────────────────────────┐|
|                  |  │ Welcome to Zippp!                    │|
|                  |  └──────────────────────────────────────┘|
|                  |  Body                                    |
|                  |  ┌──────────────────────────────────────┐|
|                  |  │ Hi Jane, thanks for trying Zippp!   │|
|                  |  │ We noticed you haven't added all    │|
|                  |  │ your products yet...                │|
|                  |  └──────────────────────────────────────┘|
|                  |                                          |
|                  |  [ Send Email via Resend ]               |
|                  |                                          |
+------------------+------------------------------------------+
```

### A7. Announcement Publisher

```text
+------------------+------------------------------------------+
|  Z-CMS           |  Announcements           <- H1, Archivo |
|  ─────────────── |                  [ + New Announcement ]  |
|  📊 Dashboard    |  ─────────────────────────────────────── |
|  📄 Pages        |                                          |
|  ✏️ Blog         |  | Title              | Type   | Date   ||
|  👥 Users        |  |────────────────────|────────|────────||
|  📢 Announce   ● |  | Shopify Import!    | Banner | Jul 12 ||
|  🔔 Notifs       |  | v2.0 Launch        | Notif  | Jul 10 ||
|                  |                                          |
+------------------+------------------------------------------+
```

**Compose announcement:**
```text
+------------------+------------------------------------------+
|  Z-CMS           |  New Announcement        <- H1, Archivo |
|  ─────────────── |                                          |
|                  |  Title                                   |
|                  |  ┌──────────────────────────────────────┐|
|                  |  │ We just launched Shopify Import!     │|
|                  |  └──────────────────────────────────────┘|
|                  |                                          |
|                  |  Body                                    |
|                  |  ┌──────────────────────────────────────┐|
|                  |  │ You can now import products directly │|
|                  |  │ from your Shopify store. Go to       │|
|                  |  │ Settings → Shopify to try it!        │|
|                  |  └──────────────────────────────────────┘|
|                  |                                          |
|                  |  Type: [● Banner] [○ Notification]       |
|                  |                                          |
|                  |  Preview:                                |
|                  |  ┌─────────────────────────────── [ ✕ ]┐ |
|                  |  │ 📢 We just launched Shopify Import! │ |
|                  |  └─────────────────────────────────────┘ |
|                  |                                          |
|                  |  [ Publish to all sellers ]              |
|                  |                                          |
+------------------+------------------------------------------+
```

### A8. Notification Manager

```text
+------------------+------------------------------------------+
|  Z-CMS           |  Notifications           <- H1, Archivo |
|  ─────────────── |                  [ + New Notification ]  |
|  📊 Dashboard    |  ─────────────────────────────────────── |
|  📄 Pages        |                                          |
|  ✏️ Blog         |  | Title              | Sent   | Read % ||
|  👥 Users        |  |────────────────────|────────|────────||
|  📢 Announce     |  | v2.1 Release Notes | Jul 12 | 42%    ||
|  🔔 Notifs     ● |  | Tips: SEO for WA   | Jul 10 | 67%    ||
|                  |  | Welcome message    | Jul 1  | 89%    ||
|                  |                                          |
|                  |  Compose:                                |
|                  |  Title: [________________________]       |
|                  |  Body:  [________________________]       |
|                  |  [ Send to all sellers ]                 |
+------------------+------------------------------------------+
```

---

## 5. Wireframe Index

Quick reference mapping every wireframe to its persona and journey step:

| ID | Screen | Persona | Journey Step | Section |
|----|--------|---------|-------------|---------|
| S1 | Landing Page | Seller | Discovery | §2 |
| S2 | Google Sign-In | Seller | Authentication | §2 |
| S3 | Store Setup | Seller | Onboarding | §2 |
| S4 | Add Product | Seller | Onboarding | §2 |
| S5 | Preview & Copy Link | Seller | First success | §2 |
| S6 | Dashboard (Free + announcements) | Seller | Daily use | §2 |
| S6b | Dashboard (Limit Reached) | Seller | Edge case | §2 |
| S7 | Upsell Popup (3 variants) | Seller | Conversion | §2 |
| S8 | Polar Checkout | Seller | Payment | §2 |
| S9 | Paid Dashboard | Seller | Post-upgrade | §2 |
| S10 | Settings (4 tabs) | Seller | Configuration | §2 |
| S10-locked | Settings (Free, locked) | Seller | Edge case | §2 |
| B1 | Store Page (Public) | Buyer | Browsing | §3 |
| B1-empty | Store Page (No products) | Buyer | Edge case | §3 |
| B1-limit | Store Page (View limit) | Buyer | Edge case | §3 |
| B2 | Inline Cart Bar | Buyer | Adding items | §3 |
| B3 | Cart Modal | Buyer | Reviewing order | §3 |
| B3-empty | Cart Modal (Empty) | Buyer | Edge case | §3 |
| B4 | WhatsApp Redirect | Buyer | Checkout | §3 |
| B5 | Order Completion | Buyer | Off-platform | §3 |
| A1 | Login (RBAC) | Admin | Authentication | §4 |
| A2 | Admin Dashboard | Admin | Overview | §4 |
| A3 | Landing Page Editor | Admin | Content editing | §4 |
| A4 | Blog Manager | Admin | Content publishing | §4 |
| A5 | User Manager | Admin | User oversight | §4 |
| A6 | User Detail & Contact | Admin | Direct outreach | §4 |
| A7 | Announcement Publisher | Admin | Communication | §4 |
| A8 | Notification Manager | Admin | Communication | §4 |

