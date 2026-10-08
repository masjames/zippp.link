import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { runExtraction } from "@/lib/extract-pipeline";
import { PADDLEOCR_MODEL } from "@/lib/config";
import { runPaddleOcr, type PaddleOcrResult } from "@/lib/paddleocr";
import type { Receipt } from "@/types/receipt";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Admin-only eval endpoint. Runs one image through several model configs and
 * returns the raw results (the client scores them). OCR is done once per
 * (image, OCR model) and reused across structuring configs, which is the main
 * cost saving: the same OCR pass feeds flash, pro and Gemini comparisons.
 *
 * The operator runs this deliberately; it spends model credits.
 */

type EvalConfig = {
    id: string;
    provider?: "paddle" | "gemini";
    ocrModel?: string;
    deepseekModel?: string;
    geminiModel?: string;
};

type Exercise = {
    /** Override the hedge delay. 0 disables the hedge (default for comparisons). */
    hedgeMs?: number;
    /** Force the OCR-aware vision retry so the path can be observed. */
    forceVisionRetry?: boolean;
};

const OCR_CACHE = new Map<string, { at: number; result: PaddleOcrResult }>();
const OCR_TTL_MS = 10 * 60 * 1000;

function emptyOcr(): PaddleOcrResult {
    return {
        markdown: "",
        blocks: [],
        tokens: [],
        scores: [],
        pages: 0,
        jobId: "",
        states: [],
        submitMs: 0,
        pollMs: 0,
        resultMs: 0,
    };
}

function parseJsonField<T>(value: FormDataEntryValue | null, fallback: T): T {
    if (typeof value !== "string" || !value.trim()) return fallback;
    try {
        return JSON.parse(value) as T;
    } catch {
        return fallback;
    }
}

export async function POST(req: Request) {
    const user = await currentUser();
    if (!user.admin) {
        return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
    }

    let file: File;
    let configs: EvalConfig[];
    let exercise: Exercise;
    try {
        const form = await req.formData();
        const image = form.get("image");
        if (!(image instanceof File) || image.size === 0) {
            return NextResponse.json({ ok: false, error: "No image." }, { status: 400 });
        }
        file = image;
        configs = parseJsonField<EvalConfig[]>(form.get("configs"), []);
        exercise = parseJsonField<Exercise>(form.get("exercise"), {});
    } catch {
        return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
    }

    if (configs.length === 0) {
        return NextResponse.json({ ok: false, error: "No configs." }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const hash = createHash("sha256").update(bytes).digest("hex").slice(0, 32);
    const hedgeMs = exercise.hedgeMs ?? 0;

    // One OCR pass per distinct OCR model, cached in process memory.
    const ocrByModel = new Map<string, PaddleOcrResult | null>();
    for (const config of configs) {
        const ocrModel = config.ocrModel || PADDLEOCR_MODEL;
        if (ocrByModel.has(ocrModel)) continue;
        const key = `${hash}:${ocrModel}`;
        const cached = OCR_CACHE.get(key);
        if (cached && Date.now() - cached.at < OCR_TTL_MS) {
            ocrByModel.set(ocrModel, cached.result);
            continue;
        }
        try {
            const result = await runPaddleOcr(file, { model: ocrModel });
            OCR_CACHE.set(key, { at: Date.now(), result });
            ocrByModel.set(ocrModel, result);
        } catch {
            ocrByModel.set(ocrModel, null);
        }
    }

    const results = [];
    for (const config of configs) {
        const ocrModel = config.ocrModel || PADDLEOCR_MODEL;
        const ocr = ocrByModel.get(ocrModel) ?? null;
        const started = Date.now();
        try {
            const result = await runExtraction(file, {
                provider: config.provider,
                ocrModel,
                deepseekModel: config.deepseekModel,
                geminiModel: config.geminiModel,
                hedgeMs,
                // Reuse the OCR pass; an empty result forces the vision fallback
                // instead of paying for the same failing OCR call again.
                precomputedOcr: ocr ?? emptyOcr(),
                forceVisionRetry: exercise.forceVisionRetry,
            });
            results.push({
                configId: config.id,
                ocrModel,
                deepseekModel: config.deepseekModel ?? null,
                geminiModel: config.geminiModel ?? null,
                provider: config.provider ?? "paddle",
                ocrCached: ocr !== null,
                ok: result.ok,
                error: result.ok ? null : result.error,
                receipt: result.ok ? (result.receipt as Receipt) : null,
                debug: result.debug,
                model_ms: result.model_ms,
                wallMs: Date.now() - started,
            });
        } catch (err) {
            results.push({
                configId: config.id,
                ocrModel,
                deepseekModel: config.deepseekModel ?? null,
                geminiModel: config.geminiModel ?? null,
                provider: config.provider ?? "paddle",
                ocrCached: ocr !== null,
                ok: false,
                error: err instanceof Error ? err.message : "extraction failed",
                receipt: null,
                debug: null,
                model_ms: 0,
                wallMs: Date.now() - started,
            });
        }
    }

    return NextResponse.json({ ok: true, results });
}
