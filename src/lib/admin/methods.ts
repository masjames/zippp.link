/**
 * The four extraction methods compared in the admin eval. Kept in a small
 * client-safe module so the UI and the pipeline agree on the ids and on which
 * methods need an OCR pass.
 */

export type ExtractMethodId =
    | "ocr-deepseek"
    | "vision-deepseek"
    | "ocr-gemini"
    | "vision-gemini";

export type ExtractMethodInfo = {
    id: ExtractMethodId;
    /** Runs PaddleOCR and structures the rows. */
    needsOcr: boolean;
    /** Structuring model when the rows are used, or "vision" for image-only. */
    kind: "structuring" | "vision";
    provider: "deepseek" | "gemini";
};

export const EXTRACT_METHODS: ExtractMethodInfo[] = [
    { id: "ocr-deepseek", needsOcr: true, kind: "structuring", provider: "deepseek" },
    { id: "vision-deepseek", needsOcr: false, kind: "vision", provider: "deepseek" },
    { id: "ocr-gemini", needsOcr: true, kind: "structuring", provider: "gemini" },
    { id: "vision-gemini", needsOcr: false, kind: "vision", provider: "gemini" },
];

export const EXTRACT_METHOD_IDS = EXTRACT_METHODS.map((m) => m.id);

export function isExtractMethodId(value: string): value is ExtractMethodId {
    return EXTRACT_METHOD_IDS.includes(value as ExtractMethodId);
}

export function methodNeedsOcr(id: string): boolean {
    return EXTRACT_METHODS.some((m) => m.id === id && m.needsOcr);
}
