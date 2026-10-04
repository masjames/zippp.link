export type LineItem = {
    description: string | null;
    qty: number | null;
    unit_price: number | null;
    amount: number | null;
};

export type Receipt = {
    merchant: string | null;
    date: string | null;
    currency: string | null;
    line_items: LineItem[];
    subtotal: number | null;
    tax: number | null;
    total: number | null;
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
    debug?: ExtractDebug;
};

export type ExtractResponse = ExtractSuccess | ExtractFailure;
