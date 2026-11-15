# 13. Plans, Usage Units, and Gating Specification

Status: approved proposal, ready for implementation.
Related decisions: DEC-002 (Monetization: monthly fair-use, web pay), DEC-003 (Surfaces + auth), DEC-006 (Plans, usage units, and gating).
Related features: FEAT-117 (Subscription fair-use meter), FEAT-118 (Android web parity UI), FEAT-121 (Import statements and spreadsheets).

---

## 1. Executive Summary

Zippp operates on a subscription model featuring two distinct tiers: **Standard** and **Pro**.
Consumption is tracked via a unified **usage unit** pool per billing cycle rather than separate quotas.

The system ensures cost predictability, prevents user surprise through strict zero-cost safety rules, and enforces tier boundaries strictly on the server side. 

In strict adherence to DEC-002, Google Play Store compliance is preserved by keeping all checkout flows, upgrade CTAs, and pricing interfaces entirely off the Android client. Upselling lives exclusively on the web client and optional Telegram bot notifications.

---

## 2. Subscription Tiers

| Dimension | Standard Tier | Pro Tier |
|---|---|---|
| Target Persona | Personal budgeters, single-receipt capture | Freelancers, power users, small operators |
| Document Pages | Single-page only (1 page per scan/PDF) | Multi-page PDF enabled |
| Upload Concurrency | Single-file only (1 file per upload job) | Multi-file upload batching enabled |
| Spreadsheet Import | CSV and Excel (`.xlsx`) row import | CSV and Excel (`.xlsx`) row import |
| Fair-use Unit Allowance | `PLAN_STANDARD_UNITS` (OWNER TO SET) | `PLAN_PRO_UNITS` (OWNER TO SET) |
| Price | `PLAN_STANDARD_PRICE_*` (OWNER TO SET) | `PLAN_PRO_PRICE_*` (OWNER TO SET) |

---

## 3. Usage Units Accounting Model

Usage units measure direct operational and backend processing cost.

### 3.1 Unit Cost Schedule

| Action | Cost in Usage Units | Trigger Moment | Notes |
|---|---|---|---|
| Scan Photo (Camera) | 1 unit | On accepted/confirmed send to Sheet | Extract and review cost nothing until confirmed. |
| Scan File (PDF / Image Upload) | 1 unit per page processed | On accepted/confirmed send to Sheet | Multi-page PDF (Pro) debits 1 unit per page accepted. |
| Import Row (CSV / Excel) | 1 unit per row sent | On confirmed send to Sheet | Parse and column mapping cost zero. |
| Manual Entry | 0 units | Immediate | Entering spend by hand consumes zero units. |

### 3.2 Zero-Cost Safety Rules

To ensure fair use and maintain user trust, unsuccessful or aborted operations never decrement the user's unit balance:

1. **Extraction Failure:** If OCR or the LLM cannot read a receipt, or if `/api/extract` returns an error, cost is **0 units**.
2. **Extraction Retry:** Retrying an extraction after a network error or transient failure costs **0 units**.
3. **Discard (Buang):** Discarding an extracted draft during review costs **0 units**.
4. **Import Parsing:** Uploading, parsing, and previewing CSV/Excel rows in FEAT-121 costs **0 units**. Units are only spent when the user confirms sending the drafted rows to their Google Sheet.
5. **Sheet Write Failure:** If appending to Google Sheets fails due to credential expiration, missing permissions, or network disconnect, the unit is **not** spent (or is rolled back).

---

## 4. Multi-Page and Multi-File Gating Rules

Features requiring higher compute or batch memory are gated behind the Pro tier:

### 4.1 Multi-Page PDF Handling
- **Standard:** If a uploaded PDF contains more than 1 page, the server rejects the request immediately with error code `TIER_REQUIRED` and metadata `{ feature: "multi_page", requiredTier: "pro" }`.
- **Pro:** Multi-page documents are accepted up to the global document page ceiling configured in `src/lib/billing/config.ts`.

### 4.2 Multi-File Upload Handling
- **Standard:** Upload endpoints and file pickers allow exactly 1 file selection at a time. Submitting a multipart payload with multiple files triggers `TIER_REQUIRED`.
- **Pro:** Multi-file batch selection is enabled up to the batch limit configured in `src/lib/billing/config.ts`.

---

## 5. Server-Side Enforcement and API Contracts

Client-side checks are solely for UI responsiveness. The server is the sole source of truth and enforces all boundaries.

### 5.1 Typed Gating Error Payload

When an account on the Standard tier attempts a Pro feature, or when an unauthenticated request attempts tier-restricted endpoints, the server returns HTTP `403 Forbidden` with the following JSON structure:

```json
{
  "error": {
    "code": "TIER_REQUIRED",
    "message": "This feature requires the Pro plan.",
    "feature": "multi_page",
    "requiredTier": "pro",
    "currentTier": "standard"
  }
}
```

Standard error codes handled by clients:
- `TIER_REQUIRED`: The requested action requires a higher subscription tier.
- `QUOTA_EXCEEDED`: The account has consumed 100% of its monthly fair-use unit allowance.

### 5.2 Server Architecture
- `POST /api/extract`: Checks file count (Standard = 1) and inspects PDF page count before invoking OCR. If limits are exceeded for the user's tier, execution aborts before OCR or LLM calls are made, incurring zero API provider costs.
- `POST /api/import/parse`: Verifies file format and size limits.
- `POST /api/review/accept` or `POST /api/import/send`: Checks remaining usage units atomically against Upstash Redis before writing to Google Sheets.

---

## 6. Configuration Constants

All tier thresholds, prices, and allowances live in `src/lib/billing/config.ts`. In accordance with project laws, prices and quotas are not invented here and are explicitly flagged for owner configuration.

```typescript
// Tier definitions
export type SubscriptionTier = "standard" | "pro";

// Monthly fair-use allowances in Usage Units (OWNER TO SET)
export const PLAN_STANDARD_UNITS = Number(process.env.PLAN_STANDARD_UNITS || 300); // OWNER TO SET
export const PLAN_PRO_UNITS = Number(process.env.PLAN_PRO_UNITS || 1000); // OWNER TO SET

// Pricing placeholders (OWNER TO SET)
export const PLAN_STANDARD_PRICE_IDR = Number(process.env.PLAN_STANDARD_PRICE_IDR || 0); // OWNER TO SET
export const PLAN_PRO_PRICE_IDR = Number(process.env.PLAN_PRO_PRICE_IDR || 0); // OWNER TO SET

export const PLAN_STANDARD_PRICE_USD = Number(process.env.PLAN_STANDARD_PRICE_USD || 0); // OWNER TO SET
export const PLAN_PRO_PRICE_USD = Number(process.env.PLAN_PRO_PRICE_USD || 0); // OWNER TO SET

// Feature gating limits
export const TIER_LIMITS = {
  standard: {
    maxPagesPerDoc: 1,
    maxFilesPerUpload: 1,
    canImportStatements: true,
  },
  pro: {
    maxPagesPerDoc: 20, // Global ceiling
    maxFilesPerUpload: 10, // Batch limit
    canImportStatements: true,
  },
} as const;
```

---

## 7. Upselling and Platform Boundaries (DEC-002)

### 7.1 Android App Restrictions (Play Store Policy Compliance)

Per DEC-002, Android is a first-class operational client but **never sells**. 
To prevent rejection under Google Play Developer Distribution Agreement policy boundaries:

1. **No Checkout or IAP:** No Google Play Billing integration, credit pack purchases, or checkout screens exist on Android.
2. **No Anti-Steering or Direct Web Prompts:** Android does not display strings like "Beli paket di website", "Upgrade to Pro at zippp.link", or external payment links.
3. **Neutral Status Display:** Android displays usage percentage and quota status only (e.g., "75% terpakai" or "Tersisa 45 unit").
4. **Handling `TIER_REQUIRED` on Android:**
   - When a Standard user attempts a multi-page PDF or multi-file upload on Android, the app catches `TIER_REQUIRED` and displays a neutral explanation dialog or toast:
     - Indonesian: *"Fitur multi-halaman tersedia pada paket Pro."*
     - English: *"Multi-page documents are available on the Pro plan."*
   - Actions available: **Tutup** (Close) only. No "Upgrade" button and no external link.
5. **Handling `QUOTA_EXCEEDED` on Android:**
   - Indonesian: *"Batas kuota tercapai."*
   - Actions available: **Tutup** (Close) and **Bantuan** (Help).

### 7.2 Web Upselling Surfaces

All monetization, pricing comparisons, and upgrade CTAs live on the web:

1. **Compare Card:** A dedicated `/pricing` and `/app/settings/plan` card displaying Standard vs Pro features.
2. **Consumption Banners:**
   - **At 80% Fair-Use:** Web app displays a warning banner indicating high allowance usage.
   - **At 100% Fair-Use:** Web app displays a banner indicating the monthly allowance has been reached with an option to upgrade to Pro.
3. **In-Context Gating Prompts:** Attempting to drop multiple files or upload a multi-page PDF on the web opens a plan comparison modal with an upgrade CTA.

### 7.3 Telegram Alert Boundaries

Telegram alerts sent to linked user accounts provide informational status updates only:
- Alert sent when usage reaches 80% and 100%.
- Alerts must remain strictly informational (e.g., *"Kuota bulanan Zippp Space Anda telah mencapai 80%"*).
- Never send raw payment URLs or promotional copy through Telegram alerts.

---

## 8. Alignment and Policy Conflicts with DEC-002

This section explicitly documents the relationship with DEC-002 so the owner can assess tradeoffs:

- **Strict Adherence:** DEC-002 locks Android to showing plan status and usage percentage without checkout flows. DEC-006 enforces this strictly by eliminating upgrade CTAs from Android when `TIER_REQUIRED` occurs.
- **Potential Tradeoff:** The user experience on Android when hitting a Pro boundary is purely informational. The user must independently visit the web application to upgrade their account.
- **Owner Overrule Notice:** If the owner wishes to allow direct in-app upgrades on Android in the future, it would directly conflict with and overrule DEC-002. Executing that change would require:
  1. A formal replacement decision superseding DEC-002.
  2. Integration of Google Play Billing (IAP) with 15% to 30% Play store commission fees.
  3. Complying with Google Play anti-steering rules regarding alternate payment methods.
- **Current Standing:** In absence of an explicit owner overrule, DEC-002 and DEC-006 stand locked as web-only billing with server-side gating.
