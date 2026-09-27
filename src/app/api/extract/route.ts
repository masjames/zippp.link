import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { GEMINI_MODEL } from "@/lib/config";
import { EXTRACT_PROMPT, RECEIPT_JSON_SCHEMA } from "@/lib/schema";
import type { ExtractResponse, LineItem, Receipt } from "@/types/receipt";

export const runtime = "nodejs";
export const maxDuration = 60;

type ModelOutput = Receipt & {
  refusal?: "not_a_receipt" | "unreadable" | null;
};

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function normalizeReceipt(raw: ModelOutput): Receipt {
  const items: LineItem[] = Array.isArray(raw.line_items)
    ? raw.line_items.map((item) => ({
        description: asString(item?.description),
        qty: asNumber(item?.qty),
        unit_price: asNumber(item?.unit_price),
        amount: asNumber(item?.amount),
      }))
    : [];

  return {
    merchant: asString(raw.merchant),
    date: asString(raw.date),
    currency: asString(raw.currency),
    line_items: items,
    subtotal: asNumber(raw.subtotal),
    tax: asNumber(raw.tax),
    total: asNumber(raw.total),
  };
}

export async function POST(req: Request) {
  const handlerStart = performance.now();
  let model_ms: number | null = null;

  function respond(body: ExtractResponse, status: number) {
    const handler_ms = Math.round(performance.now() - handlerStart);
    console.log({ model_ms, handler_ms });
    if (body.ok) {
      body.timings.server_ms = handler_ms;
    }
    return NextResponse.json(body, { status });
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    const body: ExtractResponse = {
      ok: false,
      error: "GEMINI_API_KEY is missing. Put it in .env.local.",
    };
    return respond(body, 500);
  }

  let image: File;
  try {
    const form = await req.formData();
    const file = form.get("image");
    if (!(file instanceof File) || file.size === 0) {
      const body: ExtractResponse = { ok: false, error: "No image." };
      return respond(body, 400);
    }
    image = file;
  } catch {
    const body: ExtractResponse = { ok: false, error: "No image." };
    return respond(body, 400);
  }

  const bytes = Buffer.from(await image.arrayBuffer());
  const mimeType = image.type || "image/jpeg";
  const ai = new GoogleGenAI({ apiKey: key });

  try {
    const modelStart = performance.now();
    let response;
    try {
      response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [
          {
            role: "user",
            parts: [
              { text: EXTRACT_PROMPT },
              { inlineData: { mimeType, data: bytes.toString("base64") } },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: RECEIPT_JSON_SCHEMA,
          thinkingConfig: { thinkingBudget: 0 },
        },
      });
    } finally {
      model_ms = Math.round(performance.now() - modelStart);
      console.log({ model_ms });
    }

    if (!response) {
      const body: ExtractResponse = { ok: false, error: "Extract failed." };
      return respond(body, 502);
    }

    const text = response.text;
    if (!text) {
      const body: ExtractResponse = {
        ok: false,
        error: "Empty model response.",
      };
      return respond(body, 502);
    }

    const parsed = JSON.parse(text) as ModelOutput;
    if (parsed.refusal === "unreadable") {
      const body: ExtractResponse = {
        ok: false,
        error: "Could not read this photo. Try a clearer shot.",
      };
      return respond(body, 422);
    }
    if (parsed.refusal === "not_a_receipt") {
      const body: ExtractResponse = {
        ok: false,
        error: "Not a receipt or invoice.",
      };
      return respond(body, 422);
    }

    const body: ExtractResponse = {
      ok: true,
      receipt: normalizeReceipt(parsed),
      timings: { model_ms: model_ms ?? 0, server_ms: 0 },
    };
    return respond(body, 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Extract failed.";
    const body: ExtractResponse = { ok: false, error: message };
    return respond(body, 502);
  }
}
