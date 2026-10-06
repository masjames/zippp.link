import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeNumber, verifyReceipt } from "./verify-receipt.ts";
import type { RawReceipt } from "@/types/receipt";

function raw(partial: Partial<RawReceipt>): RawReceipt {
    return {
        refusal: null,
        merchant: null,
        date: null,
        currency: null,
        line_items: [],
        subtotal: null,
        tax: null,
        total: null,
        ...partial,
    };
}

function reasons(result: ReturnType<typeof verifyReceipt>): string[] {
    return result.flags.map((flag) => `${flag.path}:${flag.reason}`);
}

test("normalizeNumber handles Indonesian and English formats", () => {
    assert.equal(normalizeNumber("15.000"), 15000);
    assert.equal(normalizeNumber("15.000,50"), 15000.5);
    assert.equal(normalizeNumber("15,000.00"), 15000);
    assert.equal(normalizeNumber("1.234.567"), 1234567);
    assert.equal(normalizeNumber("1,234,567"), 1234567);
    assert.equal(normalizeNumber("Rp 15.000"), 15000);
    assert.equal(normalizeNumber("Rp15.000"), 15000);
    assert.equal(normalizeNumber("15.000,-"), 15000);
    assert.equal(normalizeNumber("15.000-"), 15000);
    assert.equal(normalizeNumber("-2.500"), -2500);
    assert.equal(normalizeNumber("abc"), null);
});

test("digit swap 0/8 is nulled and flagged", () => {
    const result = verifyReceipt(
        raw({ total: 15008, total_source: 0 }),
        { tokens: ["Total 15.000"], rows: ["[0] Total 15.000"] }
    );
    assert.equal(result.receipt.total, null);
    assert.ok(reasons(result).includes("total:not_in_ocr"));
});

test("digit swap 1/7 is nulled and flagged", () => {
    const result = verifyReceipt(
        raw({
            line_items: [
                { description: "Item", qty: 1, unit_price: 1100, amount: 1100, source: 0 },
            ],
        }),
        { tokens: ["Item | 1 | 1.700 | 1.700"], rows: ["[0] Item | 1 | 1.700 | 1.700"] }
    );
    assert.equal(result.receipt.line_items[0].amount, null);
    assert.ok(reasons(result).includes("line_items[0].amount:not_in_ocr"));
});

test("digit swap 5/6 is nulled and flagged", () => {
    const result = verifyReceipt(
        raw({ total: 6500, total_source: 0 }),
        { tokens: ["Total 5.600"], rows: ["[0] Total 5.600"] }
    );
    assert.equal(result.receipt.total, null);
    assert.ok(reasons(result).includes("total:not_in_ocr"));
});

test("a wrong total is flagged but the grounded value is kept", () => {
    const result = verifyReceipt(
        raw({
            line_items: [
                { description: "A", qty: 1, unit_price: 10000, amount: 10000, source: 0 },
                { description: "B", qty: 1, unit_price: 20000, amount: 20000, source: 1 },
            ],
            subtotal: 30000,
            subtotal_source: 2,
            total: 35000,
            total_source: 3,
        }),
        {
            tokens: ["Item A 10.000", "Item B 20.000", "Subtotal 30.000", "Total 35.000"],
            rows: [
                "[0] Item A 10.000",
                "[1] Item B 20.000",
                "[2] Subtotal 30.000",
                "[3] Total 35.000",
            ],
        }
    );
    assert.equal(result.receipt.total, 35000);
    assert.ok(reasons(result).includes("total:arithmetic"));
});

test("a line where qty x unit price does not match is flagged", () => {
    const result = verifyReceipt(
        raw({
            line_items: [
                { description: "Item", qty: 2, unit_price: 5000, amount: 9000, source: 0 },
            ],
        }),
        { tokens: ["Item 2 x 5.000 = 9.000"], rows: ["[0] Item 2 x 5.000 = 9.000"] }
    );
    assert.ok(reasons(result).includes("line_items[0].amount:arithmetic"));
});

test("a missing date is flagged, not treated as a hallucination", () => {
    const result = verifyReceipt(
        raw({ merchant: "Toko Sumber", total: 15000, date: null, total_source: 0 }),
        { tokens: ["Toko Sumber", "Total 15.000"], rows: ["[0] Toko Sumber", "[1] Total 15.000"] }
    );
    assert.equal(result.receipt.date, null);
    assert.ok(reasons(result).includes("date:missing"));
    assert.ok(!reasons(result).some((r) => r === "date:not_in_ocr"));
});

test("merchant must fuzzy match an OCR row", () => {
    const ok = verifyReceipt(
        raw({ merchant: "Toko Sumber Jaya", total: 15000, total_source: 1 }),
        {
            tokens: ["TOKO SUMBER JAYA", "Total 15.000"],
            rows: ["[0] TOKO SUMBER JAYA", "[1] Total 15.000"],
        }
    );
    assert.equal(ok.receipt.merchant, "Toko Sumber Jaya");
    assert.ok(!reasons(ok).includes("merchant:not_in_ocr"));

    const bad = verifyReceipt(
        raw({ merchant: "Warung Padang", total: 15000, total_source: 1 }),
        {
            tokens: ["TOKO SUMBER JAYA", "Total 15.000"],
            rows: ["[0] TOKO SUMBER JAYA", "[1] Total 15.000"],
        }
    );
    assert.equal(bad.receipt.merchant, null);
    assert.ok(reasons(bad).includes("merchant:not_in_ocr"));
});

test("a mismatched source row is flagged, the value is kept", () => {
    const result = verifyReceipt(
        raw({ total: 15000, total_source: 1 }),
        {
            tokens: ["Total 15.000", "Kasir"],
            rows: ["[0] Total 15.000", "[1] Kasir"],
        }
    );
    assert.equal(result.receipt.total, 15000);
    assert.ok(reasons(result).includes("total:row_mismatch"));
});

test("a low OCR score flags the field", () => {
    const result = verifyReceipt(
        raw({ total: 15000, total_source: 0 }),
        { tokens: ["Total 15.000"], scores: [0.5], rows: ["[0] Total 15.000"] }
    );
    assert.equal(result.receipt.total, 15000);
    assert.ok(reasons(result).includes("total:low_confidence"));
});

test("without OCR everything present is flagged ungrounded, not nulled", () => {
    const result = verifyReceipt(
        raw({ merchant: "Toko", total: 15000 }),
        { tokens: [] }
    );
    assert.equal(result.receipt.total, 15000);
    assert.ok(reasons(result).includes("total:ungrounded"));
    assert.ok(reasons(result).includes("merchant:ungrounded"));
});

test("a fully grounded receipt has no flags", () => {
    const result = verifyReceipt(
        raw({
            merchant: "Toko Sumber",
            date: "2026-10-06",
            line_items: [
                { description: "A", qty: 1, unit_price: 10000, amount: 10000, source: 2 },
            ],
            subtotal: 10000,
            subtotal_source: 3,
            total: 10000,
            total_source: 4,
        }),
        {
            tokens: ["Toko Sumber", "06/10/2026", "Item A | 1 | 10.000 | 10.000", "Subtotal 10.000", "Total 10.000"],
            rows: [
                "[0] Toko Sumber",
                "[1] 06/10/2026",
                "[2] Item A | 1 | 10.000 | 10.000",
                "[3] Subtotal 10.000",
                "[4] Total 10.000",
            ],
        }
    );
    assert.deepEqual(result.flags, []);
});
