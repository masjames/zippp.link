# Zippp Link - E2E Testing Readiness Report (TEST_READY)

This document provides a summary of E2E test coverage, total case counts, tier classifications, and the checklist of covered features.

---

## 1. Test Tier Classification

The E2E test suite is classified into four distinct testing tiers:

| Tier | Name | Target Scope | Case Count |
| :--- | :--- | :--- | :--- |
| **Tier 1** | Happy Paths & Specifications | Core functional requirements and standard user flows. | 40 cases |
| **Tier 2** | Edge Cases & Security Boundaries | Form validation, rate limits, malicious input, and session gating. | 40 cases |
| **Tier 3** | Pairwise Feature Integration | Mutual interactions between different functional modules. | 8 cases |
| **Tier 4** | Real-World Application Workflows | End-to-end multi-persona scenarios modeling production usage. | 4 cases |

**Total Unique Test Cases**: **92 cases**

---

## 2. Feature Coverage Checklist

### Feature 1: Landing Page & Themes
- [x] Theme presets selector renders minimalist, warm earth, and midnight themes.
- [x] Theme persistence across reloads.
- [x] Responsive layout and zero layout-shifting on static graphics load.
- [x] Route access blocks for unauthenticated users trying to hit dashboards.

### Feature 2: Seller Dashboard & Metrics
- [x] Live stats counters for store page views and WhatsApp orders click-throughs.
- [x] Active subscription plan badge indicator.
- [x] Product management actions (Add, Edit, Delete).
- [x] Announcement dismissal state synchronization in browser cache.

### Feature 3: Buyer Store Page
- [x] Custom store header titles and sub-descriptions.
- [x] Responsive product grids showing images with graceful fallbacks.
- [x] 404 store handler for invalid slugs.
- [x] Access block notices when view limits are exceeded.

### Feature 4: Cart & WhatsApp Ordering
- [x] Interactive bottom inline cart bar updates.
- [x] Bottom-sheet cart modal for reviewing orders.
- [x] Floating subtotal recalculations using correct decimal precision.
- [x] Deep link compiling to WhatsApp API (`wa.me/`) with correct number and encoded text.

### Feature 5: Onboarding Gating
- [x] Redirect gating forcing setup completion on new dashboard requests.
- [x] Form dirty-state alert on unsaved change reloads.
- [x] Auto-generation and collision checks for shop URL slugs.
- [x] UI validation checks for non-numeric WhatsApp phone inputs.

### Feature 6: Settings & Integrations
- [x] Dynamic Shopify store connection and bulk product importing.
- [x] Google Sheets webhook sync and validation checks.
- [x] Branding toggle (show/hide "Powered by Zippp" footer).
- [x] Locked tabs overlay gating for free tier accounts.

### Feature 7: Community Forum
- [x] Discussion board postings for ideas and feature suggestions.
- [x] Special status pill filters (Open, In Progress, Completed, Rejected).
- [x] Markdown body sanitization checking for script injection.
- [x] Nested comment replies highlighting admin user badges.

### Feature 8: Billing, Gating & Upgrades
- [x] "Name Your Price" sliding scale upgrade checks.
- [x] Real-time Polar checkout webhooks validating HMAC signature parameters.
- [x] Instant upgrade unlocks and settings locks restoration on expired subscriptions.
- [x] Renewal extension capabilities.

---

## 3. Case Checklist: Tiers 3 & 4

### Tier 3: Pairwise Integration Specs (`cross-feature.spec.ts`)
- [x] `T3-XF-01: Onboarding to Public Store Integration` (Completing onboarding publishes the store page and checks deep links).
- [x] `T3-XF-02: Webhook Upgrade and Live Session Lock Bypass` (Polar webhook updates immediately unlock dashboard settings tab access).
- [x] `T3-XF-03: Checkout Click Tracking and Dashboard Metrics Sync` (Buyer WhatsApp orders click increments view/click counters on seller dashboard).
- [x] `T3-XF-04: Z-CMS Announcement Propagation and Dismissal Sync` (Announcements published in Z-CMS display on seller dashboard and check dismissal).
- [x] `T3-XF-05: Forum Activity User Detail Trace` (Seller posts on community forum list in admin user management panel details).
- [x] `T3-XF-06: Plan Expiry and Store Product Truncation` (Expiry of seller plans drops store product list back to 5 products limit and restores branding).
- [x] `T3-XF-07: Settings Branding Config and WhatsApp Deep Link Layout` (Paid custom footer formatting is correctly appended to WhatsApp deep link text).
- [x] `T3-XF-08: Admin CMS Page Headline Editor and Theme Switcher` (Landing page editor headline changes preserve chosen dark/midnight CSS classes).

### Tier 4: Real-World Workflows (`workflows.spec.ts`)
- [x] `T4-WK-01: Complete Seller Lifecycle` (Google sign-in, onboarding, adding 5 products, hitting lock block on 6th, billing popup triggers Polar checkout redirect, triggering mock webhook fulfillment, verification settings unlock, import products, customize branding settings).
- [x] `T4-WK-02: Complete Mobile Buyer Purchase Journey` (Mobile viewport Pixel 5, store load, adding products, bottom inline cart updates, viewing cart bottom sheet, quantity adjustments, order submit, check URL parameters redirect).
- [x] `T4-WK-03: Admin Moderation and Announcement Cycle` (Admin login redirect to Z-CMS, check metrics, write MDX blog, publish dashboard announcement, search user manager and composer email send mock, seller dashboard banner rendering).
- [x] `T4-WK-04: Community Bulletin Board Feedback Loop` (Seller posts forum feature request, admin replies and marks IN_PROGRESS, seller notification badge updates on dashboard, click renders marked comment).
