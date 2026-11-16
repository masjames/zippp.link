import { readLegacyExpenses, type LegacyExpenseCandidate } from "./legacy-expenses";
import type { ColumnMap } from "../google/workspace-store";

export type CurrencyTotal = { currency: string; minor: string };
export type LegacyReceiptSummary = {
    today: string;
    weekStart: string;
    partial: boolean;
    todayTotals: CurrencyTotal[];
    weekTotals: CurrencyTotal[];
    latest: LegacyExpenseCandidate[];
};

const REQUIRED_FIELDS = ["date", "total", "currency", "receipt_id"] as const;
const CANONICAL_HEADERS = ["Date", "Total", "Currency", "Receipt ID"] as const;
const DAY_MS = 24 * 60 * 60 * 1000;
const SHEETS_EPOCH_MS = Date.UTC(1899, 11, 30);
const LAST_SUPPORTED_SERIAL = (Date.UTC(9999, 11, 31) - SHEETS_EPOCH_MS) / DAY_MS;
const LATEST_LIMIT = 5;

/** Google Sheets returns unformatted date cells as whole serial days. */
function sheetDate(value: unknown): unknown {
    if (typeof value !== "number") return value;
    if (!Number.isSafeInteger(value) || value < 0 || value > LAST_SUPPORTED_SERIAL) return null;
    return new Date(SHEETS_EPOCH_MS + value * DAY_MS).toISOString().slice(0, 10);
}

/** Select the local date without treating the server's time zone as the user's. */
export function dateInTimeZone(now: Date, timeZone: string): string {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone, year: "numeric", month: "2-digit", day: "2-digit",
    }).formatToParts(now);
    const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value;
    const year = get("year"), month = get("month"), day = get("day");
    if (!year || !month || !day) throw new Error("Cannot determine local date");
    return `${year}-${month}-${day}`;
}

/** Summarize only readable receipt rows. Never infer accounts or combine currencies. */
export function summarizeLegacyReceipts(
    values: readonly (readonly unknown[])[],
    columnMap: ColumnMap,
    today: string,
): LegacyReceiptSummary {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) throw new Error("Invalid local date");
    const current = new Date(`${today}T00:00:00.000Z`);
    if (Number.isNaN(current.getTime()) || current.toISOString().slice(0, 10) !== today) throw new Error("Invalid local date");
    const headers = (values[0] ?? []).map((cell) => typeof cell === "string" ? cell.trim() : "");
    const mappedHeaders = REQUIRED_FIELDS.map((field) => columnMap[field]);
    if (mappedHeaders.some((header) => !header) || new Set(mappedHeaders).size !== mappedHeaders.length) {
        throw new Error("Missing receipt column mapping");
    }
    const indices = mappedHeaders.map((header) => headers.indexOf(header));
    if (indices.some((index, i) => index < 0 || headers.lastIndexOf(mappedHeaders[i]) !== index)) {
        throw new Error("Missing or duplicate mapped sheet header");
    }
    const rows = values.slice(1)
        .filter((row) => row.some((cell) => cell !== null && cell !== undefined && cell !== ""))
        .map((row) => indices.map((index, i) => i === 0 ? sheetDate(row[index]) : row[index]));
    const parsed = readLegacyExpenses(CANONICAL_HEADERS, rows);
    const weekDate = new Date(current.getTime());
    weekDate.setUTCDate(weekDate.getUTCDate() - ((weekDate.getUTCDay() + 6) % 7));
    const weekStart = weekDate.toISOString().slice(0, 10);
    const eligible = parsed.candidates.filter((candidate) => candidate.occurredOn <= today);
    const currencies = new Map<string, { today: bigint; week: bigint }>();
    for (const candidate of eligible) {
        const total = currencies.get(candidate.amount.currency) ?? { today: BigInt(0), week: BigInt(0) };
        const amount = BigInt(candidate.amount.minor);
        if (candidate.occurredOn === today) total.today += amount;
        if (candidate.occurredOn >= weekStart) total.week += amount;
        currencies.set(candidate.amount.currency, total);
    }
    return {
        today,
        weekStart,
        partial: parsed.rejectedRows.length > 0 || eligible.length !== parsed.candidates.length,
        todayTotals: Array.from(currencies, ([currency, value]) => ({ currency, minor: value.today.toString() })),
        weekTotals: Array.from(currencies, ([currency, value]) => ({ currency, minor: value.week.toString() })),
        latest: eligible.slice().sort((a, b) => b.occurredOn.localeCompare(a.occurredOn)).slice(0, LATEST_LIMIT),
    };
}
