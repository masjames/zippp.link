import { randomUUID } from "node:crypto";
import {
    DEEPSEEK_MODEL,
    EXTRACT_PROVIDER,
    GEMINI_MODEL,
    OCR_FORMAT,
    PADDLEOCR_MODEL,
} from "./config";
import { DeepSeekError, structureReceipt } from "./deepseek";
import { extractWithGemini } from "./gemini";
import { stripJsonFences } from "./json";
import { compactOcrMarkdown } from "./ocr-compact";
import { PaddleOcrError, runPaddleOcr } from "./paddleocr";
import type { ExtractDebug, ExtractStage, LineItem, Receipt } from "@/types/receipt";

type ModelOutput = Receipt & {
    refusal?: "not_a_receipt" | "unreadable" | null;
};

export type ExtractionResult =
    | { ok: true; receipt: Receipt; model_ms: number; debug: ExtractDebug }
    | {
          ok: false;
          error: string;
          refusal: "unreadable" | "not_a_receipt" | null;
          model_ms: number;
          debug: ExtractDebug;
      };

const MAX_PREVIEW = 800;
const MAX_MODEL_RAW = 4000;

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

function errText(err: unknown): string {
    if (err instanceof PaddleOcrError) return `[ocr.${err.stage}] ${err.message}`;
    if (err instanceof DeepSeekError) return `[deepseek.${err.stage}] ${err.message}`;
    if (err instanceof Error) {
        const cause = (err as { cause?: unknown }).cause;
        const causeText =
            cause instanceof Error
                ? ` (${cause.message})`
                : cause
                  ? ` (${String(cause)})`
                  : "";
        return `${err.message}${causeText}`;
    }
    return String(err);
}

/**
 * The full extraction run: PaddleOCR-VL reads the image, DeepSeek structures
 * the markdown, and Gemini is the fallback if either primary stage fails.
 * Every stage is recorded for the always-on debug console.
 */
export async function runExtraction(image: File): Promise<ExtractionResult> {
    const runId = randomUUID();
    const started = Date.now();
    const stages: ExtractStage[] = [];

    let provider = EXTRACT_PROVIDER;
    let fallback: string | null = null;
    let ocrChars = 0;
    let markdownPreview: string | undefined;
    let model: string | null = null;
    let finish: string | null = null;
    let usage: ExtractDebug["usage"] = null;
    let modelRaw: string | undefined;
    let modelMs = 0;

    async function viaPaddle(): Promise<ModelOutput> {
        const ocrStart = Date.now();
        let ocr;
        try {
            ocr = await runPaddleOcr(image);
        } catch (err) {
            stages.push({
                stage: "ocr",
                ok: false,
                ms: Date.now() - ocrStart,
                note: errText(err),
            });
            throw err;
        }
        const rawLen = ocr.markdown.length;
        const compact = compactOcrMarkdown(ocr.markdown);
        ocrChars = compact.length;
        markdownPreview = compact.slice(0, MAX_PREVIEW);
        modelMs += Date.now() - ocrStart;
        stages.push({
            stage: "ocr",
            ok: true,
            ms: Date.now() - ocrStart,
            note: `${PADDLEOCR_MODEL} · ${ocr.pages}p · ${rawLen}->${compact.length} chars · ${ocr.states.join(">")}`,
        });
        if (!compact.trim()) {
            const err = new PaddleOcrError("OCR returned no text", "result");
            stages.push({ stage: "ocr", ok: false, ms: 0, note: errText(err) });
            throw err;
        }

        const structureStart = Date.now();
        let out;
        try {
            out = await structureReceipt(compact);
        } catch (err) {
            stages.push({
                stage: "structure",
                ok: false,
                ms: Date.now() - structureStart,
                note: errText(err),
            });
            throw err;
        }
        modelMs += Date.now() - structureStart;
        model = DEEPSEEK_MODEL;
        finish = out.finish;
        usage = out.usage;
        modelRaw = out.text.slice(0, MAX_MODEL_RAW);
        stages.push({
            stage: "structure",
            ok: true,
            ms: Date.now() - structureStart,
            note: `${DEEPSEEK_MODEL} · ${out.finish ?? "?"} · ${out.usage?.total_tokens ?? "?"} tok`,
        });

        const parseStart = Date.now();
        try {
            const parsed = JSON.parse(stripJsonFences(out.text)) as ModelOutput;
            stages.push({ stage: "parse", ok: true, ms: Date.now() - parseStart });
            return parsed;
        } catch (err) {
            stages.push({
                stage: "parse",
                ok: false,
                ms: Date.now() - parseStart,
                note: err instanceof Error ? err.message : "invalid JSON",
            });
            throw new Error("DeepSeek returned invalid JSON");
        }
    }

    async function viaGemini(reason: string): Promise<ModelOutput> {
        fallback = "gemini";
        stages.push({
            stage: "fallback",
            ok: true,
            ms: 0,
            note: `paddle -> gemini (${reason})`,
        });

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error("GEMINI_API_KEY is missing; no fallback available");
        }

        const bytes = Buffer.from(await image.arrayBuffer());
        const start = Date.now();
        const text = await extractWithGemini({
            apiKey,
            mimeType: image.type || "image/jpeg",
            dataBase64: bytes.toString("base64"),
        });
        modelMs += Date.now() - start;
        model = GEMINI_MODEL;
        modelRaw = text.slice(0, MAX_MODEL_RAW);
        stages.push({ stage: "gemini", ok: true, ms: Date.now() - start });

        const parsed = JSON.parse(text) as ModelOutput;
        stages.push({ stage: "parse", ok: true, ms: 0, note: "gemini" });
        return parsed;
    }

    function buildDebug(): ExtractDebug {
        return {
            runId,
            provider,
            fallback,
            ocrFormat: OCR_FORMAT,
            ocrChars,
            model,
            finish,
            usage,
            stages,
            markdownPreview,
            modelRaw,
        };
    }

    function logRun(ok: boolean, error?: string) {
        console.log(
            JSON.stringify({
                event: "extract.run",
                runId,
                ok,
                provider,
                fallback,
                ocrFormat: OCR_FORMAT,
                ocrChars,
                model,
                finish,
                usage,
                total_ms: Date.now() - started,
                stages,
                error,
            })
        );
    }

    let raw: ModelOutput;
    if (provider === "gemini") {
        try {
            raw = await viaGemini("EXTRACT_PROVIDER=gemini");
        } catch (err) {
            const debug = buildDebug();
            logRun(false, errText(err));
            return {
                ok: false,
                error: `Extraction failed: ${errText(err)}`,
                refusal: null,
                model_ms: modelMs,
                debug,
            };
        }
    } else {
        try {
            raw = await viaPaddle();
        } catch (primaryErr) {
            const reason = errText(primaryErr);
            try {
                raw = await viaGemini(reason);
            } catch (fallbackErr) {
                const debug = buildDebug();
                const message = `PaddleOCR+DeepSeek failed (${reason}); Gemini fallback also failed (${errText(fallbackErr)})`;
                logRun(false, message);
                return {
                    ok: false,
                    error: message,
                    refusal: null,
                    model_ms: modelMs,
                    debug,
                };
            }
        }
    }

    const debug = buildDebug();

    if (raw.refusal === "unreadable") {
        logRun(false, "refusal:unreadable");
        return {
            ok: false,
            error: "Could not read this photo. Try a clearer shot.",
            refusal: "unreadable",
            model_ms: modelMs,
            debug,
        };
    }
    if (raw.refusal === "not_a_receipt") {
        logRun(false, "refusal:not_a_receipt");
        return {
            ok: false,
            error: "Not a receipt or invoice.",
            refusal: "not_a_receipt",
            model_ms: modelMs,
            debug,
        };
    }

    const receipt = normalizeReceipt(raw);
    stages.push({
        stage: "normalize",
        ok: true,
        ms: 0,
        note: `${receipt.line_items.length} items`,
    });
    logRun(true);

    return { ok: true, receipt, model_ms: modelMs, debug };
}
