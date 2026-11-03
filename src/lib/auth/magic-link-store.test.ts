import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createMagicLink,
  consumeMagicLink,
  normalizeEmail,
} from "./magic-link-store";

test("magic link email is normalized", () => {
  assert.equal(normalizeEmail("  A@B.COM "), "a@b.com");
});

test("magic link token is single-use", async () => {
  const created = await createMagicLink({
    userId: "user-1",
    email: "a@b.com",
    clientIp: "127.0.0.1",
  });
  assert.equal(created.ok, true);
  if (!created.ok) return;

  const first = await consumeMagicLink(created.token, "127.0.0.1");
  assert.equal(first.ok, true);
  if (first.ok) {
    assert.equal(first.data.userId, "user-1");
    assert.equal(first.data.email, "a@b.com");
  }

  const second = await consumeMagicLink(created.token, "127.0.0.1");
  assert.equal(second.ok, false);
});
