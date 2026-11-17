import assert from "node:assert/strict";
import test from "node:test";
import { appendDraft, checkReceiptForSend } from "../src/receipt-flow.ts";

const workspace = {
  spreadsheet_title: "Sheet",
  sheet_tab: "Expenses",
  template_id: "personal-expense",
  staff_names: [],
  outlets: [],
  default_outlet: null,
};

function receipt(overrides = {}) {
  return {
    merchant: "Merchant",
    date: null,
    currency: "IDR",
    category: null,
    line_items: [{ description: "Item", qty: 1, unit_price: 10, amount: 10 }],
    subtotal: 10,
    tax: null,
    total: 10,
    ...overrides,
  };
}

function draft(overrides = {}) {
  return {
    merchant: "Merchant",
    date: "",
    currency: "IDR",
    category: "",
    staff: "",
    outlet: "",
    subtotal: "10",
    tax: "",
    total: "10",
    lines: [{ description: "Item", qty: "1", unitPrice: "10", amount: "10" }],
    ...overrides,
  };
}

test("a complete reviewed receipt is sendable", () => {
  assert.equal(checkReceiptForSend(receipt(), draft(), workspace).canSend, true);
});

test("a receipt without line items and a price is not sendable", () => {
  const result = checkReceiptForSend(
    receipt({ line_items: [], total: null }),
    draft({ lines: [], total: "" }),
    workspace,
  );
  assert.equal(result.noLines, true);
  assert.equal(result.noPrice, true);
  assert.equal(result.canSend, false);
});

test("a required outlet blocks sending until it is selected", () => {
  const multiOutletWorkspace = { ...workspace, outlets: ["North", "South"] };
  assert.equal(checkReceiptForSend(receipt(), draft(), multiOutletWorkspace).noOutlet, true);
  assert.equal(
    checkReceiptForSend(receipt(), draft({ outlet: "North" }), multiOutletWorkspace).canSend,
    true,
  );
});

test("hard extraction flags require an edit or explicit acknowledgement", () => {
  const flaggedReceipt = receipt({
    total: null,
    flags: [{ path: "total", reason: "missing" }],
  });
  assert.equal(checkReceiptForSend(flaggedReceipt, draft({ total: "" }), workspace).hardFlagsBlocked, true);
  assert.equal(checkReceiptForSend(flaggedReceipt, draft({ total: "10" }), workspace).canSend, true);
  assert.equal(checkReceiptForSend(flaggedReceipt, draft({ total: "", acknowledged: true }), workspace).canSend, true);
});

test("append cannot run before the user checks the receipt", async () => {
  let requests = 0;
  const result = await appendDraft("", "", null, false, async () => {
    requests += 1;
    throw new Error("unexpected request");
  });
  assert.deepEqual(result, { kind: "notChecked" });
  assert.equal(requests, 0);
});
