import test from "node:test";
import assert from "node:assert/strict";
import { PERSONAL_EXPENSE_HEADERS } from "../google/templates";
import { readLegacyExpenses } from "./legacy-expenses";

const headers = [...PERSONAL_EXPENSE_HEADERS];
function row(date: string, total: unknown, currency: string, id: string): unknown[] {
  const values: unknown[] = Array(headers.length).fill("");
  values[headers.indexOf("Date")] = date;
  values[headers.indexOf("Total")] = total;
  values[headers.indexOf("Currency")] = currency;
  values[headers.indexOf("Receipt ID")] = id;
  return values;
}

test("repeated line-item totals become one incomplete receipt candidate", () => {
  const result = readLegacyExpenses(headers, [row("2026-01-02", 42000, "IDR", "synthetic-1"), row("2026-01-02", 42000, "IDR", "synthetic-1")]);
  assert.deepEqual(result, { candidates: [{ receiptId: "synthetic-1", occurredOn: "2026-01-02", amount: { currency: "IDR", minor: "42000" } }], rejectedRows: [] });
});

test("conflicting or malformed rows reject the entire receipt group", () => {
  const result = readLegacyExpenses(headers, [row("2026-01-02", 42, "IDR", "a"), row("2026-01-02", 43, "IDR", "a"), row("2026-02-30", 1, "IDR", "b"), row("2026-01-01", 1, "IDR", "")]);
  assert.deepEqual(result, { candidates: [], rejectedRows: [2, 3, 4, 5] });
});

test("money conversion preserves safe decimal cells and rejects precision noise", () => {
  const result = readLegacyExpenses(headers, [row("2026-01-02", "42.50", "AUD", "a"), row("2026-01-02", 42.5, "AUD", "b"), row("2026-01-02", 0.1 + 0.2, "AUD", "c"), row("2026-01-02", "1.2", "IDR", "d"), row("2026-01-02", "1", "USD", "e")]);
  assert.deepEqual(result.candidates.map(({ amount }) => amount.minor), ["4250", "4250"]);
  assert.deepEqual(result.rejectedRows, [4, 5, 6]);
});

test("missing or duplicate required headers fail closed", () => {
  assert.throws(() => readLegacyExpenses(headers.filter((h) => h !== "Receipt ID"), []));
  assert.throws(() => readLegacyExpenses([...headers, "Total"], []));
});
