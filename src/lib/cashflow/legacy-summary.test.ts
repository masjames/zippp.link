import test from "node:test";
import assert from "node:assert/strict";
import { dateInTimeZone, summarizeLegacyReceipts } from "./legacy-summary";
import { formatCurrencyTotal } from "./format";

const mapping = { date: "Purchased", total: "Grand total", currency: "Currency", receipt_id: "Scan" };
const headers = ["Purchased", "Grand total", "Currency", "Scan"];

test("groups receipt lines once, keeps currencies separate, and marks incomplete rows", () => {
    const result = summarizeLegacyReceipts([
        headers,
        ["2026-01-05", 42000, "IDR", "receipt-a"],
        ["2026-01-05", 42000, "IDR", "receipt-a"],
        ["2026-01-04", "12.50", "AUD", "receipt-b"],
        ["2026-01-06", 10, "IDR", "future"],
        ["2026-01-05", 10, "IDR", ""],
    ], mapping, "2026-01-05");
    assert.equal(result.weekStart, "2026-01-05");
    assert.equal(result.partial, true);
    assert.deepEqual(result.todayTotals, [{ currency: "IDR", minor: "42000" }, { currency: "AUD", minor: "0" }]);
    assert.deepEqual(result.weekTotals, result.todayTotals);
    assert.deepEqual(result.latest.map((item) => item.receiptId), ["receipt-a", "receipt-b"]);
});

test("converts Sheets date serials and preserves large integer amounts", () => {
    const serial = (Date.UTC(2026, 0, 5) - Date.UTC(1899, 11, 30)) / (24 * 60 * 60 * 1000);
    const result = summarizeLegacyReceipts([headers, [serial, "900719925474099300001", "IDR", "large"]], mapping, "2026-01-05");
    assert.equal(result.partial, false);
    assert.equal(result.latest[0].occurredOn, "2026-01-05");
    assert.deepEqual(result.todayTotals, [{ currency: "IDR", minor: "900719925474099300001" }]);
});

test("rejects conflicting receipt groups and ambiguous column mappings", () => {
    const result = summarizeLegacyReceipts([headers, ["2026-01-05", 10, "IDR", "a"], ["2026-01-05", 11, "IDR", "a"]], mapping, "2026-01-05");
    assert.equal(result.partial, true);
    assert.deepEqual(result.latest, []);
    assert.throws(() => summarizeLegacyReceipts([headers], { ...mapping, total: "Scan" }, "2026-01-05"));
    assert.throws(() => summarizeLegacyReceipts([[...headers, "Scan"]], mapping, "2026-01-05"));
});

test("uses the requested time zone and rejects invalid dates", () => {
    const now = new Date("2026-01-05T14:00:00Z");
    assert.equal(dateInTimeZone(now, "Australia/Sydney"), "2026-01-06");
    assert.equal(dateInTimeZone(now, "Asia/Jakarta"), "2026-01-05");
    assert.throws(() => dateInTimeZone(now, "Not/A_Timezone"));
    assert.throws(() => summarizeLegacyReceipts([headers], mapping, "2026-02-30"));
});

test("formats minor units without losing large amounts or AUD cents", () => {
    assert.match(formatCurrencyTotal({ currency: "IDR", minor: "900719925474099300001" }, "id-ID"), /900\.719\.925\.474\.099\.300\.001/);
    assert.match(formatCurrencyTotal({ currency: "AUD", minor: "4250" }, "en-AU"), /42\.50/);
    assert.throws(() => formatCurrencyTotal({ currency: "USD", minor: "1" }, "en-US"));
});
