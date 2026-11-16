import assert from "node:assert/strict";
import test from "node:test";
import { isCashFlowCycle, isMoney, isMoneyMinor, isReceiptDraftState } from "./model";

test("money minor units stay exact decimal integer strings", () => {
  assert.equal(isMoneyMinor("0"), true);
  assert.equal(isMoneyMinor("42000"), true);
  assert.equal(isMoneyMinor("900719925474099312345"), true);
  assert.equal(isMoneyMinor("-125"), true);
  assert.equal(isMoneyMinor("42.5"), false);
  assert.equal(isMoneyMinor("1e3"), false);
  assert.equal(isMoneyMinor("042"), false);
  assert.equal(isMoneyMinor("-0"), false);
  assert.equal(isMoneyMinor(42000), false);
});

test("Money requires a currency label and canonical minor units", () => {
  assert.equal(isMoney({ currency: "IDR", minor: "42000" }), true);
  assert.equal(isMoney({ currency: "AUD", minor: "4200" }), true);
  assert.equal(isMoney({ currency: "", minor: "42000" }), false);
  assert.equal(isMoney({ currency: "IDR", minor: 42000 }), false);
  assert.equal(isMoney(null), false);
});

test("receipt draft states are explicit and exclude unknown states", () => {
  for (const state of [
    "captured",
    "processing",
    "ready",
    "needs_attention",
    "approved_pending",
    "committed",
    "discarded",
  ]) {
    assert.equal(isReceiptDraftState(state), true, state);
  }
  assert.equal(isReceiptDraftState("approved"), false);
  assert.equal(isReceiptDraftState(null), false);
});

test("cash-flow cycles require a month day and non-empty time zone", () => {
  assert.equal(isCashFlowCycle({ startDay: 1, timezone: "UTC" }), true);
  assert.equal(isCashFlowCycle({ startDay: 31, timezone: "Australia/Sydney" }), true);
  assert.equal(isCashFlowCycle({ startDay: 0, timezone: "UTC" }), false);
  assert.equal(isCashFlowCycle({ startDay: 32, timezone: "UTC" }), false);
  assert.equal(isCashFlowCycle({ startDay: 1.5, timezone: "UTC" }), false);
  assert.equal(isCashFlowCycle({ startDay: 1, timezone: "" }), false);
  assert.equal(isCashFlowCycle({ startDay: 1, timezone: 7 }), false);
});
