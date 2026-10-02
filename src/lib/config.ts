/**
 * Extraction configuration.
 *
 * Primary path: PaddleOCR-VL (vision) -> markdown -> DeepSeek Flash (text) ->
 * receipt JSON. Gemini is a fallback only, used when either primary stage
 * fails. `zai`/Zhipu is retired.
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
export const PADDLEOCR_MODEL = process.env.PADDLEOCR_MODEL || "PaddleOCR-VL-1.6";
export const PADDLEOCR_TOKEN = process.env.PADDLEOCR_AISTUDIO_TOKEN || "";
export const PADDLEOCR_SUBMIT_TIMEOUT_MS = Number(
    process.env.PADDLEOCR_SUBMIT_TIMEOUT_MS || 30_000
);
export const PADDLEOCR_POLL_TIMEOUT_MS = Number(
    process.env.PADDLEOCR_POLL_TIMEOUT_MS || 40_000
);
export const PADDLEOCR_POLL_INTERVAL_MS = Number(
    process.env.PADDLEOCR_POLL_INTERVAL_MS || 1_000
);

/* -------------------------------- DeepSeek ------------------------------ */

export const DEEPSEEK_BASE_URL = (
    process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com"
).replace(/\/+$/, "");
export const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-flash";
export const DEEPSEEK_EFFORT = process.env.DEEPSEEK_EFFORT || "low";
export const DEEPSEEK_MAX_TOKENS = Number(process.env.DEEPSEEK_MAX_TOKENS || 4000);
export const DEEPSEEK_TOKEN = process.env.DEEPSEEK_API_KEY || "";
export const DEEPSEEK_TIMEOUT_MS = Number(process.env.DEEPSEEK_TIMEOUT_MS || 30_000);

/* --------------------------------- Misc --------------------------------- */

/** Intermediate OCR payload sent to DeepSeek. Only "markdown" is used today. */
export const OCR_FORMAT = (process.env.OCR_FORMAT || "markdown").toLowerCase();
