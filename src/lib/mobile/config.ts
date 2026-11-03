/**
 * Mobile API feature gate and secret policy.
 *
 * The mobile endpoints are dark by default. Set MOBILE_API_ENABLED=true in
 * Preview first, then Production after the web regression tests pass.
 */
export function mobileApiEnabled(): boolean {
  return process.env.MOBILE_API_ENABLED === "true";
}

/**
 * The mobile JWT secret. Production must configure a >= 32 byte random value.
 * There is a dev-only fallback so local pairing works without a production
 * secret, but production fails closed.
 */
export function mobileJwtSecret(): string | null {
  const secret = (process.env.MOBILE_JWT_SECRET || "").trim();
  if (secret.length >= 32) return secret;
  if (process.env.NODE_ENV !== "production") {
    return "zippp-dev-only-mobile-secret-do-not-use-in-production";
  }
  return null;
}
