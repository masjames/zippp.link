import type { ISODate, Money } from "./model";

/** A receipt candidate, not a confirmed ledger entry: legacy rows contain no account or idempotency key. */
export interface LegacyExpenseCandidate {
  receiptId: string;
  occurredOn: ISODate;
  amount: Money;
}

export interface LegacyExpenseResult {
  candidates: LegacyExpenseCandidate[];
  rejectedRows: number[];
}

/** Read the default personal-expense template only. Conflicting receipt IDs are rejected as a group. */
export function readLegacyExpenses(headers: readonly string[], rows: readonly (readonly unknown[])[]): LegacyExpenseResult {
  const required = ["Date", "Total", "Currency", "Receipt ID"] as const;
  const indices = required.map((header) => headers.indexOf(header));
  if (indices.some((index, i) => index < 0 || headers.lastIndexOf(required[i]) !== index)) {
    throw new Error("Missing or duplicate required personal-expense headers");
  }
  const [dateIndex, totalIndex, currencyIndex, idIndex] = indices;
  const groups = new Map<string, { candidate: LegacyExpenseCandidate | null; rows: number[] }>();
  const rejectedRows: number[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const id = row[idIndex];
    if (typeof id !== "string" || id.trim() === "") {
      rejectedRows.push(i + 2);
      continue;
    }
    const candidate = readCandidate(id, row[dateIndex], row[totalIndex], row[currencyIndex]);
    const existing = groups.get(id);
    if (!existing) {
      groups.set(id, { candidate, rows: [i + 2] });
    } else {
      existing.rows.push(i + 2);
      if (!candidate || !existing.candidate || candidate.occurredOn !== existing.candidate.occurredOn ||
          candidate.amount.currency !== existing.candidate.amount.currency || candidate.amount.minor !== existing.candidate.amount.minor) {
        existing.candidate = null;
      }
    }
  }

  const candidates: LegacyExpenseCandidate[] = [];
  for (const group of groups.values()) {
    if (group.candidate) candidates.push(group.candidate);
    else rejectedRows.push(...group.rows);
  }
  rejectedRows.sort((a, b) => a - b);
  return { candidates, rejectedRows };
}

function readCandidate(id: string, date: unknown, total: unknown, currency: unknown): LegacyExpenseCandidate | null {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) return null;
  if (currency !== "IDR" && currency !== "AUD") return null;
  if (typeof total === "number" && (!Number.isFinite(total) || (Number.isInteger(total) && !Number.isSafeInteger(total)))) return null;
  if (typeof total !== "string" && typeof total !== "number") return null;
  const text = String(total);
  const match = /^(0|[1-9]\d*)(?:\.(\d+))?$/.exec(text);
  if (!match || match[0] !== text) return null;
  const scale = currency === "AUD" ? 2 : 0;
  const fraction = match[2] ?? "";
  if (fraction.length > scale) return null;
  const minor = (match[1] + fraction.padEnd(scale, "0")).replace(/^0+(?=\d)/, "");
  return { receiptId: id, occurredOn: date as ISODate, amount: { currency, minor } };
}
