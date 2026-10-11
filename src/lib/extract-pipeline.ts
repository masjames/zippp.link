import { randomUUID } from "node:crypto";
import {
    DEEPSEEK_MODEL,
    EXTRACT_PROVIDER,
    GEMINI_MODEL,
    GEMINI_TIMEOUT_MS,
    OCR_FORMAT,
    PADDLEOCR_HEDGE_MS,
    PADDLEOCR_MODEL,
    type ExtractProvider,
} from "./config";
import {
    DeepSeekError,
    extractWithDeepSeekVision,
    structureReceipt,
} from "./deepseek";
import { extractWithGemini, structureWithGemini } from "./gemini";
import type { ExtractMethodId } from "./admin/methods";
import { stripJsonFences } from "./json";
import { compactOcrMarkdown } from "./ocr-compact";
import { PaddleOcrError, runPaddleOcr, type PaddleOcrResult } from "./paddleocr";
import { verifyReceipt, type OcrGrounding, type VerifyResult } from "./verify-receipt";
import type {
    ExtractDebug,
    ExtractStage,
    LineItem,
    RawReceipt,
    Receipt,
} from "@/types/receipt";

type ModelOutput = RawReceipt;

type AttemptName = "paddle" | "paddle-gemini" | "gemini" | "deepseek-vision";

export type ExtractionResult =
    | { ok: true; receipt: Receipt; model_ms: number; debug: ExtractDebug }
    | {
          ok: false;
          error: string;
          refusal: "unreadable" | "not_a_receipt" | null;
          model_ms: number;
          debug: ExtractDebug;
      };

/**
 * Per-run overrides for the admin eval comparison. Production omits them, so
 * behaviour is unchanged. `precomputedOcr` reuses one OCR pass across several
 * structuring models; `forceVisionRetry` exercises the vision retry path.
 */
export type ExtractOptions = {
    provider?: ExtractProvider;
    ocrModel?: string;
    deepseekModel?: string;
    geminiModel?: string;
    hedgeMs?: number;
    precomputedOcr?: PaddleOcrResult;
    forceVisionRetry?: boolean;
    /** Run exactly one method: no fallback, no hedge, no vision retry. */
    method?: ExtractMethodId;
};

const MAX_PREVIEW = 800;
const MAX_MODEL_RAW = 4000;

/**
 * A usable receipt needs an item and a price. A missing date is not fatal: the
 * capture date is filled in client-side and marked as assumed.
 */
function hasEssentials(raw: {
    line_items?: LineItem[] | null;
    total?: number | null;
}): boolean {
    const items = Array.isArray(raw.line_items) ? raw.line_items : [];
    const hasItem = items.some(
        (i) =>
            (typeof i?.description === "string" && i.description.trim() !== "") ||
            (typeof i?.amount === "number" && Number.isFinite(i.amount))
    );
    const hasPrice =
        (typeof raw.total === "number" && Number.isFinite(raw.total)) ||
        items.some((i) => typeof i?.amount === "number" && Number.isFinite(i.amount));
    return hasItem && hasPrice;
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
 * Prefix every OCR row with its zero-based index, so the model can report the
 * row each field came from and the verifier can check it.
 */
function numberOcrRows(compact: string): { text: string; rows: string[] } {
    const rows = compact
        .split("\n")
        .map((row) => row.trim())
        .filter(Boolean);
    return { text: rows.map((row, i) => `[${i}] ${row}`).join("\n"), rows };
}

function verifyNote(result: VerifyResult): string {
    if (result.flags.length === 0) return "no flags";
    const reasons = Array.from(new Set(result.flags.map((f) => f.reason)));
    return `${result.flags.length} flag(s): ${reasons.join(", ")}`;
}

/**
 * One extraction run.
 *
 * Attempt 1: PaddleOCR (vision) -> numbered rows -> DeepSeek Flash.
 *            The result is verified against the OCR tokens. If it fails badly,
 *            one vision re-read with the OCR text is allowed, taken only when it
 *            passes verification cleanly (or is strictly better).
 * Attempt 2: DeepSeek Flash vision (image -> JSON), verified against any OCR
 *            text that was captured before the failure.
 * Attempt 3: Gemini (vision -> JSON). Last resort.
 *
 * Every stage is recorded for the debug trace.
 */
export async function runExtraction(
    image: File,
    options: ExtractOptions = {}
): Promise<ExtractionResult> {
    const provider = options.provider ?? EXTRACT_PROVIDER;
    const ocrModel = options.ocrModel ?? PADDLEOCR_MODEL;
    const deepseekModel = options.deepseekModel ?? DEEPSEEK_MODEL;
    const geminiModel = options.geminiModel ?? GEMINI_MODEL;
    const method = options.method;
    const hedgeMs = method ? 0 : (options.hedgeMs ?? PADDLEOCR_HEDGE_MS);
    const precomputedOcr = options.precomputedOcr;
    const forceVisionRetry = method ? false : options.forceVisionRetry === true;

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

    let grounding: OcrGrounding | null = null;
    let verified: VerifyResult | null = null;
    let hedgeFired = false;
    let hedgeWinner: "ocr" | "vision-hedge" | null = null;
    let ocrMs: number | null = null;

    // Hedged vision: if PaddleOCR is slow, the vision leg starts in parallel and
    // is verified against the OCR text once it arrives. The first result that
    // passes the verifier wins.
    let hedgePromise: Promise<{ raw: ModelOutput; result: VerifyResult } | null> | null =
        null;
    let resolveOcrGround: ((g: OcrGrounding | null) => void) | null = null;
    const ocrGroundReady = new Promise<OcrGrounding | null>((resolve) => {
        resolveOcrGround = resolve;
    });

    function pushVerifyStage(result: VerifyResult, note: string) {
        stages.push({
            stage: "verify",
            ok: result.flags.length === 0,
            ms: 0,
            note: `${note} · ${verifyNote(result)}`,
        });
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

    /** The hedged vision leg. Its verification waits for the OCR grounding. */
    async function runVisionHedge(): Promise<
        { raw: ModelOutput; result: VerifyResult } | null
    > {
        try {
            const bytes = Buffer.from(await image.arrayBuffer());
            const start = Date.now();
            const out = await extractWithDeepSeekVision({
                mimeType: image.type || "image/jpeg",
                dataBase64: bytes.toString("base64"),
                model: deepseekModel,
            });
            modelMs += Date.now() - start;
            model = deepseekModel;
            finish = out.finish;
            usage = out.usage;
            modelRaw = out.text.slice(0, MAX_MODEL_RAW);
            stages.push({
                stage: "hedge",
                ok: true,
                ms: Date.now() - start,
                note: `vision started after ${hedgeMs}ms`,
            });
            const parsed = parseJson(out.text, "deepseek-vision");
            if (parsed.refusal) return null;
            const ground = await ocrGroundReady;
            const result = verifyReceipt(parsed, ground ?? { tokens: [] });
            return { raw: parsed, result };
        } catch (err) {
            stages.push({ stage: "hedge", ok: false, ms: 0, note: errText(err) });
            return null;
        }
    }

    /** One vision re-read with the OCR text, used when verification fails badly. */
    async function visionRetry(
        numbered: string,
        g: OcrGrounding,
        previous: VerifyResult
    ): Promise<{ parsed: ModelOutput; result: VerifyResult } | null> {
        const bytes = Buffer.from(await image.arrayBuffer());
        const start = Date.now();
        const out = await extractWithDeepSeekVision({
            mimeType: image.type || "image/jpeg",
            dataBase64: bytes.toString("base64"),
            ocrText: numbered,
            model: deepseekModel,
        });
        modelMs += Date.now() - start;
        model = deepseekModel;
        finish = out.finish;
        usage = out.usage;
        modelRaw = out.text.slice(0, MAX_MODEL_RAW);
        fallback = "deepseek-vision-verify";
        stages.push({
            stage: "vision-retry",
            ok: true,
            ms: Date.now() - start,
            note: `${deepseekModel} · ${out.finish ?? "?"} · ${out.usage?.total_tokens ?? "?"} tok`,
        });
        const parsed = parseJson(out.text, "deepseek-vision");
        if (parsed.refusal) return null;
        const result = verifyReceipt(parsed, g);
        if (result.flags.length === 0 || result.severity < previous.severity) {
            pushVerifyStage(result, "vision-retry accepted");
            return { parsed, result };
        }
        stages.push({
            stage: "verify",
            ok: false,
            ms: 0,
            note: `vision-retry rejected · ${verifyNote(result)}`,
        });
        return null;
    }

    async function viaPaddle(
        kind: "deepseek" | "gemini" = "deepseek"
    ): Promise<ModelOutput> {
        const ocrStart = Date.now();
        const ocrPromise = precomputedOcr
            ? Promise.resolve(precomputedOcr)
            : runPaddleOcr(image, { model: ocrModel });
        const hedgeTimer =
            !method && hedgeMs > 0
                ? setTimeout(() => {
                      hedgeFired = true;
                      if (!hedgePromise) hedgePromise = runVisionHedge();
                  }, hedgeMs)
                : undefined;
        let ocr;
        try {
            ocr = await ocrPromise;
        } catch (err) {
            if (hedgeTimer) clearTimeout(hedgeTimer);
            resolveOcrGround?.(null);
            stages.push({
                stage: "ocr",
                ok: false,
                ms: Date.now() - ocrStart,
                note: errText(err),
            });
            throw err;
        }
        if (hedgeTimer) clearTimeout(hedgeTimer);
        const rawLen = ocr.markdown.length;
        const compact = compactOcrMarkdown(ocr.markdown);
        const { text: numbered, rows } = numberOcrRows(compact);
        ocrChars = compact.length;
        ocrTokens = ocr.tokens.slice(0, 250);
        markdownPreview = numbered.slice(0, MAX_PREVIEW);
        modelMs += Date.now() - ocrStart;
        ocrMs = Date.now() - ocrStart;
        stages.push({
            stage: "ocr",
            ok: true,
            ms: ocrMs,
            note: `${ocrModel} · ${ocr.pages}p · ${rawLen}->${compact.length} chars · ${ocr.states.join(">")}`,
        });
        if (!compact.trim()) {
            const err = new PaddleOcrError("OCR returned no text", "result");
            resolveOcrGround?.(null);
            stages.push({ stage: "ocr", ok: false, ms: 0, note: errText(err) });
            throw err;
        }
        grounding = { tokens: ocr.tokens, scores: ocr.scores, rows };
        resolveOcrGround?.(grounding);

        // If the hedge already passed cleanly, take it before structuring.
        if (!method && hedgePromise) {
            const leg = await hedgePromise;
            if (
                leg &&
                leg.result.flags.length === 0 &&
                hasEssentials(leg.result.receipt)
            ) {
                verified = leg.result;
                hedgeWinner = "vision-hedge";
                fallback = "deepseek-vision-hedge";
                stages.push({
                    stage: "hedge",
                    ok: true,
                    ms: 0,
                    note: "hedge accepted (clean)",
                });
                return leg.raw;
            }
        }

        const structureStart = Date.now();
        const stageName = kind === "gemini" ? "structure-gemini" : "structure";
        let rawText: string;
        try {
            if (kind === "gemini") {
                const apiKey = process.env.GEMINI_API_KEY;
                if (!apiKey) throw new Error("GEMINI_API_KEY is missing");
                rawText = await structureWithGemini({
                    apiKey,
                    text: numbered,
                    model: geminiModel,
                });
            } else {
                const out = await structureReceipt(numbered, deepseekModel);
                rawText = out.text;
                finish = out.finish;
                usage = out.usage;
            }
        } catch (err) {
            stages.push({
                stage: stageName,
                ok: false,
                ms: Date.now() - structureStart,
                note: errText(err),
            });
            throw err;
        }
        modelMs += Date.now() - structureStart;
        model = kind === "gemini" ? geminiModel : deepseekModel;
        modelRaw = rawText.slice(0, MAX_MODEL_RAW);
        stages.push({
            stage: stageName,
            ok: true,
            ms: Date.now() - structureStart,
            note:
                kind === "gemini"
                    ? geminiModel
                    : `${deepseekModel} · ${finish ?? "?"} · ${usage?.total_tokens ?? "?"} tok`,
        });
        let parsed = parseJson(rawText, kind === "gemini" ? "gemini" : "structure");
        if (parsed.refusal) return parsed;

        let result = verifyReceipt(parsed, grounding);
        pushVerifyStage(result, stageName);

        // Fails badly: allow one vision re-read that can see the OCR text too.
        if (
            !method &&
            (forceVisionRetry || result.retry || !hasEssentials(result.receipt))
        ) {
            try {
                const retry = await visionRetry(numbered, grounding, result);
                if (retry) {
                    result = retry.result;
                    parsed = retry.parsed;
                }
            } catch (err) {
                stages.push({
                    stage: "vision-retry",
                    ok: false,
                    ms: 0,
                    note: errText(err),
                });
            }
        }

        // A hedge result can still win if it is cleaner than the structure.
        if (!method && hedgePromise) {
            const leg = await hedgePromise;
            if (
                leg &&
                (leg.result.flags.length === 0 ||
                    leg.result.severity < result.severity)
            ) {
                parsed = leg.raw;
                result = leg.result;
                hedgeWinner = "vision-hedge";
                fallback = "deepseek-vision-hedge";
                stages.push({
                    stage: "hedge",
                    ok: true,
                    ms: 0,
                    note: "hedge chosen over structure",
                });
            }
        }

        // In method mode the comparison must see the raw result, even when it is
        // incomplete, so the essentials gate only applies to production runs.
        if (!method && !hasEssentials(result.receipt)) {
            stages.push({
                stage: "verify",
                ok: false,
                ms: 0,
                note: "missing item or price",
            });
            throw new Error("Incomplete receipt: missing item or price");
        }
        verified = result;
        if (!hedgeWinner) hedgeWinner = "ocr";
        return parsed;
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
                model: geminiModel,
            }),
            GEMINI_TIMEOUT_MS,
            "gemini"
        );
        modelMs += Date.now() - start;
        model = geminiModel;
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
        // Reuse the hedged vision call instead of paying for a second one.
        if (hedgePromise) {
            const leg = await hedgePromise;
            if (leg) {
                verified = leg.result;
                fallback = "deepseek-vision";
                stages.push({
                    stage: "deepseek-vision",
                    ok: true,
                    ms: 0,
                    note: "hedge result reused",
                });
                return leg.raw;
            }
        }
        const bytes = Buffer.from(await image.arrayBuffer());
        const start = Date.now();
        const out = await extractWithDeepSeekVision({
            mimeType: image.type || "image/jpeg",
            dataBase64: bytes.toString("base64"),
            model: deepseekModel,
        });
        modelMs += Date.now() - start;
        model = deepseekModel;
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

    function buildStageMs(): Record<string, number> {
        const out: Record<string, number> = {};
        for (const stage of stages) {
            out[stage.stage] = (out[stage.stage] ?? 0) + stage.ms;
        }
        return out;
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
            stageMs: buildStageMs(),
            hedge: { fired: hedgeFired, winner: hedgeWinner, ocrMs },
            flags: verified?.flags,
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
                provider,
                fallback,
                ocrFormat: OCR_FORMAT,
                ocrChars,
                model,
                finish,
                usage,
                stage_ms: buildStageMs(),
                hedge_fired: hedgeFired,
                hedge_winner: hedgeWinner,
                ocr_ms: ocrMs,
                flags: verified?.flags.length ?? 0,
                total_ms: Date.now() - started,
                stages,
                error,
            })
        );
    }

    const order: AttemptName[] = method
        ? method === "ocr-deepseek"
            ? ["paddle"]
            : method === "vision-deepseek"
              ? ["deepseek-vision"]
              : method === "ocr-gemini"
                ? ["paddle-gemini"]
                : ["gemini"]
        : provider === "gemini"
          ? ["gemini", "deepseek-vision"]
          : ["paddle", "deepseek-vision", "gemini"];

    const failures: string[] = [];
    let raw: ModelOutput | null = null;

    for (const attempt of order) {
        const attemptStart = Date.now();
        try {
            if (attempt === "paddle") raw = await viaPaddle("deepseek");
            else if (attempt === "paddle-gemini") raw = await viaPaddle("gemini");
            else if (attempt === "gemini") raw = await viaGemini(failures.join(" | ") || "primary failed");
            else raw = await viaDeepSeekVision(failures.join(" | ") || "primary failed");
            break;
        } catch (err) {
            verified = null;
            const note = errText(err);
            failures.push(`${attempt}: ${note}`);
            // paddle's own sub-stages already record its failure.
            if (attempt !== "paddle" && attempt !== "paddle-gemini") {
                stages.push({ stage: attempt, ok: false, ms: Date.now() - attemptStart, note });
            }
        }
    }

    if (!raw) {
        const debug = buildDebug();
        const message = failures.join("; ");
        logRun(false, message);
        return { ok: false, error: `Extraction failed: ${message}`, refusal: null, model_ms: modelMs, debug };
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

    // Fallback paths never ran verification. Ground them against any OCR text
    // that was captured before the primary failed.
    if (!verified) {
        verified = verifyReceipt(raw, grounding ?? { tokens: [] });
        pushVerifyStage(verified, grounding ? "fallback" : "no-ocr");
    }
    const receipt = verified.receipt;
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
