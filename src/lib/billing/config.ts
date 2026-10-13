/** Billing constants and env. No magic numbers elsewhere. */

export const IDR_PER_CREDIT = 150;
export const MIN_TOPUP_IDR = 15_000;
export const CREDIT_TTL_DAYS = 30;
export const REFERRER_PCT = 20;
export const REFERRED_BONUS_CREDITS = 20;
/** DOKU hosted checkout page validity (payment_due_date, minutes). */
export const DOKU_ORDER_TTL_MIN = 60;
export const INTL_PACK_CREDITS = 100;
export const INTL_PACK_USD = 9;
/** Suggested IDR top-up amounts shown on the public pricing page and in the app. */
export const IDR_TOPUP_PRESETS = [50_000, 100_000, 200_000, 300_000];

/**
 * DOKU Checkout channels shown to the customer. Each one must have its
 * Notification URL set in the DOKU Back Office, otherwise payments on it
 * never reach /api/doku/notify. Values come from DOKU's supported payment
 * methods list. Add a channel here only after configuring it in the Back
 * Office.
 */
export const DOKU_PAYMENT_METHODS = ["QRIS", "CREDIT_CARD"] as const;

export const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL || "";
export const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || "";

function csv(name: string): string[] {
  return (process.env[name] || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export const ADMIN_EMAILS = csv("ADMIN_EMAILS");
export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

/** Credits granted by a base IDR amount (the unique code is not credited). */
export function creditsForIdr(amount: number): number {
  return Math.floor(amount / IDR_PER_CREDIT);
}
