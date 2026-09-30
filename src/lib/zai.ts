import { ZAI_MAX_TOKENS } from "@/lib/config";
import { EXTRACT_PROMPT } from "@/lib/schema";

type ZaiArgs = {
  baseUrl: string;
  apiKey: string;
  model: string;
  mimeType: string;
  data: string;
};

/**
 * Zhipu's endpoint is OpenAI-compatible but has no responseSchema, so the
 * shape has to travel in the prompt. Kept byte-for-byte compatible with
 * RECEIPT_JSON_SCHEMA in ./schema.ts.
 */
const SCHEMA_HINT = `Return a single JSON object of exactly this shape and no other text:
{
  "refusal": "not_a_receipt" | "unreadable" | null,
  "merchant": string | null,
  "date": "YYYY-MM-DD" | null,
  "currency": string | null,
  "line_items": [
    { "description": string | null, "qty": number | null, "unit_price": number | null, "amount": number | null }
  ],
  "subtotal": number | null,
  "tax": number | null,
  "total": number | null
}
No markdown fences, no commentary.`;

/** Models sometimes fence JSON anyway; strip it before JSON.parse. */
export function stripJsonFences(text: string): string {
  const trimmed = text.trim();
  if (!trimmed.startsWith("```")) return trimmed;
  return trimmed
    .replace(/^```[a-zA-Z]*\s*/, "")
    .replace(/\s*```$/, "")
    .trim();
}

/**
 * One image -> the JSON string the route handler already knows how to parse.
 * `thinking` is disabled on purpose: with it on, ~60-75% of completion tokens
 * go to reasoning and max_tokens can be exhausted before any content is emit.
 */
export async function extractWithZai(args: ZaiArgs): Promise<string> {
  const payload = {
    model: args.model,
    max_tokens: ZAI_MAX_TOKENS,
    thinking: { type: "disabled" },
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: `${EXTRACT_PROMPT}\n\n${SCHEMA_HINT}` },
          {
            type: "image_url",
            image_url: { url: `data:${args.mimeType};base64,${args.data}` },
          },
        ],
      },
    ],
  };

  const res = await fetch(`${args.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!res.ok) {
    const detail = (await res.text()).slice(0, 300);
    throw new Error(`z.ai HTTP ${res.status}: ${detail}`);
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const content = json.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("z.ai returned an empty completion.");
  }
  return stripJsonFences(content);
}
