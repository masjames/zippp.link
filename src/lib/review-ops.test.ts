import { test } from "node:test";
import assert from "node:assert/strict";
import {
    acceptBlocked,
    opsFor,
    outletMissing,
    unresolvedHardFlags,
} from "./review-ops.ts";
import { toDraft } from "@/components/app/draft";
import type { Receipt } from "@/types/receipt";

function receipt(partial: Partial<Receipt>): Receipt {
    return {
        merchant: "Toko A",
        date: "2026-11-01",
        currency: "IDR",
        category: null,
        line_items: [
            { description: "Kopi", qty: 1, unit_price: 15000, amount: 15000 },
        ],
        subtotal: 15000,
        tax: null,
        total: 15000,
        ...partial,
    };
}

test("ops fields follow the template", () => {
    assert.deepEqual(
        [opsFor("resto-inventory").staff, opsFor("resto-inventory").outlet],
        [true, true]
    );
    assert.equal(opsFor("personal-expense").payment, true);
    assert.equal(opsFor("sales-recap").customer, true);
    assert.equal(opsFor("reimbursement").purpose, true);
    assert.equal(opsFor("custom").payment, false);
    assert.equal(opsFor(undefined).staff, false);
});

test("a hard flag blocks accept", () => {
    const r = receipt({ flags: [{ path: "total", reason: "arithmetic" }] });
    assert.equal(acceptBlocked(r, toDraft(r)), true);
});

test("a soft flag does not block", () => {
    const r = receipt({ flags: [{ path: "total", reason: "low_confidence" }] });
    assert.equal(acceptBlocked(r, toDraft(r)), false);
});

test("editing the flagged field clears the block", () => {
    const r = receipt({ flags: [{ path: "total", reason: "ungrounded" }] });
    const d = { ...toDraft(r), total: "16000" };
    assert.equal(unresolvedHardFlags(r, d).length, 0);
    assert.equal(acceptBlocked(r, d), false);
});

test("editing a different field keeps the block", () => {
    const r = receipt({ flags: [{ path: "total", reason: "ungrounded" }] });
    const d = { ...toDraft(r), merchant: "Toko B" };
    assert.equal(acceptBlocked(r, d), true);
});

test("acknowledge clears the block", () => {
    const r = receipt({ flags: [{ path: "total", reason: "missing" }] });
    const d = { ...toDraft(r), acknowledged: true };
    assert.equal(acceptBlocked(r, d), false);
});

test("line item flags resolve on the matching line field", () => {
    const r = receipt({
        flags: [{ path: "line_items[0].amount", reason: "not_in_ocr" }],
    });
    const d = toDraft(r);
    d.lines[0] = { ...d.lines[0], amount: "14000" };
    assert.equal(acceptBlocked(r, d), false);
});

test("outlet is required with several outlets and no default", () => {
    assert.equal(outletMissing(["A", "B"], null, ""), true);
    assert.equal(outletMissing(["A", "B"], "A", ""), false);
    assert.equal(outletMissing(["A", "B"], null, "B"), false);
    assert.equal(outletMissing(["A"], null, ""), false);
});
