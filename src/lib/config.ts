/**
 * Extraction configuration.
 *
 * Attempt order:
 *   1. PaddleOCR (vision) -> reconstructed rows -> DeepSeek Flash (text)
 *   2. DeepSeek Flash vision (image -> JSON) — cheap and fast, absorbs OCR timeouts
 *   3. Gemini (vision -> JSON) — last resort only (rate-limited: RPM 5)
 */

export const GEMINI_MODEL = "gemini-2.5-flash";

export type ExtractProvider = "paddle" | "gemini";

const requestedProvider = (process.env.EXTRACT_PROVIDER ?? "paddle").toLowerCase();
export const EXTRACT_PROVIDER: ExtractProvider =
    requestedProvider === "gemini" ? "gemini" : "paddle";

/* ------------------------------- PaddleOCR ------------------------------ */

export const PADDLEOCR_BASE_URL = (
    process.env.PADDLEOCR_BASE_URL || "https://paddleocr.aistudio-app.com"
).replace(/\/+$/, "");
export const PADDLEOCR_MODEL = process.env.PADDLEOCR_MODEL || "PP-OCRv6";
export const PADDLEOCR_TOKEN = process.env.PADDLEOCR_AISTUDIO_TOKEN || "";

/**
 * Whole OCR stage budget (submit + AI Studio queue + OCR). PP-OCRv6 is ~3-3.5s
 * on Vercel but can exceed that when the AI Studio queue is busy; too tight a
 * cap means DeepSeek/Gemini re-read the image. Raise/lower via env.
 */
export const PADDLEOCR_TIMEOUT_MS = Number(process.env.PADDLEOCR_TIMEOUT_MS || 10_000);
export const PADDLEOCR_POLL_INTERVAL_MS = Number(
    process.env.PADDLEOCR_POLL_INTERVAL_MS || 400
);

/* --------------------------------- Models ------------------------------- */

export const DEEPSEEK_BASE_URL = (
    process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com"
).replace(/\/+$/, "");
export const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-flash";
export const DEEPSEEK_MAX_TOKENS = Number(process.env.DEEPSEEK_MAX_TOKENS || 4000);
export const DEEPSEEK_TOKEN = process.env.DEEPSEEK_API_KEY || "";
export const DEEPSEEK_TIMEOUT_MS = Number(process.env.DEEPSEEK_TIMEOUT_MS || 5_500);
export const GEMINI_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS || 5_500);

/* --------------------------------- Misc --------------------------------- */

/** Intermediate OCR payload sent to DeepSeek. Only "markdown" is used today. */
export const OCR_FORMAT = (process.env.OCR_FORMAT || "markdown").toLowerCase();
