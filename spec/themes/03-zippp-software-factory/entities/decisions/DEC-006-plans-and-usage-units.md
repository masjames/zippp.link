---
id: DEC-006
type: decision
title: Plans, usage units, and gating
status: done
assignee: adit
relations:
  blocks: []
  implements: ["DIR-001", "DEC-002", "DEC-003"]
  depends_on: ["DIR-001", "DEC-002", "DEC-003", "FEAT-117", "FEAT-121"]
verification:
  target_files:
    - "spec/themes/03-zippp-software-factory/android-spec/13-plans-and-usage-units.md"
    - "src/lib/billing/config.ts"
  test_command: "npx tsc --noEmit"
  prod_endpoint: ""
---

# Locked call

Zippp offers two subscription tiers: **Standard** and **Pro**. Both draw from a single unified **usage unit** pool per billing period. 

- **1 scan** (photo capture or file upload through OCR/LLM) = **1 usage unit**.
- **1 sent imported row** (confirmed transaction row sent from CSV or Excel import via FEAT-121) = **1 usage unit**.
- **Zero-cost operations:** An unreadable photo, failed extract, retried extract, or discarded draft (Buang) spends **0 usage units**. The import parse step spends **0 usage units**; usage units are consumed only upon confirmed send to the user Google Sheet.
- **Multi-page and multi-file gating:** Standard tier is capped at single-page scans and single-file uploads. Pro tier unlocks multi-page PDF documents and batch multi-file uploads.
- **Server authority:** Gating and usage tracking are enforced on the server. Attempting a Pro feature from a Standard account returns a typed `TIER_REQUIRED` error payload (`403 Forbidden`).
- **Upselling and Play Store compliance:** In-app purchase CTAs or upgrade steering are strictly forbidden on Android per DEC-002. All upsell messaging, tier comparison cards, and subscription upgrades live exclusively on the web and optional Telegram alerts.

# Why

A unified usage unit aligns cost with real infrastructure consumption (OCR, vision tokens, Google Sheets write operations) without confusing users with separate quota buckets.

Capping Standard to single-page and single-file keeps extraction latency and token costs predictable for the base tier, while offering clear operational value for Pro subscribers who process dense invoices and batch exports.

Enforcing gating strictly on the server protects API integrity, while keeping Android clean of any checkout links or upgrade steering preserves compliance with Google Play billing policies.

# Locked

- [x] Two tiers: Standard and Pro.
- [x] Unified unit accounting: 1 scan = 1 unit; 1 sent import row = 1 unit.
- [x] Zero-cost safety: failed extracts, retries, and Buang cost 0. Parse step for import costs 0.
- [x] Standard tier constraint: 1 page per document, 1 file per upload.
- [x] Pro tier feature: multi-page PDF documents and multi-file uploads enabled.
- [x] Server-side gating: server checks tier and returns typed error code `TIER_REQUIRED` if unauthorized. The client is never trusted.
- [x] Numerical allowances and price points remain marked "OWNER TO SET" in `src/lib/billing/config.ts`. No invented prices or caps.
- [x] Android app displays usage percentage and remaining allowance only. No purchase prompts, no upgrade buttons, and no outbound checkout links on Android.
- [x] Upsell surfaces are limited to the web application (comparison cards, banners at 80% and 100% fair-use consumption) and optional Telegram alerts.

# Policy and DEC-002 relationship

DEC-002 establishes that checkout and plan management stay web-only, and Android never sells. 

This decision (DEC-006) respects DEC-002 in full:
1. Android receives `TIER_REQUIRED` error codes when a Standard user attempts a Pro feature, but Android only presents a neutral informational notice (no web links, no pricing, no call to action to pay).
2. All upgrade actions, tier comparison tables, and billing changes occur on the web app.
3. If the owner ever chooses to introduce in-app upgrades on Android, that change would directly overrule DEC-002 and require a formal replacement decision along with Google Play Billing integration. Until then, DEC-002 stands locked.

# Non-goals

- Inventing pricing figures in IDR or USD (owner sets values in `src/lib/billing/config.ts`).
- Implementing Google Play in-app billing.
- Arbitrary per-field or per-item micro-metering.

# Done when

The plan and usage units specification (`spec/themes/03-zippp-software-factory/android-spec/13-plans-and-usage-units.md`) is written, `src/lib/billing/config.ts` documents the placeholder constants, and both typecheck and build pass cleanly.
