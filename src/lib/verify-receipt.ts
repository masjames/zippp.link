import type { LineItem, RawReceipt, Receipt, ReceiptFlag } from "@/types/receipt";

/**
 * Deterministic anti-hallucination pass over one structuring result.
 *
 * Rules:
 * - A value that is not present in the OCR text is a guess, so it becomes null
 *   and gets a `not_in_ocr` flag.
 * - A value that is present but whose reported source row does not contain it
 *   gets a `row_mismatch` flag (the value stays, it is grounded somewhere).
 * - An OCR token with a low recognition score gets a `low_confidence` flag.
 * - Arithmetic that does not add up gets an `arithmetic` flag. A grounded value
 *   is kept, because a mismatch usually means a missing line, not a wrong total.
 * - When no OCR text is available (image-only fallback) every value is flagged
 *   `ungrounded` instead of being nulled, so nothing is silently trusted.
 */

export type OcrGrounding = {
    /** Raw recognized text lines (rec_texts). */
    tokens: string[];
    /** Optional per-token recognition score (0-1), aligned with `tokens`. */
    scores?: (number | null)[];
    /** Reconstructed rows, in the same order the model saw them. */
    rows?: string[];
};

export type VerifyResult = {
    receipt: Receipt;
    flags: ReceiptFlag[];
    /** Field paths that were set to null because they failed verification. */
    nulled: string[];
    severity: number;
    /** True when the result failed badly enough to try a vision re-read. */
    retry: boolean;
};

/** PP-OCRv6 recognition scores are 0-1; below this the digits are uncertain. */
const REC_SCORE_MIN = 0.8;
/** Tolerance for matching a model number to an OCR number. */
const EPS_ABS = 0.01;
const EPS_REL = 0.001;
/** Minimum fuzzy similarity for a merchant to count as grounded. */
const MERCHANT_MIN = 0.6;

function asString(value: unknown): string | null {
    return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function asNumber(value: unknown): number | null {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asIndex(value: unknown): number | null {
    return typeof value === "number" && Number.isInteger(value) && value >= 0
        ? value
        : null;
}

/**
 * Parse a number written in Indonesian or English format.
 * Handles "15.000", "15,000.00", "15.000,50", "Rp 15.000", "15.000,-".
 */
export function normalizeNumber(input: string): number | null {
    let s = input.trim();
    if (!s) return null;

    // Keep digits, separators and a leading sign.
    s = s.replace(/[^\d.,+\-]/g, "");
    if (!/\d/.test(s)) return null;

    let negative = false;
    if (s[0] === "-" || s[0] === "+") {
        negative = s[0] === "-";
        s = s.slice(1);
    }
    // A trailing sign or separator is decoration ("15.000,-").
    s = s.replace(/[.,\-+]+$/, "");
    if (!s) return null;

    if (s.includes(",") && s.includes(".")) {
        // Both separators: the last one is the decimal separator.
        const lastComma = s.lastIndexOf(",");
        const lastDot = s.lastIndexOf(".");
        if (lastComma > lastDot) {
            // Indonesian: 1.234,56
            s = s.replace(/\./g, "").replace(",", ".");
        } else {
            // English: 1,234.56
            s = s.replace(/,/g, "");
        }
    } else if (s.includes(",")) {
        const parts = s.split(",");
        if (parts.length === 2 && parts[1].length <= 2) s = parts.join(".");
        else s = s.replace(/,/g, "");
    } else if (s.includes(".")) {
        const parts = s.split(".");
        if (parts.length > 2) s = s.replace(/\./g, "");
        else if (parts[1].length === 3 && parts[0].length <= 3) {
            // Indonesian thousands: 15.000
            s = s.replace(/\./g, "");
        }
    }

    const n = Number(s);
    if (!Number.isFinite(n)) return null;
    return negative ? -n : n;
}

/** Every number-like substring in a piece of OCR text. */
function numbersIn(text: string): number[] {
    const out: number[] = [];
    for (const token of text.match(/\d[\d.,]*/g) ?? []) {
        const n = normalizeNumber(token);
        if (n !== null) out.push(n);
    }
    return out;
}

function approxEqual(a: number, b: number): boolean {
    return Math.abs(a - b) <= Math.max(EPS_ABS, Math.abs(b) * EPS_REL);
}

/**
 * Grounding is stricter than arithmetic: an OCR number either reads as the
 * model number or it does not. A tolerance here would hide digit swaps like
 * 15.000 vs 15.008.
 */
function sameNumber(a: number, b: number): boolean {
    return Math.abs(a - b) <= 0.005;
}

function rowHasNumber(row: string, value: number): boolean {
    return numbersIn(row).some((n) => sameNumber(n, value));
}

type Entry = { text: string; nums: number[]; score: number | null };

function bestMatch(entries: Entry[], value: number): Entry | null {
    let best: Entry | null = null;
    for (const entry of entries) {
        if (!entry.nums.some((n) => sameNumber(n, value))) continue;
        if (!best) best = entry;
        else if ((entry.score ?? 1) > (best.score ?? 1)) best = entry;
    }
    return best;
}

function normalizeText(value: string): string {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function levenshtein(a: string, b: string): number {
    const prev = new Array<number>(b.length + 1);
    const curr = new Array<number>(b.length + 1);
    for (let j = 0; j <= b.length; j++) prev[j] = j;
    for (let i = 1; i <= a.length; i++) {
        curr[0] = i;
        for (let j = 1; j <= b.length; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
        }
        for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
    }
    return prev[b.length];
}

function similarity(a: string, b: string): number {
    if (!a || !b) return 0;
    if (a === b) return 1;
    const score = 1 - levenshtein(a, b) / Math.max(a.length, b.length);
    return Math.max(0, score);
}

/** Fuzzy match a merchant name against OCR tokens and rows. */
function merchantMatches(merchant: string, candidates: string[]): boolean {
    const m = normalizeText(merchant);
    if (!m) return false;
    const words = m.split(" ").filter((w) => w.length >= 3);
    for (const candidate of candidates) {
        const c = normalizeText(candidate);
        if (!c) continue;
        if (c.includes(m) || m.includes(c)) return true;
        if (similarity(m, c) >= MERCHANT_MIN) return true;
        if (words.length > 0) {
            const hits = words.filter((w) => c.includes(w)).length;
            if (hits / words.length >= MERCHANT_MIN) return true;
        }
    }
    return false;
}

const MONTHS: Record<string, number> = {
    jan: 1, januari: 1, january: 1,
    feb: 2, februari: 2, february: 2,
    mar: 3, maret: 3, march: 3,
    apr: 4, april: 4,
    mei: 5, may: 5,
    jun: 6, juni: 6, june: 6,
    jul: 7, juli: 7, july: 7,
    agu: 8, agustus: 8, aug: 8, august: 8,
    sep: 9, sept: 9, september: 9,
    okt: 10, oktober: 10, oct: 10, october: 10,
    nov: 11, november: 11,
    des: 12, desember: 12, dec: 12, december: 12,
};

/** Digits in a text, with month names converted to their number. */
function digitsIn(text: string): Set<number> {
    let s = text.toLowerCase();
    for (const [name, num] of Object.entries(MONTHS)) {
        s = s.replace(new RegExp(`\\b${name}\\b`, "g"), ` ${num} `);
    }
    return new Set(numbersIn(s));
}

/** Day, month and year from a model date string. */
function parseDateParts(date: string): [number, number, number] | null {
    const iso = date.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (iso) return [Number(iso[3]), Number(iso[2]), Number(iso[1])];
    const dmy = date.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/);
    if (dmy) {
        const a = Number(dmy[1]);
        const b = Number(dmy[2]);
        // Order-insensitive matching, so day/month ambiguity does not matter.
        return [a, b, Number(dmy[3])];
    }
    return null;
}

function dateMatches(date: string, candidates: string[]): boolean {
    const parts = parseDateParts(date);
    if (!parts) return false;
    const [day, month, year] = parts;
    const year2 = year % 100;
    for (const candidate of candidates) {
        const digits = digitsIn(candidate);
        const hasDayMonth = (digits.has(day) && digits.has(month));
        const hasYear = digits.has(year) || digits.has(year2);
        if (hasDayMonth && hasYear) return true;
    }
    return false;
}

function round2(value: number): number {
    return Math.round(value * 100) / 100;
}

function dedupeFlags(flags: ReceiptFlag[]): ReceiptFlag[] {
    const seen = new Set<string>();
    const out: ReceiptFlag[] = [];
    for (const flag of flags) {
        const key = `${flag.path}\u0000${flag.reason}\u0000${flag.detail ?? ""}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(flag);
    }
    return out;
}

/**
 * Verify a structuring result against the OCR tokens.
 * The returned receipt has failing (ungrounded) fields set to null and carries
 * every flag in `receipt.flags`.
 */
export function verifyReceipt(raw: RawReceipt, ocr: OcrGrounding): VerifyResult {
    const flags: ReceiptFlag[] = [];
    const nulled: string[] = [];

    const tokens = Array.isArray(ocr.tokens) ? ocr.tokens : [];
    const rows = Array.isArray(ocr.rows) ? ocr.rows : [];
    const grounded = tokens.some((t) => t.trim() !== "");
    const tokenEntries: Entry[] = tokens.map((text, i) => ({
        text,
        nums: numbersIn(text),
        score: ocr.scores?.[i] ?? null,
    }));
    const rowEntries: Entry[] = rows.map((text) => ({
        text,
        nums: numbersIn(text),
        score: null,
    }));
    const candidates = [...tokens, ...rows];

    function matchNumber(value: number): Entry | null {
        return bestMatch(tokenEntries, value) ?? bestMatch(rowEntries, value);
    }

    function ground(
        value: unknown,
        path: string,
        sourceRow: unknown,
        required: boolean
    ): number | null {
        const n = asNumber(value);
        if (n === null) {
            if (required) flags.push({ path, reason: "missing" });
            return null;
        }
        if (!grounded) {
            flags.push({ path, reason: "ungrounded" });
            return n;
        }
        const match = matchNumber(n);
        if (!match) {
            flags.push({ path, reason: "not_in_ocr", detail: String(n) });
            nulled.push(path);
            return null;
        }
        if (match.score !== null && match.score < REC_SCORE_MIN) {
            flags.push({
                path,
                reason: "low_confidence",
                detail: match.text.slice(0, 40),
            });
        }
        const row = asIndex(sourceRow);
        if (row !== null) {
            const rowText = rows[row];
            if (rowText === undefined || !rowHasNumber(rowText, n)) {
                flags.push({
                    path,
                    reason: "row_mismatch",
                    detail: `row ${row}`,
                    row,
                });
            }
        }
        return n;
    }

    // Merchant. A missing merchant is not flagged: it is empty, not a guess.
    let merchant = asString(raw.merchant);
    const merchantRow = asIndex(raw.merchant_source);
    if (merchant === null) {
        /* no flag: nothing was extracted */
    } else if (!grounded) {
        flags.push({ path: "merchant", reason: "ungrounded" });
    } else if (!merchantMatches(merchant, candidates)) {
        flags.push({ path: "merchant", reason: "not_in_ocr" });
        nulled.push("merchant");
        merchant = null;
    } else if (merchantRow !== null) {
        const rowText = rows[merchantRow];
        if (rowText === undefined || !merchantMatches(merchant, [rowText])) {
            flags.push({
                path: "merchant",
                reason: "row_mismatch",
                detail: `row ${merchantRow}`,
                row: merchantRow,
            });
        }
    }

    // Date. A missing date is not flagged here: the client fills the capture
    // date and flags it as assumed.
    let date = asString(raw.date);
    if (date === null) {
        /* no flag: the client handles the assumed date */
    } else if (!grounded) {
        flags.push({ path: "date", reason: "ungrounded" });
    } else if (!dateMatches(date, candidates)) {
        flags.push({ path: "date", reason: "not_in_ocr", detail: date });
        nulled.push("date");
        date = null;
    }

    // Line items.
    const rawLines = Array.isArray(raw.line_items) ? raw.line_items : [];
    const line_items: LineItem[] = rawLines.map((item, i) => {
        const base = `line_items[${i}]`;
        const qty = ground(item?.qty, `${base}.qty`, item?.source, false);
        const unit_price = ground(
            item?.unit_price,
            `${base}.unit_price`,
            item?.source,
            false
        );
        const amount = ground(item?.amount, `${base}.amount`, item?.source, false);
        if (
            qty !== null &&
            unit_price !== null &&
            amount !== null &&
            !approxEqual(qty * unit_price, amount)
        ) {
            flags.push({
                path: `${base}.amount`,
                reason: "arithmetic",
                detail: `${qty} x ${unit_price} = ${round2(qty * unit_price)}, read ${amount}`,
            });
        }
        return {
            description: asString(item?.description),
            qty,
            unit_price,
            amount,
        };
    });

    // Totals.
    const subtotal = ground(raw.subtotal, "subtotal", raw.subtotal_source, false);
    const tax = ground(raw.tax, "tax", raw.tax_source, false);
    const total = ground(raw.total, "total", raw.total_source, false);

    const allAmounts =
        line_items.length > 0 && line_items.every((l) => l.amount !== null);
    const lineSum = line_items.reduce((sum, l) => sum + (l.amount ?? 0), 0);
    if (subtotal !== null && allAmounts && !approxEqual(lineSum, subtotal)) {
        flags.push({
            path: "subtotal",
            reason: "arithmetic",
            detail: `lines ${lineSum} vs subtotal ${subtotal}`,
        });
    }
    if (subtotal !== null && tax !== null && total !== null && !approxEqual(subtotal + tax, total)) {
        flags.push({
            path: "total",
            reason: "arithmetic",
            detail: `${subtotal} + ${tax} vs ${total}`,
        });
    }
    if (subtotal !== null && tax === null && total !== null && !approxEqual(subtotal, total)) {
        flags.push({
            path: "total",
            reason: "arithmetic",
            detail: `subtotal ${subtotal} vs total ${total}`,
        });
    }
    if (subtotal === null && total !== null && allAmounts && !approxEqual(lineSum, total)) {
        flags.push({
            path: "total",
            reason: "arithmetic",
            detail: `lines ${lineSum} vs total ${total}`,
        });
    }

    const unique = dedupeFlags(flags);
    const receipt: Receipt = {
        merchant,
        date,
        currency: asString(raw.currency),
        line_items,
        subtotal,
        tax,
        total,
        flags: unique,
    };

    const coreNulled = nulled.includes("total") || nulled.includes("merchant");
    const amountsNulled = nulled.filter((p) => p.endsWith(".amount")).length;
    const retry = coreNulled || amountsNulled >= 2;

    return {
        receipt,
        flags: unique,
        nulled,
        severity: unique.length + nulled.length,
        retry,
    };
}
