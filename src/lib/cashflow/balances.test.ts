import test from "node:test";
import assert from "node:assert/strict";
import { projectBalances } from "./balances";
import type { OpeningAccount, TransferMovement } from "./balances";
import type { Account, LedgerEntry, Money } from "./model";

function money(currency: string, minor: string): Money { return { currency, minor }; }
function account(id: string, currency: string, everyday: boolean, opening: string | null): OpeningAccount {
  const value: Account = { id, label: id, currency, kind: everyday ? "bank" : "savings", includedInEverydayBalance: everyday };
  return { account: value, openingBalance: opening === null ? null : money(currency, opening) };
}
function entry(id: string, kind: "income" | "expense", accountId: string, minor: string, syncState: LedgerEntry["syncState"] = "sheet_committed"): LedgerEntry {
  return { id, kind, accountId, amount: money("IDR", minor), occurredOn: "2026-01-02", createdAt: "2026-01-02T00:00:00Z", idempotencyKey: id, syncState };
}
function transfer(id: string, fromAccountId: string, toAccountId: string, minor: string): TransferMovement {
  return { syncState: "sheet_committed", transfer: { id, fromAccountId, toAccountId, amount: money("IDR", minor), occurredOn: "2026-01-02", idempotencyKey: id } };
}

test("income, expense, savings and everyday transfers preserve accounting balances", () => {
  const result = projectBalances(
    [account("bank", "IDR", true, "1000000"), account("wallet", "IDR", true, "50000"), account("savings", "IDR", false, "20000")],
    [entry("expense", "expense", "bank", "42000"), entry("income", "income", "bank", "10000")],
    [transfer("save", "bank", "savings", "300000"), transfer("move", "bank", "wallet", "100000")],
  );
  assert.deepEqual(result.accounts.map(({ minor }) => minor), ["568000", "150000", "320000"]);
  assert.deepEqual(result.everydayBalances, [{ currency: "IDR", minor: "718000" }]);
});

test("pending movements are excluded and unknown opening balances stay unknown", () => {
  const pendingTransfer = { ...transfer("pending-transfer", "bank", "savings", "200"), syncState: "local_pending" as const };
  const result = projectBalances(
    [account("bank", "IDR", true, "900719925474099300000"), account("unknown", "IDR", true, null), account("savings", "IDR", false, "300"), account("aud", "AUD", true, "5000")],
    [entry("pending", "expense", "bank", "100", "server_accepted"), entry("committed", "expense", "bank", "1")],
    [pendingTransfer],
  );
  assert.deepEqual(result.accounts.map(({ minor }) => minor), ["900719925474099299999", null, "300", "5000"]);
  assert.deepEqual(result.everydayBalances, [{ currency: "IDR", minor: null }, { currency: "AUD", minor: "5000" }]);
});

test("invalid, duplicate, cross-currency or unsupported movements fail closed", () => {
  const opening = [account("bank", "IDR", true, "100"), account("aud", "AUD", true, "100")];
  assert.throws(() => projectBalances(opening, [entry("x", "expense", "missing", "1")], []));
  assert.throws(() => projectBalances(opening, [entry("x", "expense", "bank", "-1")], []));
  assert.throws(() => projectBalances(opening, [entry("x", "expense", "bank", "1"), entry("x", "income", "bank", "1")], []));
  assert.throws(() => projectBalances(opening, [{ ...entry("x", "expense", "bank", "1"), correctionOf: "old" }], []));
  assert.throws(() => projectBalances(opening, [], [transfer("x", "bank", "aud", "1")]));
  assert.throws(() => projectBalances(opening, [], [transfer("x", "bank", "bank", "1")]));
});
