import { Type } from "@google/genai";

export const EXTRACT_PROMPT = `Extract data from this photo of a receipt or invoice.
Language may be English or Indonesian.
Return JSON only, matching the schema.
If a field is missing or unreadable, use null. Do not invent values, merchants, dates, or amounts.
If this is not a receipt or invoice, set refusal to "not_a_receipt" and all other fields to null.
If the photo cannot be read, set refusal to "unreadable" and all other fields to null.
Otherwise set refusal to null.`;

/** Instructions shared by the text and vision structuring prompts. */
export const SOURCE_INSTRUCTIONS = `The OCR text, when provided, is a list of rows prefixed with their zero-based index in square brackets, for example:
[12] Kaos | 2 | 50.000 | 100.000
For every field you fill, set its "_source" to the index of the row you read it from. If you did not read it from a row, use null.
Never guess: if a value is not clearly in the text, use null.`;

/**
 * Schema as text, for providers without responseSchema (DeepSeek). Kept in
 * sync with RECEIPT_JSON_SCHEMA below.
 */
export const RECEIPT_SCHEMA_HINT = `Return a single JSON object of exactly this shape and no other text:
{
  "refusal": "not_a_receipt" | "unreadable" | null,
  "merchant": string | null,
  "merchant_source": number | null,
  "date": "YYYY-MM-DD" | null,
  "date_source": number | null,
  "currency": string | null,
  "line_items": [
    {
      "description": string | null,
      "qty": number | null,
      "unit_price": number | null,
      "amount": number | null,
      "source": number | null
    }
  ],
  "subtotal": number | null,
  "subtotal_source": number | null,
  "tax": number | null,
  "tax_source": number | null,
  "total": number | null,
  "total_source": number | null
}
${SOURCE_INSTRUCTIONS}
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
    merchant_source: { type: Type.NUMBER, nullable: true },
    date: { type: Type.STRING, nullable: true },
    date_source: { type: Type.NUMBER, nullable: true },
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
          source: { type: Type.NUMBER, nullable: true },
        },
        required: ["description", "qty", "unit_price", "amount", "source"],
      },
    },
    subtotal: { type: Type.NUMBER, nullable: true },
    subtotal_source: { type: Type.NUMBER, nullable: true },
    tax: { type: Type.NUMBER, nullable: true },
    tax_source: { type: Type.NUMBER, nullable: true },
    total: { type: Type.NUMBER, nullable: true },
    total_source: { type: Type.NUMBER, nullable: true },
  },
  required: [
    "refusal",
    "merchant",
    "merchant_source",
    "date",
    "date_source",
    "currency",
    "line_items",
    "subtotal",
    "subtotal_source",
    "tax",
    "tax_source",
    "total",
    "total_source",
  ],
};
