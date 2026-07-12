# Implementation Plan: Zippp.link Phased Rollout

This plan outlines the step-by-step implementation of the Zippp.link store builder. To ensure smooth development and visual feedback, we follow a **UX-First approach**: we build the entire user experience with mock data first (bypassing authentication), followed by local database/storage wiring, NextAuth configuration, cloud deployment, and finally, Polar.sh checkout integration.

---

## Technical Phases

### Phase 1: UI & Experience iteration (Sandbox)
Build out the visual structure of the app using Next.js App Router and Tailwind CSS, following the minimalist B&W style.

#### 1. Core Layout & Branding
- Port `landing-page.html` prototype to Next.js page at `src/app/(public)/page.tsx`.
- Configure fonts (Archivo and Excalifont) in global CSS or next/font.
- Implement reusable UI components (B&W buttons, grids, input fields).

#### 2. Buyer Journey Views (Sandbox Mode)
- **Public Store Page** (`src/app/(public)/s/[slug]/page.tsx`): Product grid showing mock products (image, name, price, and add button).
- **Inline Cart Bar**: Interactive bottom bar displaying item count, subtotal, and "View Cart" button.
- **Cart Bottom Sheet**: Cart review modal with quantity adjusters (`+` / `-`) and "Order on WhatsApp" button.
- **WhatsApp Redirection**: Generate `wa.me` deep links dynamically from cart data with pre-filled order text.

#### 3. Seller Dashboard (Sandbox Mode)
- **Dashboard** (`src/app/app/dashboard/page.tsx`): Overview metrics (views, clicks, plan). Product list with mock edit links.
- **Upsell Popup**: Bottom sheet overlay on the dashboard showing satisfaction questions and the Name Your Price input field.
- **Settings Panel** (`src/app/app/settings/page.tsx`): Four-tab UI (Shopify, Sheets, Branding) locked on free tier with unlock triggers.

#### 4. Admin Z-CMS (Sandbox Mode)
- **Dashboard Overview** (`src/app/z-cms/page.tsx`): Display aggregate metrics (total users, active stores, MRR).
- **Announcements**: Form to publish banners / dropdown notifications to all seller dashboards.

---

### Phase 2: Local DB (Drizzle) & Object Storage (MinIO)
Integrate local databases and media file uploads.

#### 1. Drizzle ORM Schema
- Create schema definitions in `src/lib/db/schema.ts` matching `SPEC.md` §4:
  - `users`
  - `store_links`
  - `products`
  - `announcements`
  - `announcement_dismissals`
  - `notifications`
  - `blog_posts`
  - `content_edits`

#### 2. Local Services Setup
- Run Postgres 16 and MinIO using `docker compose up -d` (via the existing `docker-compose.yml`).
- Create a script to run schema push: `pnpm drizzle-kit push`.

#### 3. Product Media Uploads
- Implement POST route `/api/products/upload` receiving `multipart/form-data` and uploading images directly to local MinIO using `@aws-sdk/client-s3`.

---

### Phase 4: Auth & RBAC Middleware Routing
Secure the application with Google OAuth and redirect rules.

#### 1. NextAuth v4 Setup
- Initialize NextAuth configuration at `src/app/api/auth/[...nextauth]/route.ts`.
- Integrate Google OAuth provider and connect Drizzle database adapter.
- Inject `role` parameter (`SELLER` vs `ADMIN`) into session token.

#### 2. Role-Based Access Control (RBAC)
- Implement route layouts checking session state:
  - Non-admins navigating to `/z-cms/*` should be redirected to `/app/dashboard`.
  - Authenticated sellers should skip onboarding if they already own a store.

---

### Phase 4: CI/CD & Deployments (Vercel & Neon)
Launch the application into preview and production pipelines.

#### 1. GitHub Actions (CI)
- Create `.github/workflows/ci.yml` running linting (`pnpm lint`), typechecking (`tsc --noEmit`), unit tests (`pnpm test`), and Playwright integration tests.

#### 2. Vercel & Neon Integration
- Set up Vercel project and connect Neon Postgres integration (allowing automated database branching on staging PRs).
- Configure environment variables in Vercel panel for staging/production.

---

### Phase 5: Polar.sh Billing Setup
Wire up Name Your Price checkout and subscription lifecycle.

#### 1. Checkout Redirect
- Redirect users to their user-configured price on Polar checkout.

#### 2. Webhook Processor
- Build `/api/webhooks/polar` API route.
- Verify Polar signature, read payload, match user email, and update:
  - `plan` -> `PAID`
  - `paid_amount` -> `<amount>`
  - `expires_at` -> `NOW() + 1 year`

---

## Verification & Testing Plan

### Automated Testing
- **Unit & Integration**: Drizzle DB queries, cart calculations, and deep-link formatting.
- **E2E Tests**: Playwright scripts simulating buyer checkout flow (adding items -> opening cart -> clicking WA order button).

### Manual Verification
- Walk through store creation, item selection, and cart total calculations.
- Access `/z-cms/` as non-admin to verify access denial redirect.
- Trigger Name Your Price bottom sheet on dashboard, verify redirect to Polar sandbox.
