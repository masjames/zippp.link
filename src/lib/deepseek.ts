import {
    DEEPSEEK_BASE_URL,
    DEEPSEEK_MAX_TOKENS,
    DEEPSEEK_MODEL,
    DEEPSEEK_TIMEOUT_MS,
    DEEPSEEK_TOKEN,
} from "./config";
import { RECEIPT_SCHEMA_HINT } from "./schema";

export type DeepSeekUsage = {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
};

export type DeepSeekResult = {
    text: string;
    finish: string | null;
    usage: DeepSeekUsage | null;
};

export class DeepSeekError extends Error {
    constructor(message: string, readonly stage: "config" | "http" | "empty") {
        super(message);
        this.name = "DeepSeekError";
    }
}

const SYSTEM_PROMPT = `You convert a receipt or invoice into a single JSON object.
Text may be English or Indonesian, and may be imperfect.
Return JSON only — no markdown fences, no commentary.
Use null for any field that is missing or unreadable. Never invent merchants, dates, or amounts.
If the input is not a receipt or invoice, set refusal to "not_a_receipt" and every other field to null.
If it cannot be read at all, set refusal to "unreadable" and every other field to null.
Otherwise set refusal to null.`;

type Content =
    | string
    | (
          | { type: "text"; text: string }
          | { type: "image_url"; image_url: { url: string } }
      )[];

async function postChat(content: Content): Promise<DeepSeekResult> {
    if (!DEEPSEEK_TOKEN) {
        throw new DeepSeekError("DEEPSEEK_API_KEY is missing", "config");
    }

    const res = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${DEEPSEEK_TOKEN}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: DEEPSEEK_MODEL,
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content },
            ],
            response_format: { type: "json_object" },
            // Thinking is disabled: deepseek-flash otherwise spends the whole
            // max_tokens budget on reasoning and returns empty (finish=length).
            thinking: { type: "disabled" },
            max_tokens: DEEPSEEK_MAX_TOKENS,
        }),
        signal: AbortSignal.timeout(DEEPSEEK_TIMEOUT_MS),
        cache: "no-store",
    });

    if (!res.ok) {
        const detail = (await res.text()).slice(0, 300);
        throw new DeepSeekError(`HTTP ${res.status}: ${detail}`, "http");
    }

    const json = (await res.json()) as {
        choices?: { message?: { content?: string | null }; finish_reason?: string }[];
        usage?: DeepSeekUsage;
    };
    const choice = json.choices?.[0];
    const text = choice?.message?.content;
    if (!text) {
        throw new DeepSeekError(
            `empty completion (finish=${choice?.finish_reason ?? "?"})`,
            "empty"
        );
    }

    return { text, finish: choice?.finish_reason ?? null, usage: json.usage ?? null };
}

/** Attempt 1b: structure compacted OCR text. DeepSeek never receives the image. */
export function structureReceipt(markdown: string): Promise<DeepSeekResult> {
    return postChat(`${RECEIPT_SCHEMA_HINT}\n\nOCR TEXT:\n${markdown}`);
}

/** Attempt 2: DeepSeek Flash reads the image directly (vision -> JSON). */
export function extractWithDeepSeekVision(args: {
    mimeType: string;
    dataBase64: string;
}): Promise<DeepSeekResult> {
    return postChat([
        { type: "text", text: RECEIPT_SCHEMA_HINT },
        {
            type: "image_url",
            image_url: {
                url: `data:${args.mimeType};base64,${args.dataBase64}`,
            },
        },
    ]);
}
