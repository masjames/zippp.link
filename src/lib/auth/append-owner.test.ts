import test from "node:test";
import assert from "node:assert/strict";
import { matchesAppendOwner } from "./append-owner";

test("web append requires the same authenticated account as the draft", () => {
    const user = { source: "web" as const, userId: "account-b" };
    assert.equal(matchesAppendOwner(user, "account-b"), true);
    assert.equal(matchesAppendOwner(user, "account-a"), false);
    assert.equal(matchesAppendOwner(user, undefined), false);
    assert.equal(matchesAppendOwner(user, null), false);
});

test("mobile append continues to use its authenticated bearer identity", () => {
    assert.equal(matchesAppendOwner({ source: "mobile", userId: "account-a" }, undefined), true);
});
