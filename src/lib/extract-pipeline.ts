import { randomUUID } from "node:crypto";
import {
    DEEPSEEK_MODEL,
    EXTRACT_PROVIDER,
    GEMINI_MODEL,
    GEMINI_TIMEOUT_MS,
    OCR_FORMAT,
    PADDLEOCR_MODEL,
} from "./config";
import {
    DeepSeekError,
    extractWithDeepSeekVision,
    structureReceipt,
} from "./deepseek";
import { extractWithGemini } from "./gemini";
import { stripJsonFences } from "./json";
import { compactOcrMarkdown } from "./ocr-compact";
import { PaddleOcrError, runPaddleOcr } from "./paddleocr";
import type { ExtractDebug, ExtractStage, LineItem, Receipt } from "@/types/receipt";

type ModelOutput = Receipt & {
    refusal?: "not_a_receipt" | "unreadable" | null;
};

type AttemptName = "paddle" | "gemini" | "deepseek-vision";

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

/** Reject if a promise does not settle within `ms`. */
async function withTimeout<T>(
    promise: Promise<T>,
    ms: number,
    label: string
): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(
            () => reject(new Error(`${label} timed out after ${ms}ms`)),
            ms
        );
    });
    try {
        return await Promise.race([promise, timeout]);
    } finally {
        if (timer) clearTimeout(timer);
    }
}

/**
 * One extraction run.
 *
 * Attempt 1: PaddleOCR (vision) -> reconstructed rows -> DeepSeek Flash.
 * Attempt 2: DeepSeek Flash vision (image -> JSON). Cheap/fast, absorbs OCR
 *            timeouts without touching the rate-limited Gemini quota.
 * Attempt 3: Gemini (vision -> JSON). Last resort.
 *
 * Every stage is recorded for the debug trace.
 */
export async function runExtraction(image: File): Promise<ExtractionResult> {
    const runId = randomUUID();
    const started = Date.now();
    const stages: ExtractStage[] = [];

    let fallback: string | null = null;
    let ocrChars = 0;
    let ocrTokens: string[] | undefined;
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
        ocrTokens = ocr.tokens.slice(0, 250);
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
        return parseJson(out.text, "structure");
    }

    async function viaGemini(reason: string): Promise<ModelOutput> {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error("GEMINI_API_KEY is missing");

        const bytes = Buffer.from(await image.arrayBuffer());
        const start = Date.now();
        const text = await withTimeout(
            extractWithGemini({
                apiKey,
                mimeType: image.type || "image/jpeg",
                dataBase64: bytes.toString("base64"),
            }),
            GEMINI_TIMEOUT_MS,
            "gemini"
        );
        modelMs += Date.now() - start;
        model = GEMINI_MODEL;
        modelRaw = text.slice(0, MAX_MODEL_RAW);
        fallback = "gemini";
        stages.push({
            stage: "gemini",
            ok: true,
            ms: Date.now() - start,
            note: `fallback (${reason})`,
        });
        return parseJson(text, "gemini");
    }

    async function viaDeepSeekVision(reason: string): Promise<ModelOutput> {
        const bytes = Buffer.from(await image.arrayBuffer());
        const start = Date.now();
        const out = await extractWithDeepSeekVision({
            mimeType: image.type || "image/jpeg",
            dataBase64: bytes.toString("base64"),
        });
        modelMs += Date.now() - start;
        model = DEEPSEEK_MODEL;
        finish = out.finish;
        usage = out.usage;
        modelRaw = out.text.slice(0, MAX_MODEL_RAW);
        fallback = "deepseek-vision";
        stages.push({
            stage: "deepseek-vision",
            ok: true,
            ms: Date.now() - start,
            note: `fallback (${reason}) · ${out.finish ?? "?"} · ${out.usage?.total_tokens ?? "?"} tok`,
        });
        return parseJson(out.text, "deepseek-vision");
    }

    function parseJson(text: string, label: string): ModelOutput {
        const parseStart = Date.now();
        try {
            const parsed = JSON.parse(stripJsonFences(text)) as ModelOutput;
            stages.push({ stage: "parse", ok: true, ms: Date.now() - parseStart, note: label });
            return parsed;
        } catch (err) {
            stages.push({
                stage: "parse",
                ok: false,
                ms: Date.now() - parseStart,
                note: `${label}: ${err instanceof Error ? err.message : "invalid JSON"}`,
            });
            throw new Error(`${label} returned invalid JSON`);
        }
    }

    function buildDebug(): ExtractDebug {
        return {
            runId,
            provider: EXTRACT_PROVIDER,
            fallback,
            ocrFormat: OCR_FORMAT,
            ocrChars,
            model,
            finish,
            usage,
            stages,
            ocrTokens,
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
                provider: EXTRACT_PROVIDER,
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

    const order: AttemptName[] =
        EXTRACT_PROVIDER === "gemini"
            ? ["gemini", "deepseek-vision"]
            : ["paddle", "deepseek-vision", "gemini"];

    const failures: string[] = [];
    let raw: ModelOutput | null = null;

    for (const attempt of order) {
        const attemptStart = Date.now();
        try {
            if (attempt === "paddle") raw = await viaPaddle();
            else if (attempt === "gemini") raw = await viaGemini(failures.join(" | ") || "primary failed");
            else raw = await viaDeepSeekVision(failures.join(" | ") || "primary failed");
            break;
        } catch (err) {
            const note = errText(err);
            failures.push(`${attempt}: ${note}`);
            // paddle's own sub-stages already record its failure.
            if (attempt !== "paddle") {
                stages.push({ stage: attempt, ok: false, ms: Date.now() - attemptStart, note });
            }
        }
    }

    if (!raw) {
        const debug = buildDebug();
        const message = failures.join("; ");
        logRun(false, message);
        return { ok: false, error: `Extraction failed — ${message}`, refusal: null, model_ms: modelMs, debug };
    }

    if (raw.refusal === "unreadable") {
        logRun(false, "refusal:unreadable");
        return {
            ok: false,
            error: "Could not read this photo. Try a clearer shot.",
            refusal: "unreadable",
            model_ms: modelMs,
            debug: buildDebug(),
        };
    }
    if (raw.refusal === "not_a_receipt") {
        logRun(false, "refusal:not_a_receipt");
        return {
            ok: false,
            error: "Not a receipt or invoice.",
            refusal: "not_a_receipt",
            model_ms: modelMs,
            debug: buildDebug(),
        };
    }

    const receipt = normalizeReceipt(raw);
    stages.push({
        stage: "normalize",
        ok: true,
        ms: 0,
        note: `${receipt.line_items.length} items`,
    });
    const debug = buildDebug();
    logRun(true);

    return { ok: true, receipt, model_ms: modelMs, debug };
}
