import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { runExtraction } from "@/lib/extract-pipeline";
import { PADDLEOCR_MODEL } from "@/lib/config";
import { runPaddleOcr, type PaddleOcrResult } from "@/lib/paddleocr";
import {
    EXTRACT_METHOD_IDS,
    isExtractMethodId,
    methodNeedsOcr,
    type ExtractMethodId,
} from "@/lib/admin/methods";
import type { Receipt } from "@/types/receipt";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Admin-only eval endpoint.
 *
 * action "extract" (default): run the requested methods on one image. OCR is
 * computed once per (image, OCR model) and reused by the OCR-based methods, and
 * cached in process memory for a short time.
 *
 * action "ocr": run just PaddleOCR and return the raw result or the exact error,
 * so a failure can be diagnosed instead of hidden behind a fallback.
 *
 * The operator runs this deliberately; it spends model credits.
 */

type Exercise = {
    ocrModel?: string;
    deepseekModel?: string;
    geminiModel?: string;
    hedgeMs?: number;
    forceVisionRetry?: boolean;
};

const OCR_CACHE = new Map<string, { at: number; result: PaddleOcrResult }>();
const OCR_TTL_MS = 10 * 60 * 1000;
/**
 * The eval wants the true OCR result, not a fast fallback, so it gets a longer
 * budget than production (PADDLEOCR_TIMEOUT_MS). A slow Baidu cold start was
 * making the OCR methods silently fall back to vision.
 */
const EVAL_OCR_TIMEOUT_MS = 30_000;

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

function errorText(err: unknown): string {
    return err instanceof Error ? err.message : "failed";
}

export async function POST(req: Request) {
    const user = await currentUser();
    if (!user.admin) {
        return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
    }

    let file: File;
    let action: string;
    let requestedMethods: string[];
    let exercise: Exercise;
    try {
        const form = await req.formData();
        const image = form.get("image");
        if (!(image instanceof File) || image.size === 0) {
            return NextResponse.json({ ok: false, error: "No image." }, { status: 400 });
        }
        file = image;
        action = typeof form.get("action") === "string" ? String(form.get("action")) : "extract";
        requestedMethods = parseJsonField<string[]>(form.get("methods"), []);
        exercise = parseJsonField<Exercise>(form.get("exercise"), {});
    } catch {
        return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
    }

    const ocrModel = exercise.ocrModel || PADDLEOCR_MODEL;
    const bytes = Buffer.from(await file.arrayBuffer());
    const hash = createHash("sha256").update(bytes).digest("hex").slice(0, 32);

    if (action === "ocr") {
        try {
            const result = await runPaddleOcr(file, {
                model: ocrModel,
                timeoutMs: EVAL_OCR_TIMEOUT_MS,
            });
            return NextResponse.json({
                ok: true,
                ocrModel,
                pages: result.pages,
                chars: result.markdown.length,
                states: result.states,
                tokens: result.tokens.slice(0, 80),
                markdownPreview: result.markdown.slice(0, 2000),
                scores: (result.scores ?? []).slice(0, 80),
            });
        } catch (err) {
            return NextResponse.json({
                ok: false,
                ocrModel,
                error: errorText(err),
            });
        }
    }

    const methods: ExtractMethodId[] = (
        requestedMethods.length > 0 ? requestedMethods : EXTRACT_METHOD_IDS
    ).filter(isExtractMethodId);
    if (methods.length === 0) {
        return NextResponse.json({ ok: false, error: "No methods." }, { status: 400 });
    }

    let ocr: PaddleOcrResult | null = null;
    let ocrError: string | null = null;
    if (methods.some((m) => methodNeedsOcr(m))) {
        const key = `${hash}:${ocrModel}`;
        const cached = OCR_CACHE.get(key);
        if (cached && Date.now() - cached.at < OCR_TTL_MS) {
            ocr = cached.result;
        } else {
            try {
                ocr = await runPaddleOcr(file, {
                    model: ocrModel,
                    timeoutMs: EVAL_OCR_TIMEOUT_MS,
                });
                OCR_CACHE.set(key, { at: Date.now(), result: ocr });
            } catch (err) {
                ocrError = errorText(err);
            }
        }
    }

    const results = [];
    for (const method of methods) {
        const started = Date.now();
        try {
            const result = await runExtraction(file, {
                method,
                ocrModel,
                deepseekModel: exercise.deepseekModel,
                geminiModel: exercise.geminiModel,
                precomputedOcr: methodNeedsOcr(method)
                    ? (ocr ?? emptyOcr())
                    : undefined,
                hedgeMs: 0,
                forceVisionRetry: false,
            });
            results.push({
                method,
                ocrModel,
                ok: result.ok,
                error: result.ok ? null : result.error,
                receipt: result.ok ? (result.receipt as Receipt) : null,
                debug: result.debug,
                model_ms: result.model_ms,
                wallMs: Date.now() - started,
                ocrError,
            });
        } catch (err) {
            results.push({
                method,
                ocrModel,
                ok: false,
                error: errorText(err),
                receipt: null,
                debug: null,
                model_ms: 0,
                wallMs: Date.now() - started,
                ocrError,
            });
        }
    }

    return NextResponse.json({ ok: true, results, ocrError });
}
