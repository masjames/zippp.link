import { test } from "node:test";
import assert from "node:assert/strict";
import { paddleClientConfig, type PaddleConfig } from "./paddle";

test("Paddle browser config excludes API-only credentials", () => {
  const config: PaddleConfig = {
    clientToken: "public-client-token",
    priceId: "public-price-id",
    planPriceId: "server-plan-id",
    apiKey: "server-only-value",
    env: "sandbox",
    credits: 100,
    usd: 9,
  };

  assert.deepEqual(paddleClientConfig(config), {
    clientToken: "public-client-token",
    priceId: "public-price-id",
    env: "sandbox",
    credits: 100,
    usd: 9,
  });
});
