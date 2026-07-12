# Zippp.link — Specification

> **Tagline:** Free to start. Name your price to keep it alive.
> **Model:** International-first, Yearly-only, Free start → Name Your Price ($5 minimum/yr) after behavior-triggered satisfaction popup (7 days or 3 activations).
> **Revenue Goal:** Rp 10–15jt/month with $0 marketing budget initially, leveraging ProductHunt and free channels.

---

## 1. Tech Stack & Infrastructure

| Layer | Tool | Notes |
|-------|------|-------|
| **Framework** | Next.js (App Router) | React Server Components, API routes in `src/app/api/` |
| **ORM** | Drizzle ORM | Type-safe, migration-first |
| **Database** | Neon Postgres | Serverless Postgres; branching for preview envs |
| **Storage** | Cloudflare R2 | Product images, user avatars; S3-compatible API |
| **Auth** | NextAuth.js (v4) | Google Sign-In; RBAC (`SELLER` / `ADMIN`) determines redirect to `/app` or `/z-cms/` (handled via layout component) |
| **Admin Platform** | Z-CMS (`/z-cms/`) | Internal admin dashboard: landing page inline editor, blog (`/z-insights`), user management, announcements, direct email contact. Postgres-backed content with ISR. (see ADR-0005) |
| **Billing / MoR** | Polar.sh | Global payments; Phase 2: Mayar for Indonesia |
| **Analytics** | Custom Internal | User behavior tracking on Neon Postgres (see §7) |
| **Monitoring** | PostHog (analytics/flags), Sentry (errors), BetterStack (uptime) | |
| **CI** | GitHub Actions | Jest + Playwright on every PR |
| **Hosting** | Vercel | Preview → Production pipeline (see §10) |
| **Testing** | Jest + Playwright | Strict TDD — nothing merges without green CI |
| **Email** | Resend | Transactional email for admin → user contact from Z-CMS |

---

## 2. Core Features & Pricing Gates (Beta)

| Plan | Price | Features |
|------|-------|----------|
| **Free** | $0 | 1 link, 5 products, zippp branding, 200 views/mo, 1-day analytics, announcements & notifications |
| **Paid** | Name Your Price ($5 min/yr) | Unlimited links & products, remove branding, custom WA message, full analytics, Google Sheets sync, Shopify import |

---

## 3. User Personas & Journeys

### Persona 1: The Indie Creator (Seller)

- **Profile:** Independent seller (home baker, thrift reseller, small creator). Currently takes orders through Instagram DMs, payment screenshots, and a manually updated Google Sheet. Wants to sell digital/physical products quickly without complex setup.
- **Goals:** Get a shareable store link in <2 minutes. See who's viewing. Convert viewers to WhatsApp orders.
- **Frustrations:** DMs full of "price?", lost screenshots, Sheet out of sync with actual inventory.

#### Seller Journey Flow
```
  ┌─────────────┐
  │  Discovers  │  ProductHunt / Instagram / TikTok / word of mouth
  │  Zippp      │
  └──────┬──────┘
         │
         ▼
  ┌─────────────┐
  │  S1. LANDING│  Route: /
  │  PAGE       │  Sees hero, live demo preview, pricing
  │             │  CTA: "Continue with Google"
  └──────┬──────┘
         │ clicks CTA
         ▼
  ┌─────────────┐
  │  S2. GOOGLE │  NextAuth OAuth popup
  │  SIGN-IN    │  One-tap on mobile, popup on desktop
  │             │  Event: user_signed_up
  └──────┬──────┘
         │ authenticated
         ▼
  ┌─────────────┐
  │  S3. STORE  │  Route: /app/onboarding
  │  SETUP      │  Fields: Store name, WhatsApp number
  │             │  Auto-generates slug from store name
  │             │  Event: store_created
  └──────┬──────┘
         │ submits
         ▼
  ┌─────────────┐
  │  S4. ADD    │  Route: /app/products/new
  │  PRODUCTS   │  Fields: Name, price, description (plain textarea), image upload (→ R2)
  │             │  Repeatable — "Add another" or "Done"
  │             │  Event: product_added (per product)
  └──────┬──────┘
         │ done adding
         ▼
  ┌─────────────┐
  │  S5. PREVIEW│  Route: /app/dashboard (with inline preview)
  │  & COPY     │  Shows live preview of public store
  │  LINK       │  One-click copy: zippp.link/{slug}
  │             │  CTA: "Share on Instagram" / "Copy Link"
  └──────┬──────┘
         │ shares link externally
         ▼
  ┌─────────────┐
  │  S6. DASH-  │  Route: /app/dashboard
  │  BOARD      │  Announcement banner (if any, dismissable)
  │  (DAILY USE)│  Stats: views, WA clicks, product views
  │             │  Manage products, edit store
  │             │  Notification badge on avatar menu
  │             │  Free: 1-day analytics window
  └──────┬──────┘
         │ 7 days elapsed OR 3 dashboard visits (activations)
         ▼
  ┌─────────────┐
  │  S7. UPSELL │  Bottom sheet overlay on dashboard
  │  POPUP      │  Step 1: "Are you getting WhatsApp chats?"
  │  (MICRO-    │    → [Yes, love it!] / [Not yet]
  │  COMMIT)    │  Step 2 (if Yes): Name Your Price ($5 min/yr)
  │             │  Events: popup_shown, popup_yes
  └──────┬──────┘
         │ enters price, clicks "Pay & Unlock All"
         ▼
  ┌─────────────┐
  │  S8. POLAR  │  External: Polar.sh checkout
  │  CHECKOUT   │  Pre-filled with user-chosen amount
  │             │  Webhook → /api/webhooks/polar
  │             │  Event: checkout_completed
  └──────┬──────┘
         │ payment confirmed
         ▼
  ┌─────────────┐
  │  S9. PAID   │  Route: /app/dashboard (upgraded)
  │  DASHBOARD  │  Unlocked: unlimited products, remove branding,
  │             │  custom WA message, full analytics,
  │             │  Sheets sync, Shopify import
  └──────┬──────┘
         │ navigates to settings
         ▼
  ┌─────────────┐
  │  S10. PAID  │  Route: /app/settings
  │  SETTINGS   │  Tabs: Shopify Import | Google Sheets |
  │             │  Branding
  └─────────────┘
```

#### Seller Screen Inventory

| # | Screen | Route | Key Elements | Free | Paid |
|---|--------|-------|-------------|------|------|
| S1 | Landing Page | `/` | Hero, live demo, pricing table, Google CTA | ✓ | ✓ |
| S2 | Google Sign-In | (NextAuth popup) | OAuth consent; RBAC redirects ADMIN→`/z-cms/`, SELLER→`/app` | ✓ | ✓ |
| S3 | Store Setup | `/app/onboarding` | Store name, WA number, slug preview | ✓ | ✓ |
| S4 | Add Product | `/app/products/new` | Name, price, image upload, description (plain textarea) | ✓ (max 5) | ✓ (unlimited) |
| S5 | Preview & Copy | `/app/dashboard` (first visit) | Live preview, copy link button | ✓ | ✓ |
| S6 | Dashboard | `/app/dashboard` | Announcement banner, stats cards, product list, notification badge | ✓ (1-day analytics) | ✓ (full analytics) |
| S7 | Upsell Popup | (overlay on dashboard) | Micro-commit → Name Your Price | ✓ | — |
| S8 | Polar Checkout | (external redirect) | Payment form | ✓ | — |
| S9 | Paid Dashboard | `/app/dashboard` | All features unlocked, no limits | — | ✓ |
| S10 | Settings | `/app/settings` | Shopify import, Sheets sync, branding | 🔒 | ✓ |

#### Seller Edge Cases & Decision Points

| Trigger | Behavior |
|---------|----------|
| User already has a store | Skip S3, go straight to S6 (Dashboard) |
| Free user hits 5 product limit | "Add" button shows lock icon → triggers S7 (Upsell) |
| Free user hits 200 views/mo | Store page shows "This store has reached its monthly limit" |
| Popup dismissed 3 times | Stop showing popup; show subtle upgrade banner instead |
| Paid plan expires | Downgrade to Free limits; show renewal popup on next login |
| User clicks locked feature | Bottom sheet: "Unlock with Name Your Price" → S7 |

---

### Persona 2: The Buyer

- **Profile:** Instagram/TikTok follower who sees a product link in a bio or story. Wants to browse, pick quantities, and order via WhatsApp — no account, no sign-up, no friction.
- **Goals:** See products clearly on mobile. Pick what they want. Get to WhatsApp fast.
- **Frustrations:** Slow pages, having to create accounts just to browse, unclear pricing.

#### Buyer Journey Flow
```
  ┌─────────────┐
  │  Sees link  │  Instagram bio / TikTok bio / WhatsApp status / story
  │  on social  │
  └──────┬──────┘
         │ taps link
         ▼
  ┌─────────────┐
  │  B1. STORE  │  Route: /s/{slug}
  │  PAGE       │  Store name, description, product grid
  │  (MOBILE)   │  Each product: image, name, price, [+ Add] button
  │             │  No auth required — fully public
  └──────┬──────┘
         │ taps [+ Add] on products
         ▼
  ┌─────────────┐
  │  B2. INLINE │  Same page — bottom bar appears
  │  CART BAR   │  Shows: "3 items · $52" + [View Cart] button
  │             │  Quantity adjustable: [-] qty [+] per item
  └──────┬──────┘
         │ taps [View Cart] or [Order on WhatsApp]
         ▼
  ┌─────────────┐
  │  B3. CART   │  Bottom sheet modal
  │  MODAL      │  Line items with qty × price
  │             │  Running total
  │             │  [Order on WhatsApp] CTA
  └──────┬──────┘
         │ taps [Order on WhatsApp]
         ▼
  ┌─────────────┐
  │  B4. WHAT-  │  WhatsApp opens (deep link)
  │  SAPP       │  Pre-filled message:
  │  REDIRECT   │    "Hi, I want to order:
  │             │     1x Coffee Beans - $10
  │             │     1x V60 Dripper - $25
  │             │     Total: $35"
  │             │  Event: wa_click tracked
  └──────┬──────┘
         │ conversation continues in WhatsApp
         ▼
  ┌─────────────┐
  │  B5. ORDER  │  Seller and buyer negotiate in WhatsApp
  │  COMPLETION │  Payment via seller's preferred method
  │  (OFF-PLAT) │  (bank transfer, wallet apps)
  └─────────────┘
```

#### Buyer Screen Inventory

| # | Screen | Route | Key Elements | Auth Required |
|---|--------|-------|-------------|---------------|
| B1 | Store Page | `/s/{slug}` | Store header, product grid, [+ Add] buttons | No |
| B2 | Cart Bar | (inline on store page) | Item count, total, [View Cart] | No |
| B3 | Cart Modal | (bottom sheet on store page) | Line items, quantities, total, [Order on WhatsApp] | No |
| B4 | WhatsApp Redirect | (external deep link) | Pre-filled order message to seller's WA number | No |
| B5 | Order Completion | (off-platform, WhatsApp) | Direct seller↔buyer conversation | No |

#### Buyer Edge Cases & Decision Points

| Trigger | Behavior |
|---------|----------|
| Empty cart, taps "Order on WhatsApp" | Button disabled / greyed out with tooltip "Add items first" |
| Store has 0 products | Show "This store is setting up — check back soon!" |
| Store hit 200 views/mo limit (Free seller) | Show "This store has reached its limit this month" + seller contact |
| Product image fails to load | Show placeholder icon with product name still visible |
| Custom WA message (Paid seller) | Append seller's custom message to the auto-generated order text |
| Buyer removes all items from cart | Cart bar hides, return to clean store view |
| Store has branding (Free seller) | Small "Powered by Zippp" footer with link to landing page |

---

### Cross-Persona Touchpoint Map

Shows where Seller, Buyer, and Admin journeys intersect:

```
  SELLER JOURNEY               BUYER JOURNEY              ADMIN JOURNEY
  ─────────────                ─────────────              ─────────────

  S1  Landing Page ···(discovers)                         A3  Edits landing page copy
  S2  Google Sign-In ─── same login ─────────────────── A1  Login (RBAC → /z-cms/)
  S3  Store Setup                                         A5  Sees user in User Manager
  S4  Add Products                                        A6  Can email user directly
  S5  Preview & Copy ─── shares link ── B1  Store Page
  S6  Dashboard ◄──── announcement ──────────────────── A7  Publishes announcement
      │ sees view count ◄── page view ──│
      │ sees WA clicks  ◄── WA click  ──┤   B3  Cart
  S7  Upsell Popup                       B4  WhatsApp     A2  Sees conversion metrics
  S8  Polar Checkout                     B5  Order in WA
  S9  Paid Dashboard                            │         A4  Publishes blog at /z-insights
  S10 Settings                                  │
      │ sees order in Sheet ◄── order text ─────┘
```

---

### Persona 3: The Admin (Zippp Team)

- **Profile:** Zippp team member (founder, marketer). Manages the platform: edits public-facing content, publishes blog posts, monitors users, contacts sellers, pushes announcements.
- **Goals:** Keep landing page copy fresh. Publish SEO content. Monitor user growth and engagement. Contact users for support or outreach.
- **Frustrations:** Needing to deploy code just to change a headline. No visibility into user behavior without a custom dashboard.

#### Admin Journey Flow
```
  ┌─────────────┐
  │  A1. LOGIN  │  Route: /login (same NextAuth)
  │  (ADMIN)    │  RBAC: role=ADMIN → redirect to /z-cms/
  │             │  Event: admin_login
  └──────┬──────┘
         │ authenticated as ADMIN
         ▼
  ┌─────────────┐
  │  A2. ADMIN  │  Route: /z-cms/
  │  DASHBOARD  │  Stats: total users, active stores, MRR,
  │  (OVERVIEW) │  recent signups, recent orders, conversion rate
  │             │  Sidebar nav: Dashboard | Pages | Blog |
  │             │  Users | Announcements | Notifications
  └──────┬──────┘
         │ clicks "Pages" in sidebar
         ▼
  ┌─────────────┐
  │  A3. LANDING│  Route: /z-cms/pages/landing
  │  PAGE EDITOR│  Shows actual landing page with editable overlay
  │  (INLINE)   │  Click any editable area → floating toolbar
  │             │  Toolbar: B | I | U | Font selector
  │             │  Save → commits to Git, live on next deploy/ISR
  │             │  Event: content_edited
  └──────┬──────┘
         │ clicks "Blog" in sidebar
         ▼
  ┌─────────────┐
  │  A4. BLOG   │  Route: /z-cms/blog
  │  MANAGER    │  List all posts (draft/published)
  │             │  Create new → /z-cms/blog/new
  │             │  Rich text editor with AI drafting (Groq)
  │             │  Published at: /z-insights/[slug]
  │             │  Event: blog_published
  └──────┬──────┘
         │ clicks "Users" in sidebar
         ▼
  ┌─────────────┐
  │  A5. USER   │  Route: /z-cms/users
  │  MANAGER    │  Filterable table: name, email, plan,
  │             │  stores, usage, last active
  │             │  Click row → user detail (A6)
  └──────┬──────┘
         │ clicks a user row
         ▼
  ┌─────────────┐
  │  A6. USER   │  Route: /z-cms/users/[id]
  │  DETAIL &   │  Profile: name, email, plan, stores, usage history
  │  CONTACT    │  Email composer (Resend): subject, body, [Send]
  │             │  WhatsApp link: opens wa.me/{user_wa_number}
  │             │  Event: admin_email_sent
  └──────┬──────┘
         │ clicks "Announcements" in sidebar
         ▼
  ┌─────────────┐
  │  A7. ANNOUNCE│  Route: /z-cms/announcements
  │  MENT       │  Compose: title, body, type (BANNER / NOTIFICATION)
  │  PUBLISHER  │  Preview before publish
  │             │  Published → appears on all seller dashboards
  │             │  Event: announcement_published
  └──────┬──────┘
         │ clicks "Notifications" in sidebar
         ▼
  ┌─────────────┐
  │  A8. NOTIFI-│  Route: /z-cms/notifications
  │  CATION     │  List sent notifications with read/unread counts
  │  MANAGER    │  Compose: title, body → pushed to user menu
  │             │  Use for: release notes, tips, feature launches
  └─────────────┘
```

#### Admin Screen Inventory

| # | Screen | Route | Key Elements | Role |
|---|--------|-------|-------------|------|
| A1 | Login | `/login` | Same NextAuth; RBAC redirects to `/z-cms/` | ADMIN |
| A2 | Admin Dashboard | `/z-cms/` | Stats overview, sidebar nav | ADMIN |
| A3 | Landing Page Editor | `/z-cms/pages/landing` | Inline overlay editor, floating toolbar (B/I/U/font), Git commit on save | ADMIN |
| A4 | Blog Manager | `/z-cms/blog` | Post list, create/edit/publish, rich text editor, AI drafting (Groq) | ADMIN |
| A5 | User Manager | `/z-cms/users` | Filterable user table, plan/usage/activity columns | ADMIN |
| A6 | User Detail & Contact | `/z-cms/users/[id]` | Profile, email composer (Resend), WA link | ADMIN |
| A7 | Announcement Publisher | `/z-cms/announcements` | Compose, preview, publish to all seller dashboards | ADMIN |
| A8 | Notification Manager | `/z-cms/notifications` | Sent notifications list, read/unread counts, compose | ADMIN |

#### Admin Edge Cases & Decision Points

| Trigger | Behavior |
|---------|----------|
| Non-admin tries to access `/z-cms/*` | Redirect to `/app/dashboard` with toast "Access denied" |
| Admin edits landing page but doesn't save | Unsaved changes warning on navigation |
| Admin publishes announcement with empty body | Validation error: "Body is required" |
| Admin sends email to user with invalid email | Resend API returns error; show toast "Failed to send" |
| Blog post slug already exists | Auto-append `-2`, `-3` etc. to slug |
| Admin deletes a published blog post | Soft delete (status → ARCHIVED); URL returns 404 |

---

## 4. Data Model (ERD)

```ascii
[User]
- id (PK)
- email
- name
- image
- role (SELLER, ADMIN) DEFAULT 'SELLER'
- plan (FREE, PAID)
- paid_amount (nullable, user-chosen price)
- expires_at
- created_at
- popup_last_shown_at
- popup_dismiss_count
  |
  | 1 : N
  v
[StoreLink]
- id (PK)
- user_id (FK)
- slug (Unique)
- title
- description (plain text, no formatting)
- wa_number
- custom_wa_message
- views_count
- wa_clicks_count
  |
  | 1 : N
  v
[Product]
- id (PK)
- store_id (FK)
- name
- description
- price
- image_url (Cloudflare R2)
- created_at

--- Admin / Z-CMS tables ---

[Announcement]
- id (PK)
- title
- body
- type (BANNER, NOTIFICATION)
- published_at
- created_by (FK → User, role=ADMIN)
- created_at

[AnnouncementDismissal]
- id (PK)
- announcement_id (FK → Announcement)
- user_id (FK → User)
- dismissed_at

[Notification]
- id (PK)
- user_id (FK → User)
- title
- body
- read_at (nullable)
- created_at

[BlogPost]
- id (PK)
- slug (Unique)
- title
- body_mdx
- status (DRAFT, PUBLISHED, ARCHIVED)
- published_at (nullable)
- author_id (FK → User, role=ADMIN)
- created_at
- updated_at

[ContentEdit]
- id (PK)
- page (e.g. 'landing')
- section (e.g. 'hero_headline')
- content_json (structured content: text, formatting)
- edited_by (FK → User, role=ADMIN)
- created_at
```

---

## 5. WhatsApp Autotext Order Flow

When the Buyer clicks "Order on WhatsApp", the system calculates the cart total and generates a WhatsApp deep link.

### Cart Modal Wireframe
```text
+----------------------+
|  YOUR CART           |
|                      |
|  1x Coffee Beans $10 |
|  1x V60 Dripper  $25 |
|                      |
|  Total: $35          |
|                      |
| [ Order on WhatsApp ]|
+----------------------+
```

### URL Generation Logic
```javascript
const baseUrl = `https://wa.me/${store.wa_number}`;
const text = `Hi, I want to order:\n1x Coffee Beans - $10\n1x V60 Dripper - $25\n\nTotal: $35`;
const encodedText = encodeURIComponent(text);
const finalUrl = `${baseUrl}?text=${encodedText}`;
```

---

## 6. Billing Integration (Polar.sh) & Feature Gating

### Checkout Flow
1. Seller enters their preferred yearly price ($5 minimum) in the Name Your Price popup.
2. System redirects to the Polar.sh checkout link with the chosen amount.
3. User completes payment on Polar.sh.

### Webhook & Fulfillment
1. Polar.sh triggers a webhook to `/api/webhooks/polar` with the `checkout.completed` event.
2. Next.js validates the webhook signature using the Polar Secret.
3. The system finds the User by email or metadata ID and updates:
   - `plan = 'PAID'`
   - `paid_amount = <user-chosen amount>`
   - `expires_at = NOW() + 1 YEAR`

### Feature Gating (Sellers)
- UI elements for paid features (Shopify, Google Sheets, Branding) check `if (user.plan === 'PAID')`.
- If false, the UI displays a lock icon and triggers the Name Your Price popup when clicked.
- API endpoints include middleware: `plan === 'PAID' && expires_at > NOW()`.

### RBAC (Admin)
- All `/z-cms/*` routes and `/api/admin/*` endpoints check `if (user.role === 'ADMIN')`.
- Non-admin users are redirected to `/app/dashboard` with an "Access denied" toast.
- Admin role is assigned directly in the database (no self-registration for admins).

---

## 7. Analytics (Custom Internal)

Tracked events (stored in Neon Postgres):
- `user_signed_up`, `store_created`, `product_added`
- `popup_shown`, `popup_yes`, `checkout_completed`
- Page views, WA clicks

*(Optional fallback: Mixpanel Free Tier if we decide not to build it internally.)*

---

## 8. Integrations

### A. Z-CMS Admin Platform (Internal — see ADR-0005)
- **Landing Page Editor:** Inline overlay on the actual landing page. Admin clicks editable areas, sees floating toolbar (B/I/U/font). Saves to Postgres via `POST /api/admin/content` and triggers Next.js revalidation. Next.js reads `ContentEdit` records via ISR to render dynamic copy.
- **Blog (`/z-insights/[slug]`):** Rich text editor with AI drafting (Groq API). Posts stored in `BlogPost` table. Public route renders MDX content. Admin manages via `/z-cms/blog`.
- **User Management:** Admin views all users, stores, plans, usage at `/z-cms/users`. Click user → detail page with email composer and WA link.
- **Announcements:** Admin composes and publishes announcements at `/z-cms/announcements`. Type `BANNER` → dismissable banner on seller dashboard. Type `NOTIFICATION` → appears in user avatar dropdown menu.

### B. Email (Resend)
- Admin sends emails to individual users from Z-CMS user detail page.
- `POST /api/admin/email` → Resend API with subject, body, recipient.
- Sent emails logged in the notification system for audit.

### C. Google Sheets Sync (Paid Seller Feature)
- User provides a public Google Sheet URL or webhook (Make/Zapier).
- Orders push CSV rows to the configured webhook.

### D. Shopify Import (Paid Seller Feature)
- User inputs `store-name.myshopify.com`.
- Backend fetches `https://store-name.myshopify.com/products.json`, maps to Product schema, bulk inserts into Neon Postgres.


---

## 9. Local Development Setup

### Prerequisites
- Node.js 20+ (LTS)
- Docker & Docker Compose (for local Postgres and MinIO)
- pnpm (`corepack enable && corepack prepare pnpm@latest --activate`)

### Environment Variables

Create `.env.local` from the template:

```bash
cp .env.example .env.local
```

| Variable | Local Value | Production Value |
|----------|-------------|------------------|
| `DATABASE_URL` | `postgresql://zippp:zippp@localhost:5432/zippp` | Neon connection string (pooled) |
| `DIRECT_DATABASE_URL` | Same as above locally | Neon direct connection string (for migrations) |
| `STORAGE_ENDPOINT` | `http://localhost:9000` | `https://<account>.r2.cloudflarestorage.com` |
| `STORAGE_ACCESS_KEY` | `minioadmin` | Cloudflare R2 access key |
| `STORAGE_SECRET_KEY` | `minioadmin` | Cloudflare R2 secret key |
| `STORAGE_BUCKET` | `zippp-dev` | `zippp-prod` |
| `STORAGE_PUBLIC_URL` | `http://localhost:9000/zippp-dev` | `https://cdn.zippp.link` |
| `NEXTAUTH_URL` | `http://localhost:3000` | `https://zippp.link` |
| `NEXTAUTH_SECRET` | (generate with `openssl rand -base64 32`) | (different secret) |
| `GOOGLE_CLIENT_ID` | Google OAuth credentials (dev) | Google OAuth credentials (prod) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth credentials (dev) | Google OAuth credentials (prod) |
| `POLAR_WEBHOOK_SECRET` | (test secret from Polar sandbox) | (production secret) |
| `GROQ_API_KEY` | (your Groq key) | (production key) |
| `RESEND_API_KEY` | (test key from Resend) | (production key) |

### Docker Compose (Local Services)

`docker-compose.yml` provides local replacements for Neon Postgres and Cloudflare R2:

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: zippp
      POSTGRES_PASSWORD: zippp
      POSTGRES_DB: zippp
    volumes:
      - pgdata:/var/lib/postgresql/data

  minio:
    image: minio/minio:latest
    ports:
      - "9000:9000"   # S3 API
      - "9001:9001"   # MinIO Console UI
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    command: server /data --console-address ":9001"
    volumes:
      - miniodata:/data

  minio-init:
    image: minio/mc:latest
    depends_on:
      - minio
    entrypoint: >
      /bin/sh -c "
      sleep 3;
      mc alias set local http://minio:9000 minioadmin minioadmin;
      mc mb local/zippp-dev --ignore-existing;
      mc anonymous set download local/zippp-dev;
      "

volumes:
  pgdata:
  miniodata:
```

### Quick Start

```bash
# 1. Start local Postgres + MinIO
docker compose up -d

# 2. Install dependencies
pnpm install

# 3. Run database migrations
pnpm drizzle-kit push

# 4. Seed development data (optional)
pnpm db:seed

# 5. Start dev server
pnpm dev
```

App runs at `http://localhost:3000`. MinIO console at `http://localhost:9001` (login: minioadmin/minioadmin).

### Differences: Local vs Production

| Concern | Local | Production |
|---------|-------|------------|
| **Database** | Docker Postgres 16 | Neon Postgres (serverless, branching) |
| **Object Storage** | MinIO (S3-compatible) | Cloudflare R2 (S3-compatible) |
| **Auth** | Same NextAuth, but use Google OAuth "test" credentials | Production Google OAuth credentials |
| **Billing** | Polar.sh sandbox / skip webhooks | Polar.sh production |
| **Email** | Console log (no real sends) | Production email provider |

Both use the **S3-compatible API**, so the app code is identical — only env vars change.

---

## 10. Deployment Strategy

### Environments

```
local (Docker)  →  preview (Vercel)  →  production (Vercel)
     ↓                    ↓                      ↓
  Docker PG          Neon Branch            Neon Main
  MinIO              R2 (staging bucket)    R2 (prod bucket)
```

### Pipeline

| Stage | Trigger | Database | Storage | URL |
|-------|---------|----------|---------|-----|
| **Local** | `pnpm dev` | Docker Postgres | MinIO | `localhost:3000` |
| **Preview** | Push to any branch / open PR | Neon branch (auto-created) | R2 `zippp-preview` bucket | `*.vercel.app` |
| **Production** | Merge to `main` | Neon `main` branch | R2 `zippp-prod` bucket | `zippp.link` |

### CI/CD (GitHub Actions)

```
  PR opened/pushed
       │
       ▼
  ┌──────────┐
  │  Lint     │  eslint, tsc --noEmit
  └────┬─────┘
       ▼
  ┌──────────┐
  │  Test     │  jest --coverage (unit + integration)
  └────┬─────┘
       ▼
  ┌──────────┐
  │  E2E     │  playwright (against preview deploy)
  └────┬─────┘
       ▼
  ┌──────────┐
  │  Deploy  │  Vercel auto-deploys preview
  └──────────┘

  Merge to main
       │
       ▼
  ┌──────────────┐
  │  Production  │  Vercel auto-deploys to zippp.link
  │  Deploy      │  Neon main branch, R2 prod bucket
  └──────────────┘
```

### Database Migrations

- **Local:** `pnpm drizzle-kit push` applies schema directly.
- **Preview:** Neon creates a branch from `main` automatically per Vercel integration. Migrations run via `pnpm drizzle-kit migrate` in the Vercel build step.
- **Production:** Migrations run during the Vercel build on merge to `main`. Drizzle generates SQL migration files committed to `drizzle/` directory.

### Rollback Strategy

- **Vercel:** Instant rollback to previous deployment via Vercel dashboard or `vercel rollback`.
- **Database:** Neon supports point-in-time restore (PITR). For schema rollbacks, write a reverse migration in Drizzle.
- **Storage:** R2 object versioning enabled on production bucket.

---

## 11. Acceptance Criteria (Strict TDD)

BDD-style acceptance criteria — 98% confidence before shipping.

### Feature: 7-Day Upsell Popup
- **Scenario: User hits 7 days**
  - **Given** a user is on the Free tier.
  - **And** it has been >= 7 days since their `created_at` date.
  - **And** `popup_dismiss_count` is < 3.
  - **When** they load the Dashboard.
  - **Then** the micro-commitment Upsell Popup is displayed.
  - **And** the `popup_shown` tracking event is fired.

### Feature: Store Creation
- **Scenario: Valid store creation**
  - **Given** an authenticated user with no existing store.
  - **When** they submit the onboarding form with "My Coffee" and "+62812345678".
  - **Then** a StoreLink record is created.
  - **And** the user is redirected to `/app/dashboard`.

### Feature: RBAC Login Redirect
- **Scenario: Admin login**
  - **Given** a user with `role = ADMIN` authenticates via Google.
  - **When** NextAuth callback fires.
  - **Then** the user is redirected to `/z-cms/`.
- **Scenario: Seller login**
  - **Given** a user with `role = SELLER` authenticates via Google.
  - **When** NextAuth callback fires.
  - **Then** the user is redirected to `/app/dashboard` (or `/app/onboarding` if no store exists).
- **Scenario: Non-admin accesses /z-cms/**
  - **Given** a user with `role = SELLER`.
  - **When** they navigate to `/z-cms/`.
  - **Then** they are redirected to `/app/dashboard` with an "Access denied" toast.

### Feature: Announcement
- **Scenario: Admin publishes a banner announcement**
  - **Given** an admin at `/z-cms/announcements`.
  - **When** they compose and publish an announcement with type `BANNER`.
  - **Then** all sellers see a dismissable banner at the top of their dashboard on next load.
- **Scenario: Seller dismisses announcement**
  - **Given** a seller sees an announcement banner.
  - **When** they click the dismiss button.
  - **Then** an `AnnouncementDismissal` record is created.
  - **And** the banner no longer appears for that seller.

---

## 12. Project Structure

```text
zippp/
├── adr/                 # Architecture Decision Records
├── drizzle/             # Generated SQL migration files
├── public/              # Static assets
├── src/
│   ├── app/
│   │   ├── (public)/    # Landing page, /s/{slug} store pages
│   │   ├── app/         # Seller dashboard routes (/app/*)
│   │   ├── z-cms/       # Admin dashboard routes (/z-cms/*)
│   │   ├── z-insights/  # Public blog routes (/z-insights/[slug])
│   │   ├── login/       # Shared login page
│   │   └── api/
│   │       ├── auth/    # NextAuth API routes
│   │       ├── admin/   # Admin-only API routes (content, email, announcements)
│   │       ├── store/   # Seller store API routes
│   │       └── webhooks/# Polar.sh webhook handler
│   ├── components/      # Reusable UI components
│   ├── lib/             # Utilities (DB client, Analytics, NextAuth, S3, Resend, RBAC)
│   ├── styles/          # Global CSS
│   └── tests/           # Jest & Playwright tests (MANDATORY)
├── docker-compose.yml   # Local Postgres + MinIO
├── .env.example         # Environment variable template
├── ARCHITECTURE_CONSTITUTION.md
├── DESIGN.md
├── SPEC.md              # This file — single source of truth
├── landing-page.html    # Working HTML prototype
└── llms.txt             # AI crawler context (llms.txt standard)
```
