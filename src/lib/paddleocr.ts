import {
    PADDLEOCR_BASE_URL,
    PADDLEOCR_MODEL,
    PADDLEOCR_POLL_INTERVAL_MS,
    PADDLEOCR_POLL_TIMEOUT_MS,
    PADDLEOCR_SUBMIT_TIMEOUT_MS,
    PADDLEOCR_TOKEN,
} from "./config";

/** PaddleOCR-VL via Baidu AI Studio. Same service the PaddleOCR MCP wraps. */
export type PaddleOcrResult = {
    markdown: string;
    blocks: { label: string; text: string }[];
    pages: number;
    jobId: string;
    states: string[];
    submitMs: number;
    pollMs: number;
    resultMs: number;
};

export class PaddleOcrError extends Error {
    constructor(
        message: string,
        readonly stage: "config" | "submit" | "poll" | "result"
    ) {
        super(message);
        this.name = "PaddleOcrError";
    }
}

const JOBS_URL = `${PADDLEOCR_BASE_URL}/api/v2/ocr/jobs`;

/** Server defaults read receipts fully and fast; extras only add latency. */
const OCR_OPTIONS: Record<string, unknown> = {};

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Retry a fetch on transient network errors (not on HTTP errors). */
async function fetchRetry(
    input: string,
    init: RequestInit,
    attempts = 2
): Promise<Response> {
    let lastError: unknown;
    for (let i = 0; i < attempts; i++) {
        try {
            return await fetch(input, init);
        } catch (err) {
            lastError = err;
            if (i < attempts - 1) await sleep(500 * (i + 1));
        }
    }
    throw lastError;
}

async function submit(image: File): Promise<string> {
    const form = new FormData();
    form.append("model", PADDLEOCR_MODEL);
    form.append("optionalPayload", JSON.stringify(OCR_OPTIONS));
    form.append("file", image, image.name || "receipt.jpg");

    const res = await fetchRetry(JOBS_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${PADDLEOCR_TOKEN}` },
        body: form,
        signal: AbortSignal.timeout(PADDLEOCR_SUBMIT_TIMEOUT_MS),
        cache: "no-store",
    });

    const raw = await res.text();
    let json: { code?: number; msg?: string; data?: { jobId?: string } } = {};
    try {
        json = JSON.parse(raw);
    } catch {
        /* fall through to error below */
    }

    if (!res.ok) {
        throw new PaddleOcrError(
            `submit HTTP ${res.status}: ${(json.msg || raw).slice(0, 240)}`,
            "submit"
        );
    }
    const jobId = json.data?.jobId;
    if (!jobId) {
        throw new PaddleOcrError(
            `submit returned no jobId: ${(json.msg || raw).slice(0, 240)}`,
            "submit"
        );
    }
    return jobId;
}

type JobStatus = {
    state?: string;
    resultUrl?: { jsonUrl?: string };
};

async function poll(jobId: string): Promise<{ status: JobStatus; states: string[] }> {
    const deadline = Date.now() + PADDLEOCR_POLL_TIMEOUT_MS;
    const states: string[] = [];

    while (Date.now() < deadline) {
        let json: { data?: JobStatus; msg?: string };
        try {
            const res = await fetchRetry(`${JOBS_URL}/${jobId}`, {
                headers: { Authorization: `Bearer ${PADDLEOCR_TOKEN}` },
                signal: AbortSignal.timeout(PADDLEOCR_SUBMIT_TIMEOUT_MS),
                cache: "no-store",
            });
            json = (await res.json()) as { data?: JobStatus; msg?: string };
        } catch {
            // transient network blip — keep polling until the deadline
            await sleep(PADDLEOCR_POLL_INTERVAL_MS);
            continue;
        }
        const state = json.data?.state ?? "unknown";
        states.push(state);

        if (state === "done") return { status: json.data ?? {}, states };
        if (state === "failed") {
            throw new PaddleOcrError(`job failed: ${json.msg || "unknown"}`, "poll");
        }
        await sleep(PADDLEOCR_POLL_INTERVAL_MS);
    }

    throw new PaddleOcrError(
        `poll timed out after ${PADDLEOCR_POLL_TIMEOUT_MS}ms (states: ${states.join(">")})`,
        "poll"
    );
}

async function fetchResult(jsonUrl: string): Promise<{
    markdown: string;
    blocks: { label: string; text: string }[];
    pages: number;
}> {
    const res = await fetchRetry(jsonUrl, {
        signal: AbortSignal.timeout(PADDLEOCR_SUBMIT_TIMEOUT_MS),
        cache: "no-store",
    });
    if (!res.ok) {
        throw new PaddleOcrError(`result HTTP ${res.status}`, "result");
    }
    const json = (await res.json()) as {
        result?: {
            layoutParsingResults?: {
                markdown?: { text?: string };
                prunedResult?: {
                    parsing_res_list?: { block_label?: string; block_content?: string }[];
                };
            }[];
        };
    };

    const pages = json.result?.layoutParsingResults ?? [];
    const markdownParts: string[] = [];
    const blocks: { label: string; text: string }[] = [];

    for (const page of pages) {
        const text = page.markdown?.text;
        if (text) markdownParts.push(text);
        for (const b of page.prunedResult?.parsing_res_list ?? []) {
            const content = (b.block_content ?? "").trim();
            if (content) blocks.push({ label: b.block_label ?? "", text: content });
        }
    }

    return { markdown: markdownParts.join("\n\n"), blocks, pages: pages.length };
}

/**
 * Run one image through PaddleOCR-VL. Returns markdown (the payload DeepSeek
 * consumes) plus the structured blocks for debugging.
 */
export async function runPaddleOcr(image: File): Promise<PaddleOcrResult> {
    if (!PADDLEOCR_TOKEN) {
        throw new PaddleOcrError("PADDLEOCR_AISTUDIO_TOKEN is missing", "config");
    }

    const submitStart = Date.now();
    const jobId = await submit(image);
    const submitMs = Date.now() - submitStart;

    const pollStart = Date.now();
    const { status, states } = await poll(jobId);
    const pollMs = Date.now() - pollStart;

    const jsonUrl = status.resultUrl?.jsonUrl;
    if (!jsonUrl) {
        throw new PaddleOcrError("job done but no resultUrl.jsonUrl", "result");
    }

    const resultStart = Date.now();
    const parsed = await fetchResult(jsonUrl);
    const resultMs = Date.now() - resultStart;

    return { ...parsed, jobId, states, submitMs, pollMs, resultMs };
}
