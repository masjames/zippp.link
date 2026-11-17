import assert from "node:assert/strict";
import test from "node:test";
import {
  addDemoAccount, addDemoBill, addDemoTransaction, approveDemoReceipt, captureDemoReceipt,
  contributeToDemoGoal, createDemoState, editDemoReceipt, editDemoTransaction, payDemoBill,
  resetDemoState, reverseDemoTransaction, saveDemoCheckIn, saveDemoCoachingChoice,
  setDemoCycleDay, toggleDemoSetting, transferDemoMoney, updateDemoGoal,
} from "../src/demo-api.ts";

test("accounts, expenses, income, edits and reversals balance correctly", () => {
  const initial = createDemoState();
  const withAccount = addDemoAccount(initial, { name: "Travel cash", kind: "cash", balance: 200000 });
  assert.equal(withAccount.accounts.length, initial.accounts.length + 1);
  const afterExpense = addDemoTransaction(withAccount, { title: "Sample", category: "Food", amount: 25000, kind: "expense", accountId: "daily" });
  assert.equal(afterExpense.accounts[0].balance, initial.accounts[0].balance - 25000);
  const afterIncome = addDemoTransaction(afterExpense, { title: "Sample pay", category: "Income", amount: 40000, kind: "income", accountId: "daily" });
  assert.equal(afterIncome.accounts[0].balance, initial.accounts[0].balance + 15000);
  const edited = editDemoTransaction(afterIncome, "tx-1", { title: "Updated groceries", category: "Food", amount: 100000, accountId: "cash" });
  assert.equal(edited.accounts[0].balance, afterIncome.accounts[0].balance + 145000);
  assert.equal(edited.accounts[1].balance, afterIncome.accounts[1].balance - 100000);
  assert.equal(edited.transactions[0].title, "Sample pay");
  const reversed = reverseDemoTransaction(edited, "tx-1");
  assert.equal(reversed.accounts[1].balance, edited.accounts[1].balance + 100000);
  assert.equal(reversed.transactions.some((item) => item.id === "tx-1"), false);
  assert.equal(initial.transactions.length, 3);
  const afterRemovingOldest = reverseDemoTransaction(initial, "tx-1");
  const afterAddingAgain = addDemoTransaction(afterRemovingOldest, { title: "New sample", category: "Food", amount: 10000, kind: "expense", accountId: "daily" });
  assert.equal(new Set(afterAddingAgain.transactions.map((item) => item.id)).size, afterAddingAgain.transactions.length);
});

test("captured receipt is editable and pending until approval adds its expense", () => {
  const captured = captureDemoReceipt(createDemoState(), { title: "Sample market", amount: 72500, date: "Today", accountId: "daily" });
  const receipt = captured.receipts[0];
  assert.equal(receipt.status, "pending");
  assert.equal(captured.transactions.length, 3);
  const edited = editDemoReceipt(captured, receipt.id, { title: "Market corrected", amount: 70000, date: "Nov 24", accountId: "cash" });
  assert.equal(edited.receipts[0].amount, 70000);
  assert.equal(edited.transactions.length, 3);
  const approved = approveDemoReceipt(edited, receipt.id);
  assert.equal(approved.receipts[0].status, "approved");
  assert.equal(approved.transactions.length, 4);
  assert.equal(approved.accounts[1].balance, edited.accounts[1].balance - 70000);
  assert.equal(approveDemoReceipt(approved, receipt.id), approved);
});

test("bills only become expenses after explicit payment; savings and account transfers stay internal", () => {
  const initial = createDemoState();
  const withBill = addDemoBill(initial, { title: "Water", amount: 120000, date: "Dec 02", recurring: false, reminder: true });
  assert.equal(withBill.bills[0].paid, false);
  assert.equal(withBill.transactions.length, initial.transactions.length);
  const paid = payDemoBill(withBill, withBill.bills[0].id, "daily");
  assert.equal(paid.bills[0].paid, true);
  assert.equal(paid.transactions.length, initial.transactions.length + 1);
  assert.equal(paid.accounts[0].balance, initial.accounts[0].balance - 120000);
  const transferred = transferDemoMoney(paid, "daily", "cash", 50000);
  assert.equal(transferred.accounts[0].balance, paid.accounts[0].balance - 50000);
  assert.equal(transferred.accounts[1].balance, paid.accounts[1].balance + 50000);
  assert.equal(transferred.transactions.length, paid.transactions.length + 1);
  assert.equal(transferred.transactions[0].kind, "transfer");
  const reversed = reverseDemoTransaction(transferred, transferred.transactions[0].id);
  assert.equal(reversed.accounts[0].balance, paid.accounts[0].balance);
  assert.equal(reversed.accounts[1].balance, paid.accounts[1].balance);
  const withGoal = contributeToDemoGoal(transferred, 25000);
  assert.equal(withGoal.goal.saved, initial.goal.saved + 25000);
  assert.equal(withGoal.accounts[0].balance, transferred.accounts[0].balance - 25000);
  assert.equal(withGoal.accounts[2].balance, transferred.accounts[2].balance + 25000);
  assert.equal(withGoal.transactions.length, transferred.transactions.length);
});

test("goal, cycle, settings, coaching and check-ins update demo state", () => {
  const initial = createDemoState();
  const goal = updateDemoGoal(initial, { name: "New goal", target: 4000000 });
  assert.deepEqual(goal.goal, { name: "New goal", target: 4000000, saved: initial.goal.saved });
  const withCycle = setDemoCycleDay(goal, 18);
  const withSettings = toggleDemoSetting(withCycle, "notifications");
  assert.equal(withSettings.settings.notifications, false);
  const withCoachingSetting = toggleDemoSetting(withSettings, "coaching");
  const withChoice = saveDemoCoachingChoice(withCoachingSetting, "helpful");
  const checkedIn = saveDemoCheckIn(withChoice, "steady");
  assert.deepEqual(checkedIn.coachingChoices, ["helpful"]);
  assert.deepEqual(checkedIn.checkIns, ["steady"]);
  assert.deepEqual(initial.checkIns, []);
});

test("reset returns new in-memory defaults without retaining prior changes", () => {
  const changed = addDemoBill(captureDemoReceipt(createDemoState(), { title: "Receipt", amount: 100, date: "Today", accountId: "daily" }), { title: "Bill", amount: 200, date: "Today", recurring: false, reminder: false });
  const reset = resetDemoState();
  assert.equal(reset.bills.length, 1);
  assert.equal(reset.receipts.length, 1);
  assert.equal(reset.receipts[0].status, "pending");
  assert.equal(reset.transactions.length, 3);
  assert.notEqual(reset.accounts, changed.accounts);
});
