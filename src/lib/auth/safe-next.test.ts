import { test } from "node:test";
import assert from "node:assert/strict";
import { safeNextPath } from "./safe-next";

const BASE = "https://www.zippp.link/api/auth/login";

test("keeps a same-origin path with its query", () => {
  assert.equal(
    safeNextPath("/join?code=abc123", BASE),
    "/join?code=abc123"
  );
  assert.equal(
    safeNextPath("/app/settings/space", BASE),
    "/app/settings/space"
  );
});

test("rejects absolute, protocol-relative, and backslash URLs", () => {
  assert.equal(safeNextPath("https://evil.example", BASE), null);
  assert.equal(safeNextPath("//evil.example", BASE), null);
  assert.equal(safeNextPath("/\\evil.example", BASE), null);
  assert.equal(safeNextPath("\\evil.example", BASE), null);
});

test("rejects API routes, empty values, and oversized input", () => {
  assert.equal(safeNextPath("/api/spaces", BASE), null);
  assert.equal(safeNextPath("", BASE), null);
  assert.equal(safeNextPath(null, BASE), null);
  assert.equal(safeNextPath(`/${"a".repeat(513)}`, BASE), null);
});
