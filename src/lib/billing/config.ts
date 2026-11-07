/** Billing constants and env. No magic numbers elsewhere. */

export const IDR_PER_CREDIT = 150;
export const MIN_TOPUP_IDR = 15_000;
/** Invited accounts may top up from this lower amount (special invite). */
export const INVITE_MIN_TOPUP_IDR = 10_000;
/** QRIS per-payment maximum (Kasera / national QRIS limit). */
export const MAX_TOPUP_IDR = 10_000_000;
export const CREDIT_TTL_DAYS = 30;
export const REFERRER_PCT = 20;
export const REFERRED_BONUS_CREDITS = 20;
/** Header credit pill turns amber below this count and red at zero. */
export const LOW_CREDITS_WARN = 10;
/** Manual GoPay order validity (minutes). */
export const ORDER_TTL_MIN = 60;
/** DOKU hosted checkout page validity (payment_due_date, minutes). */
export const DOKU_ORDER_TTL_MIN = 60;
/** Fair-use captures included per monthly plan. Tunable, not a price. */
export const PLAN_INCLUDED_CAPTURES = Number(
  process.env.PLAN_INCLUDED_CAPTURES || 300
);
export const PLAN_PERIOD_DAYS = 30;

/**
 * DEC-006: Subscription Tiers, Allowances, and Feature Limits.
 * Pricing and allowances marked "OWNER TO SET".
 */
export type SubscriptionTier = "standard" | "pro";

/** Monthly fair-use allowances in Usage Units (OWNER TO SET). */
export const PLAN_STANDARD_UNITS = Number(
  process.env.PLAN_STANDARD_UNITS || 300
); // OWNER TO SET
export const PLAN_PRO_UNITS = Number(
  process.env.PLAN_PRO_UNITS || 1000
); // OWNER TO SET

/** Monthly tier pricing in IDR and USD (OWNER TO SET). */
export const PLAN_STANDARD_PRICE_IDR = Number(
  process.env.PLAN_STANDARD_PRICE_IDR || 0
); // OWNER TO SET
export const PLAN_PRO_PRICE_IDR = Number(
  process.env.PLAN_PRO_PRICE_IDR || 0
); // OWNER TO SET
export const PLAN_STANDARD_PRICE_USD = Number(
  process.env.PLAN_STANDARD_PRICE_USD || 0
); // OWNER TO SET
export const PLAN_PRO_PRICE_USD = Number(
  process.env.PLAN_PRO_PRICE_USD || 0
); // OWNER TO SET

/** Feature gating boundaries by tier (DEC-006). */
export const TIER_LIMITS = {
  standard: {
    maxPagesPerDoc: 1,
    maxFilesPerUpload: 1,
    canImportStatements: true,
  },
  pro: {
    maxPagesPerDoc: 20,
    maxFilesPerUpload: 10,
    canImportStatements: true,
  },
} as const;

export const INTL_PACK_CREDITS = 100;
export const INTL_PACK_USD = 9;
/** Suggested IDR top-up amounts shown on the public pricing page and in the app. */
export const IDR_TOPUP_PRESETS = [15_000, 30_000, 50_000, 100_000];

/**
 * DOKU Checkout channels. QRIS is halted for now — Indonesia top-up uses
 * manual GoPay (`orders.ts`) instead. Keep this list empty (or non-QRIS
 * only) until QRIS notification URL + channel are ready again.
 */
export const DOKU_PAYMENT_METHODS = [] as const;

export const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL || "";
export const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || "";

function csv(name: string): string[] {
  return (process.env[name] || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export const ADMIN_EMAILS = csv("ADMIN_EMAILS");
export const GOPAY_NUMBER = process.env.GOPAY_NUMBER || "";
export const GOPAY_NAME = process.env.GOPAY_NAME || "";

export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

export function gopayConfigured(): boolean {
  return Boolean(GOPAY_NUMBER && GOPAY_NAME);
}

/** Credits granted by a base IDR amount (the unique code is not credited). */
export function creditsForIdr(amount: number): number {
  return Math.floor(amount / IDR_PER_CREDIT);
}
