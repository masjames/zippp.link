import { test } from "node:test";
import assert from "node:assert/strict";
import {
  __resetPlanStoreForTests,
  activatePlan,
  cancelPlan,
  getPlanUsage,
  recordCapture,
} from "./plan";

function fresh(): void {
  __resetPlanStoreForTests();
}

test("activation stores a plan and a fresh activation is idempotent", async () => {
  fresh();
  const first = await activatePlan({ userId: "u1", subscriptionId: "sub_1" });
  const second = await activatePlan({ userId: "u1", subscriptionId: "sub_1" });
  assert.equal(second.period_start, first.period_start);
  assert.equal(second.period_end, first.period_end);

  const usage = await getPlanUsage("u1");
  assert.equal(usage?.used, 0);
  assert.equal(usage?.included, first.included);
});

test("captures increment usage and the percentage caps at 100", async () => {
  fresh();
  await activatePlan({ userId: "u2", subscriptionId: "sub_2", included: 2 });

  assert.equal((await recordCapture("u2"))?.used, 1);
  const full = await recordCapture("u2");
  assert.equal(full?.used, 2);
  assert.equal(full?.used_pct, 100);

  const over = await recordCapture("u2");
  assert.equal(over?.used, 3);
  assert.equal(over?.used_pct, 100);
});

test("a canceled plan keeps its allowance until the period ends", async () => {
  fresh();
  await activatePlan({ userId: "u3", subscriptionId: "sub_3" });
  assert.equal(await cancelPlan("sub_3"), true);
  assert.equal(await cancelPlan("missing"), false);

  const usage = await getPlanUsage("u3");
  assert.equal(usage?.status, "canceled");
  assert.ok(usage && usage.period_end > Date.now());
});

test("a plan without usage rows reports zero rather than failing", async () => {
  fresh();
  await activatePlan({ userId: "u4", subscriptionId: "sub_4" });
  const usage = await getPlanUsage("u4");
  assert.equal(usage?.used, 0);
  assert.equal(usage?.used_pct, 0);
  assert.equal(await getPlanUsage("nobody"), null);
});
