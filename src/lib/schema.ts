import { Type } from "@google/genai";

export const EXTRACT_PROMPT = `Extract data from this photo of a receipt or invoice.
Language may be English or Indonesian.
Return JSON only, matching the schema.
If a field is missing or unreadable, use null. Do not invent values, merchants, dates, or amounts.
If this is not a receipt or invoice, set refusal to "not_a_receipt" and all other fields to null.
If the photo cannot be read, set refusal to "unreadable" and all other fields to null.
Otherwise set refusal to null.`;

/**
 * Schema as text, for providers without responseSchema (DeepSeek). Kept in
 * sync with RECEIPT_JSON_SCHEMA below.
 */
export const RECEIPT_SCHEMA_HINT = `Return a single JSON object of exactly this shape and no other text:
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

export const RECEIPT_JSON_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    refusal: {
      type: Type.STRING,
      nullable: true,
      enum: ["not_a_receipt", "unreadable", null],
    },
    merchant: { type: Type.STRING, nullable: true },
    date: { type: Type.STRING, nullable: true },
    currency: { type: Type.STRING, nullable: true },
    line_items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          description: { type: Type.STRING, nullable: true },
          qty: { type: Type.NUMBER, nullable: true },
          unit_price: { type: Type.NUMBER, nullable: true },
          amount: { type: Type.NUMBER, nullable: true },
        },
        required: ["description", "qty", "unit_price", "amount"],
      },
    },
    subtotal: { type: Type.NUMBER, nullable: true },
    tax: { type: Type.NUMBER, nullable: true },
    total: { type: Type.NUMBER, nullable: true },
  },
  required: [
    "refusal",
    "merchant",
    "date",
    "currency",
    "line_items",
    "subtotal",
    "tax",
    "total",
  ],
};
