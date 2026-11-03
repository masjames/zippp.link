import { test } from "node:test";
import assert from "node:assert/strict";
import {
  __resetLedgerStoreForTests,
  archiveLedgerItem,
  createLedgerItem,
  listLedger,
  normalizeItemName,
  updateLedgerItem,
} from "./ledger-store";

function fresh(): void {
  __resetLedgerStoreForTests();
}

test("asset keeps its value and leaves the active list when archived", async () => {
  fresh();
  const asset = await createLedgerItem({
    spaceId: "space-a",
    userId: "user-1",
    kind: "asset",
    name: "  Savings  ",
    amount: 1500000.456,
    note: "  bank  ",
  });
  assert.equal(asset.name, "Savings");
  assert.equal(asset.amount, 1500000.46);
  assert.equal(asset.note, "bank");
  assert.equal(asset.progress, null);

  assert.equal((await listLedger("space-a")).length, 1);
  assert.equal(await archiveLedgerItem("space-a", asset.id), true);
  assert.equal((await listLedger("space-a")).length, 0);
  assert.equal(await archiveLedgerItem("space-a", asset.id), false);
});

test("goal defaults progress to zero and rejects a bad amount", async () => {
  fresh();
  const goal = await createLedgerItem({
    spaceId: "space-b",
    userId: "user-1",
    kind: "goal",
    name: "Emergency fund",
    amount: 10000000,
  });
  assert.equal(goal.progress, 0);

  await assert.rejects(
    createLedgerItem({
      spaceId: "space-b",
      userId: "user-1",
      kind: "goal",
      name: "Bad",
      amount: -1,
    }),
    /INVALID_AMOUNT/
  );
  await assert.rejects(
    createLedgerItem({
      spaceId: "space-b",
      userId: "user-1",
      kind: "asset",
      name: "   ",
      amount: 1,
    }),
    /INVALID_NAME/
  );
});

test("update patches only the fields it receives", async () => {
  fresh();
  const goal = await createLedgerItem({
    spaceId: "space-c",
    userId: "user-1",
    kind: "goal",
    name: "Laptop",
    amount: 20000000,
    progress: 5000000,
    note: "october",
  });

  const updated = await updateLedgerItem({
    spaceId: "space-c",
    id: goal.id,
    progress: 7500000,
  });
  assert.equal(updated?.progress, 7500000);
  assert.equal(updated?.amount, 20000000);
  assert.equal(updated?.note, "october");

  const renamed = await updateLedgerItem({
    spaceId: "space-c",
    id: goal.id,
    name: "New laptop",
  });
  assert.equal(renamed?.name, "New laptop");

  assert.equal(await updateLedgerItem({ spaceId: "space-x", id: goal.id, name: "Nope" }), null);
});

test("items are scoped to their space", async () => {
  fresh();
  await createLedgerItem({
    spaceId: "space-d",
    userId: "user-1",
    kind: "asset",
    name: "Phone",
    amount: 3000000,
  });
  assert.equal((await listLedger("space-e")).length, 0);
});

test("name normalization strips control characters and caps length", () => {
  assert.equal(normalizeItemName("  Cash\u0000  box "), "Cash box");
  assert.equal(normalizeItemName("x".repeat(120)).length, 80);
});
