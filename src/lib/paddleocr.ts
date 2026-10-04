import {
    PADDLEOCR_BASE_URL,
    PADDLEOCR_MODEL,
    PADDLEOCR_POLL_INTERVAL_MS,
    PADDLEOCR_TIMEOUT_MS,
    PADDLEOCR_TOKEN,
} from "./config";

/** PaddleOCR via Baidu AI Studio. Same service the PaddleOCR MCP wraps. */
export type PaddleOcrResult = {
    /** Reconstructed text (one line per visual row) that DeepSeek consumes. */
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

/**
 * PP-OCRv6 options (from the AI Studio sample). Orientation / unwarping are
 * off so the model runs fast and predictably on a clean phone photo.
 */
const OCR_OPTIONS = {
    useDocOrientationClassify: false,
    useDocUnwarping: false,
    useTextlineOrientation: false,
};

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
            if (i < attempts - 1) await sleep(300 * (i + 1));
        }
    }
    throw lastError;
}

function remaining(deadline: number): number {
    return Math.max(500, deadline - Date.now());
}

async function submit(image: File, deadline: number): Promise<string> {
    const form = new FormData();
    form.append("model", PADDLEOCR_MODEL);
    form.append("optionalPayload", JSON.stringify(OCR_OPTIONS));
    form.append("file", image, image.name || "receipt.jpg");

    const res = await fetchRetry(
        JOBS_URL,
        {
            method: "POST",
            headers: { Authorization: `Bearer ${PADDLEOCR_TOKEN}` },
            body: form,
            signal: AbortSignal.timeout(remaining(deadline)),
            cache: "no-store",
        },
        1
    );

    const raw = await res.text();
    let json: { code?: number; msg?: string; data?: { jobId?: string } } = {};
    try {
        json = JSON.parse(raw);
    } catch {
        /* fall through */
    }
    if (!res.ok) {
        throw new PaddleOcrError(
            `submit HTTP ${res.status}: ${(json.msg || raw).slice(0, 200)}`,
            "submit"
        );
    }
    const jobId = json.data?.jobId;
    if (!jobId) {
        throw new PaddleOcrError(
            `submit returned no jobId: ${(json.msg || raw).slice(0, 200)}`,
            "submit"
        );
    }
    return jobId;
}

type JobStatus = {
    state?: string;
    resultUrl?: { jsonUrl?: string };
    extractProgress?: { totalPages?: number; extractedPages?: number };
};

async function poll(
    jobId: string,
    deadline: number
): Promise<{ status: JobStatus; states: string[] }> {
    const states: string[] = [];

    while (Date.now() < deadline) {
        let json: { data?: JobStatus; msg?: string };
        try {
            const res = await fetchRetry(
                `${JOBS_URL}/${jobId}`,
                {
                    headers: { Authorization: `Bearer ${PADDLEOCR_TOKEN}` },
                    signal: AbortSignal.timeout(remaining(deadline)),
                    cache: "no-store",
                },
                1
            );
            json = (await res.json()) as { data?: JobStatus; msg?: string };
        } catch {
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
        `timed out after ${PADDLEOCR_TIMEOUT_MS}ms (states: ${states.join(">") || "none"})`,
        "poll"
    );
}

type RecogToken = { text: string; box: number[] };

/**
 * Group recognized tokens into visual rows by vertical position, then join
 * each row left-to-right with " | ". PP-OCR returns one token per cell, so
 * this rebuilds the receipt/table lines that DeepSeek can structure.
 */
function rowsFromTokens(tokens: RecogToken[]): string[] {
    const items = tokens
        .filter((t) => t.text.trim() && t.box.length === 4)
        .map((t) => ({
            text: t.text.trim(),
            x: t.box[0],
            y: (t.box[1] + t.box[3]) / 2,
            h: Math.abs(t.box[3] - t.box[1]) || 20,
        }))
        .sort((a, b) => a.y - b.y || a.x - b.x);

    if (items.length === 0) {
        return tokens.map((t) => t.text.trim()).filter(Boolean);
    }

    const rows: { y: number; h: number; cells: typeof items }[] = [];
    for (const item of items) {
        const row = rows[rows.length - 1];
        const tol = Math.max(8, Math.max(row?.h ?? item.h, item.h) * 0.6);
        if (row && Math.abs(item.y - row.y) <= tol) {
            row.cells.push(item);
            row.y = (row.y + item.y) / 2;
            row.h = Math.max(row.h, item.h);
        } else {
            rows.push({ y: item.y, h: item.h, cells: [item] });
        }
    }

    return rows.map((row) =>
        row.cells
            .sort((a, b) => a.x - b.x)
            .map((c) => c.text)
            .join(" | ")
    );
}

/** Parse whichever model ran: PP-OCRv6 (ocrResults) or PaddleOCR-VL (markdown). */
function parseResultPayload(text: string): {
    markdown: string;
    blocks: { label: string; text: string }[];
    pages: number;
} {
    const records: unknown[] = [];
    const whole = text.trim();
    let parsedWhole: unknown = null;
    try {
        parsedWhole = JSON.parse(whole);
    } catch {
        /* JSONL */
    }
    if (parsedWhole) records.push(parsedWhole);
    else {
        for (const line of whole.split("\n")) {
            const l = line.trim();
            if (!l) continue;
            try {
                records.push(JSON.parse(l));
            } catch {
                /* skip */
            }
        }
    }

    const blocks: { label: string; text: string }[] = [];
    const lines: string[] = [];
    let pages = 0;

    for (const record of records) {
        const result = (record as { result?: Record<string, unknown> })?.result;
        if (!result) continue;

        // PaddleOCR-VL document parsing
        const layout = result.layoutParsingResults as
            | {
                  markdown?: { text?: string };
                  prunedResult?: {
                      parsing_res_list?: { block_label?: string; block_content?: string }[];
                  };
              }[]
            | undefined;
        if (Array.isArray(layout)) {
            pages += layout.length;
            for (const page of layout) {
                const md = page.markdown?.text;
                if (md) lines.push(md);
                for (const b of page.prunedResult?.parsing_res_list ?? []) {
                    const content = (b.block_content ?? "").trim();
                    if (content) blocks.push({ label: b.block_label ?? "", text: content });
                }
            }
            continue;
        }

        // PP-OCRv6 OCR
        const ocrResults = result.ocrResults as
            | {
                  prunedResult?: {
                      rec_texts?: string[];
                      rec_boxes?: number[][];
                  };
              }[]
            | undefined;
        if (Array.isArray(ocrResults)) {
            pages += ocrResults.length;
            for (const ocr of ocrResults) {
                const pruned = ocr.prunedResult ?? {};
                const texts = pruned.rec_texts ?? [];
                const boxes = pruned.rec_boxes ?? [];
                const tokens: RecogToken[] = texts.map((t, i) => ({
                    text: t,
                    box: boxes[i] ?? [],
                }));
                const rows = rowsFromTokens(tokens);
                for (const r of rows) blocks.push({ label: "line", text: r });
                if (rows.length) lines.push(rows.join("\n"));
            }
        }
    }

    return { markdown: lines.join("\n\n"), blocks, pages };
}

async function fetchResult(
    jsonUrl: string,
    deadline: number
): Promise<{
    markdown: string;
    blocks: { label: string; text: string }[];
    pages: number;
}> {
    const res = await fetchRetry(
        jsonUrl,
        { signal: AbortSignal.timeout(remaining(deadline)), cache: "no-store" },
        1
    );
    if (!res.ok) {
        throw new PaddleOcrError(`result HTTP ${res.status}`, "result");
    }
    return parseResultPayload(await res.text());
}

/**
 * Run one image through PaddleOCR within a hard budget (default <6s).
 * The whole stage — submit, poll, result — is bounded by `timeoutMs`.
 */
export async function runPaddleOcr(
    image: File,
    timeoutMs: number = PADDLEOCR_TIMEOUT_MS
): Promise<PaddleOcrResult> {
    if (!PADDLEOCR_TOKEN) {
        throw new PaddleOcrError("PADDLEOCR_AISTUDIO_TOKEN is missing", "config");
    }

    const deadline = Date.now() + timeoutMs;

    const submitStart = Date.now();
    const jobId = await submit(image, deadline);
    const submitMs = Date.now() - submitStart;

    const pollStart = Date.now();
    const { status, states } = await poll(jobId, deadline);
    const pollMs = Date.now() - pollStart;

    const jsonUrl = status.resultUrl?.jsonUrl;
    if (!jsonUrl) {
        throw new PaddleOcrError("job done but no resultUrl.jsonUrl", "result");
    }

    const resultStart = Date.now();
    const parsed = await fetchResult(jsonUrl, deadline);
    const resultMs = Date.now() - resultStart;

    return { ...parsed, jobId, states, submitMs, pollMs, resultMs };
}
