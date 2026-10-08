import { GoogleGenAI } from "@google/genai";
import { GEMINI_MODEL } from "./config";
import { EXTRACT_PROMPT, RECEIPT_JSON_SCHEMA } from "./schema";

/**
 * Fallback extractor: Gemini reads the image and returns the receipt JSON.
 * Used only when the primary PaddleOCR -> DeepSeek pipeline fails.
 */
export async function extractWithGemini(args: {
    apiKey: string;
    mimeType: string;
    dataBase64: string;
    model?: string;
}): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: args.apiKey });
    const response = await ai.models.generateContent({
        model: args.model ?? GEMINI_MODEL,
        contents: [
            {
                role: "user",
                parts: [
                    { text: EXTRACT_PROMPT },
                    {
                        inlineData: {
                            mimeType: args.mimeType,
                            data: args.dataBase64,
                        },
                    },
                ],
            },
        ],
        config: {
            responseMimeType: "application/json",
            responseSchema: RECEIPT_JSON_SCHEMA,
            thinkingConfig: { thinkingBudget: 0 },
        },
    });
    return response?.text ?? "";
}
