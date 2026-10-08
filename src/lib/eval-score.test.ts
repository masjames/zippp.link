import { test } from "node:test";
import assert from "node:assert/strict";
import { addScore, emptyTotals, scoreCase } from "./eval-score.ts";
import type { Receipt } from "@/types/receipt";

function receipt(partial: Partial<Receipt>): Receipt {
    return {
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

test("a correct receipt has nothing wrong and unflagged", () => {
    const score = scoreCase(
        {
            file: "a.jpg",
            merchant: "Toko Sumber",
            date: "2026-10-06",
            total: 10000,
            items: [{ description: "Item A", amount: 10000 }],
        },
        receipt({
            merchant: "Toko Sumber",
            date: "2026-10-06",
            total: 10000,
            line_items: [
                { description: "Item A", qty: 1, unit_price: 10000, amount: 10000 },
            ],
        })
    );
    assert.equal(score.wrongUnflagged, 0);
    assert.deepEqual(score.misses, []);
});

test("a wrong value that was flagged is not counted", () => {
    const score = scoreCase(
        { file: "a.jpg", total: 20000 },
        receipt({
            total: 10000,
            flags: [{ path: "total", reason: "arithmetic" }],
        })
    );
    assert.equal(score.total, false);
    assert.equal(score.wrongUnflagged, 0);
});

test("a wrong value that was not flagged is counted", () => {
    const score = scoreCase(
        { file: "a.jpg", total: 20000 },
        receipt({ total: 10000 })
    );
    assert.equal(score.wrongUnflagged, 1);
    assert.deepEqual(score.misses, ["total"]);
});

test("a wrong merchant is counted when unflagged", () => {
    const score = scoreCase(
        { file: "a.jpg", merchant: "Toko Sumber" },
        receipt({ merchant: "Warung Padang" })
    );
    assert.equal(score.wrongUnflagged, 1);
    assert.deepEqual(score.misses, ["merchant"]);
});

test("item amounts are scored per position", () => {
    const score = scoreCase(
        {
            file: "a.jpg",
            items: [{ amount: 10000 }, { amount: 20000 }],
        },
        receipt({
            line_items: [
                { description: null, qty: null, unit_price: null, amount: 10000 },
                { description: null, qty: null, unit_price: null, amount: 99999 },
            ],
            flags: [{ path: "line_items[1].amount", reason: "arithmetic" }],
        })
    );
    assert.deepEqual(score.itemAmount, [true, false]);
    assert.equal(score.wrongUnflagged, 0);
});

test("totals aggregate cases and wrong counts", () => {
    const totals = emptyTotals();
    addScore(
        totals,
        scoreCase({ file: "a.jpg", total: 1 }, receipt({ total: 1 }))
    );
    addScore(
        totals,
        scoreCase({ file: "b.jpg", total: 2 }, receipt({ total: 3 }))
    );
    assert.equal(totals.total.correct, 1);
    assert.equal(totals.total.total, 2);
    assert.equal(totals.wrongUnflagged, 1);
    assert.equal(totals.cases, 2);
});
