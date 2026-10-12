import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCorrectionRecord, type CorrectionDraft } from "./correction-diff.ts";
import type { Receipt } from "@/types/receipt";

function receipt(partial: Partial<Receipt>): Receipt {
    return {
        merchant: null,
        date: null,
        currency: null,
        category: null,
        line_items: [],
        subtotal: null,
        tax: null,
        total: null,
        ...partial,
    };
}

function draft(partial: Partial<CorrectionDraft>): CorrectionDraft {
    return {
        merchant: "",
        date: "",
        total: "",
        lines: [],
        ...partial,
    };
}

function field(record: ReturnType<typeof buildCorrectionRecord>, path: string) {
    return record.fields.find((f) => f.path === path);
}

test("an unchanged receipt has no edits", () => {
    const record = buildCorrectionRecord({
        receipt: receipt({
            merchant: "Toko Sumber",
            total: 15000,
            line_items: [
                { description: "Beras", qty: 1, unit_price: 15000, amount: 15000 },
            ],
        }),
        draft: draft({
            merchant: "Toko Sumber",
            total: "15000",
            lines: [{ description: "Beras", qty: "1", amount: "15000" }],
        }),
        runId: "run-1",
    });
    assert.equal(record.countChanged, false);
    assert.equal(record.fields.every((f) => !f.edited), true);
});

test("a changed total is recorded as edited", () => {
    const record = buildCorrectionRecord({
        receipt: receipt({ total: 15000 }),
        draft: draft({ total: "16000" }),
        runId: null,
    });
    assert.equal(field(record, "total")?.edited, true);
    assert.equal(field(record, "total")?.flagged, false);
});

test("a wrong value that was flagged is not wrong-and-unflagged", () => {
    const record = buildCorrectionRecord({
        receipt: receipt({
            total: 15000,
            flags: [{ path: "total", reason: "not_in_ocr" }],
        }),
        draft: draft({ total: "16000" }),
        runId: null,
    });
    const total = field(record, "total");
    assert.equal(total?.edited, true);
    assert.equal(total?.flagged, true);
    assert.deepEqual(total?.reasons, ["not_in_ocr"]);
});

test("a wrong value that was not flagged is the signal we want", () => {
    const record = buildCorrectionRecord({
        receipt: receipt({ merchant: "Toko Sumber" }),
        draft: draft({ merchant: "Toko Sumber Jaya" }),
        runId: null,
    });
    const merchant = field(record, "merchant");
    assert.equal(merchant?.edited, true);
    assert.equal(merchant?.flagged, false);
});

test("an assumed date is excluded", () => {
    const record = buildCorrectionRecord({
        receipt: receipt({ date: null }),
        draft: draft({ date: "2026-10-06", dateAssumed: true }),
        runId: null,
    });
    assert.equal(field(record, "date"), undefined);
});

test("line count changes are recorded", () => {
    const record = buildCorrectionRecord({
        receipt: receipt({
            line_items: [
                { description: "A", qty: 1, unit_price: 1, amount: 1 },
            ],
        }),
        draft: draft({
            lines: [
                { description: "A", qty: "1", amount: "1" },
                { description: "B", qty: "2", amount: "2" },
            ],
        }),
        runId: null,
    });
    assert.equal(record.countChanged, true);
    assert.equal(field(record, "line_items[1].amount")?.edited, true);
});
