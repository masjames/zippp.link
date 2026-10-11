import type { ExtractMethodId } from "./methods";

/** Wording key for each of the four methods, shared by the eval and lessons pages. */
export const METHOD_LABEL_KEYS: Record<ExtractMethodId, string> = {
    "ocr-deepseek": "admin.eval.method.ocrDeepseek",
    "vision-deepseek": "admin.eval.method.visionDeepseek",
    "ocr-gemini": "admin.eval.method.ocrGemini",
    "vision-gemini": "admin.eval.method.visionGemini",
};

export function isMethodId(value: string): value is ExtractMethodId {
    return value in METHOD_LABEL_KEYS;
}
