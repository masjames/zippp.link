# ADR-0005: Z-CMS Is the Internal Admin Dashboard, Not a Seller Feature

Date: 2026-07-12
Status: Accepted

## Context

The initial spec defined "Z-Insight CMS" as a paid seller-facing feature — a Medium-style rich text editor inside `/dashboard/settings` for editing store descriptions, customizing typography, and AI-assisted drafting. During planning review, the product owner clarified that Z-CMS is actually the **internal admin platform** for the Zippp team, not a seller tool.

The admin platform needs to:
1. Edit landing page copy directly (inline overlay editor, Postgres-backed).
2. Publish blog posts at `/z-insights/[slug]` (guides, announcements, SEO content).
3. Manage all users, their stores, orders, and usage metrics.
4. Contact users directly via built-in email (Resend integration).
5. Push announcements to seller dashboards (dismissable banner + notification in user menu).

Sellers, meanwhile, need only a plain textarea for their store description — no rich text, no typography controls, no AI drafting.

## Decision

Z-CMS lives at `/z-cms/`, accessible only to users with `role = ADMIN`. The same NextAuth login is used for both sellers and admins; RBAC middleware redirects based on role: `ADMIN` → `/z-cms/`, `SELLER` → `/app`. All landing page edits made through Z-CMS are stored directly in Neon Postgres. Next.js Incremental Static Regeneration (ISR) is used to revalidate the cache when content changes.

Sellers use `/app` with plain text inputs only. The paid tier unlocks Shopify import, Google Sheets sync, and branding controls — but no CMS editor.

## Alternatives considered

- **Separate admin app (different repo/deploy):** Rejected. Same codebase is simpler — shared types, shared DB client, single deploy. Admin routes are just another route group in Next.js App Router.
- **Third-party admin panel (Retool, AdminJS):** Rejected. We need bespoke inline landing page editing and a custom blog CMS.
- **Keep Z-Insight as a seller feature AND build admin dashboard:** Rejected. Sellers don't need rich text — they share links on Instagram/TikTok where formatting doesn't matter. A textarea is sufficient. Building a rich text editor for sellers adds complexity with no clear user benefit.

## Consequences

- **Need RBAC in NextAuth.** Add `role` column to User table, middleware to protect `/z-cms/` and `/api/admin/` routes.
- **Need email service.** Resend added to stack for admin → user direct email contact.
- **Need announcement/notification system.** New DB tables: Announcement, AnnouncementDismissal, Notification, BlogPost, ContentEdit.
- **Seller settings simplified.** Settings tabs reduced from 5 to 4 (Z-Insight tab removed).
- **Landing page content becomes data-driven.** Editable sections are stored in the DB and rendered via ISR, not hardcoded.
- **Blog adds SEO value.** `/z-insights/[slug]` gives us a content marketing channel with zero additional infrastructure.
