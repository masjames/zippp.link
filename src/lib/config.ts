export const GEMINI_MODEL = "gemini-2.5-flash";

/**
 * Extraction provider.
 *
 * - "gemini" (default) — the production path, and the only one covered by the
 *   client-privacy promise written in SPEC.md / PRICING.md ("paid Gemini,
 *   training off").
 * - "zai" — dev/test only. Same prompt, routed to Zhipu's GLM-4.6V over an
 *   OpenAI-compatible endpoint, so extraction work can iterate without
 *   spending Gemini quota. Never enable it for client receipts unless the
 *   privacy line is rewritten first.
 */
export type ExtractProvider = "gemini" | "zai";

const requestedProvider = (process.env.EXTRACT_PROVIDER ?? "gemini").toLowerCase();
export const EXTRACT_PROVIDER: ExtractProvider =
  requestedProvider === "zai" ? "zai" : "gemini";

/** Zhipu GLM vision model used when EXTRACT_PROVIDER=zai. */
export const ZAI_MODEL = process.env.ZAI_MODEL || "glm-4.6v";

/** OpenAI-compatible base URL, no trailing slash. */
export const ZAI_BASE_URL = (
  process.env.Z_AI_BASE_URL || "https://api.z.ai/api/paas/v4/"
).replace(/\/+$/, "");

/**
 * GLM reasons before it answers and bills those tokens against max_tokens.
 * Keep headroom or the answer is truncated away entirely.
 */
export const ZAI_MAX_TOKENS = 3000;
