# Project: Zippp.link Store Builder

## Architecture
Zippp.link is a Next.js application built using the App Router. It integrates NextAuth for authentication, Drizzle ORM to connect to Neon/Postgres, Cloudflare R2 (or MinIO locally) for product image uploads, and Polar.sh for payment processing.

- **Frontend**: Next.js App Router (RSC + Client components), Tailwind CSS, Refactoring UI design guidelines (pure B&W with theme picker).
- **Backend / API**: Next.js Route Handlers (`src/app/api/...`) with role-based routing (RBAC) checked at layouts and API levels.
- **Database Layer**: Drizzle ORM schemas and migrations (`src/lib/db/...`), Postgres client.
- **Storage Layer**: AWS S3-compatible client (`@aws-sdk/client-s3`) pointing to MinIO locally and Cloudflare R2 in production.
- **Billing / Webhooks**: Polar.sh billing webhook processor verifying signatures and updating plans.
- **Testing**: Jest/Supertest for unit and integration testing, Playwright for E2E user flow tests.

## Code Layout
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
```

## Milestones
| # | Name | Scope | Dependencies | Status | Conv ID |
|---|------|-------|--------------|--------|---------|
| 1 | E2E Testing Track | Create the full E2E test suite (Tiers 1-4) using Playwright, establishing `TEST_INFRA.md` and `TEST_READY.md`. | None | DONE | 17dded32-0f15-4088-a87d-a9a35f29bf7f |
| 2 | UI & Experience (Sandbox) | Implement Next.js App structure, port landing page, B&W layout with switcher, seller dashboard, upsell bottom sheet, settings mock tabs, admin Z-CMS, and community forum. | None | DONE | d981cd59-e34e-4073-9550-c1dc536df9fc |
| 3 | Database & Storage Setup | Docker compose for PG + MinIO, Drizzle schemas push, image upload API (`/api/products/upload`) with S3 client. | M2 | IN_PROGRESS | 617fa426-bdec-4e97-ae1b-78356af28623 |
| 4 | Auth & RBAC Middleware | Setup NextAuth Google provider + Drizzle adapter, custom session injection (role), middleware access restriction for `/z-cms`. | M3 | PLANNED | |
| 5 | Polar Billing & Gating | Polar webhook handler verifying signature, custom pricing checkout redirection, paid feature gating. | M4 | PLANNED | |
| 6 | E2E Pass & Hardening | Implementation Track: pass 100% of E2E tests, and white-box adversarial coverage hardening (Tier 5). | M1, M5 | PLANNED | |

## Interface Contracts
### 1. Database Schema Definitions (`src/lib/db/schema.ts`)
- The tables: `users`, `store_links`, `products`, `announcements`, `announcement_dismissals`, `notifications`, `blog_posts`, `content_edits`, `community_threads`, `community_replies` must exist matching definitions in SPEC.md.

### 2. NextAuth Session Role Injection (`src/lib/auth.ts`)
- Custom types extending `next-auth`'s `Session` to include `role` (`SELLER` | `ADMIN`) and `plan` (`FREE` | `PAID`).
- Callback: `jwt` and `session` hooks to fetch and inject user status from DB.

### 3. S3 upload API (`/api/products/upload`)
- Method: `POST`
- Payload: `multipart/form-data` with `file`.
- Response: `{ url: string }` or `{ error: string }`.

### 4. Polar Webhook Signature and Payload (`/api/webhooks/polar`)
- Header: `webhook-signature` or matching Polar SDK/headers.
- Event: `checkout.completed`.
- Behavior: Finds user by email/id, updates status to `PAID`, `paid_amount`, and sets `expires_at` to +1 year.
