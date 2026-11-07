// @implements FEAT-121
/**
 * Shared money/quantity parser for client and server.
 * Accepts numbers, plain digit strings, Indonesian grouping (1.234.567 or 1.234,56),
 * US grouping (1,234.56), bracketed negatives like (1.000), and CR/DB indicators.
 */
export function parseMoney(input: string | number | null | undefined): number | null {
    if (input == null) return null;
    if (typeof input === "number") {
        return Number.isFinite(input) ? input : null;
    }

    let s = String(input).trim();
    if (s === "") return null;

    // Check if bracketed negative: (1000) or (1.000,50)
    let isNegative = false;
    if (s.startsWith("(") && s.endsWith(")")) {
        isNegative = true;
        s = s.slice(1, -1).trim();
    } else if (s.startsWith("-")) {
        isNegative = true;
        s = s.slice(1).trim();
    } else if (s.endsWith("-")) {
        isNegative = true;
        s = s.slice(0, -1).trim();
    }

    // Trailing/leading credit (CR) or debit (DB)
    if (/\bcr\b/i.test(s)) {
        s = s.replace(/\bcr\b/gi, "").trim();
    }
    if (/\bdb\b/i.test(s)) {
        s = s.replace(/\bdb\b/gi, "").trim();
    }

    // Strip currency symbols, spaces, and non-breaking spaces
    s = s.replace(/^rp\.?\s*/i, "");
    s = s.replace(/^idr\s*/i, "");
    s = s.replace(/^\$\s*/, "");
    s = s.replace(/\s+/g, "").replace(/\u00a0/g, "");

    if (s === "") return null;

    let result: number | null = null;

    // Indonesian grouping: 1.234.567 or 1.234.567,89 or 1.234,5
    if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) {
        const val = Number(s.replace(/\./g, "").replace(",", "."));
        result = Number.isFinite(val) ? val : null;
    }
    // US grouping: 1,234,567 or 1,234,567.89 or 1,234.5
    else if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) {
        const val = Number(s.replace(/,/g, ""));
        result = Number.isFinite(val) ? val : null;
    }
    // Lone comma decimal or decimal without grouping: 12,5 -> 12.5
    else {
        const val = Number(s.replace(",", "."));
        result = Number.isFinite(val) ? val : null;
    }

    if (result !== null && isNegative) {
        return -Math.abs(result);
    }
    return result;
}
