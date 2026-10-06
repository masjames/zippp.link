export type LineItem = {
    description: string | null;
    qty: number | null;
    unit_price: number | null;
    amount: number | null;
};

/**
 * One verification flag. `path` identifies the field (e.g. "total",
 * "line_items[0].amount"). `reason` is a machine code, `detail` is for humans.
 */
export type ReceiptFlag = {
    path: string;
    reason: string;
    detail?: string;
    row?: number | null;
};

export type Receipt = {
    merchant: string | null;
    date: string | null;
    currency: string | null;
    line_items: LineItem[];
    subtotal: number | null;
    tax: number | null;
    total: number | null;
    /** Present when the verifier flagged one or more fields. */
    flags?: ReceiptFlag[];
};

/** A line item as the model returned it, with OCR row provenance. */
export type RawLineItem = LineItem & { source?: number | null };

/** The raw structuring output, before verification. */
export type RawReceipt = {
    refusal?: "not_a_receipt" | "unreadable" | null;
    merchant: string | null;
    merchant_source?: number | null;
    date: string | null;
    date_source?: number | null;
    currency: string | null;
    line_items: RawLineItem[];
    subtotal: number | null;
    subtotal_source?: number | null;
    tax: number | null;
    tax_source?: number | null;
    total: number | null;
    total_source?: number | null;
};

export type ExtractTimings = {
    model_ms: number;
    server_ms: number;
};

/** One step of the extraction pipeline, for the always-on debug console. */
export type ExtractStage = {
    stage: string;
    ok: boolean;
    ms: number;
    note?: string;
};

/** Trace returned on every /api/extract response. Secrets are never included. */
export type ExtractDebug = {
    runId: string;
    provider: string;
    fallback: string | null;
    ocrFormat: string;
    ocrChars: number;
    model: string | null;
    finish: string | null;
    usage: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
    } | null;
    stages: ExtractStage[];
    /** Per-stage total milliseconds, keyed by stage name. */
    stageMs?: Record<string, number>;
    /** Verification flags produced by the anti-hallucination pass. */
    flags?: ReceiptFlag[];
    /** Raw OCR text lines (rec_texts), for step-by-step debugging. */
    ocrTokens?: string[];
    /** Reconstructed rows that were sent to DeepSeek. */
    markdownPreview?: string;
    /** Raw model output (DeepSeek/Gemini) before parsing. */
    modelRaw?: string;
};

export type ExtractSuccess = {
    ok: true;
    receipt: Receipt;
    timings: ExtractTimings;
    debug?: ExtractDebug;
};

export type ExtractFailure = {
    ok: false;
    error: string;
    /** Present so the client can react to a refusal without matching strings. */
    refusal?: "unreadable" | "not_a_receipt" | null;
    debug?: ExtractDebug;
};

export type ExtractResponse = ExtractSuccess | ExtractFailure;
