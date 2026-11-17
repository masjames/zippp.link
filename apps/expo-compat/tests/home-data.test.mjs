import assert from "node:assert/strict";
import test from "node:test";
import { loadHomeData } from "../src/home-data.ts";

function response(status, body) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

const summary = {
  today: "2026-11-16",
  weekStart: "2026-11-16",
  partial: true,
  todayTotals: [{ currency: "IDR", minor: "42000" }],
  weekTotals: [{ currency: "IDR", minor: "42000" }],
  latest: [],
};

test("a server local-preview identity is treated as signed out", async () => {
  const requests = [];
  const state = await loadHomeData(async (url) => {
    requests.push(url);
    return response(200, { signedIn: true, userId: "local-preview-user", localPreview: true });
  }, "Asia/Jakarta");

  assert.deepEqual(state, { kind: "signedOut" });
  assert.deepEqual(requests, ["/api/auth/session"]);
});

test("real web sessions use the server user id and separate read-only endpoints", async () => {
  const requests = [];
  const state = await loadHomeData(async (url, init) => {
    requests.push({ url, init });
    if (url === "/api/auth/session") return response(200, { signedIn: true, userId: "user-a" });
    if (url === "/api/sheets/workspace") {
      return response(200, { ok: true, workspace: { template_id: "personal-expense", spreadsheet_title: "My receipts" } });
    }
    return response(200, { ok: true, summary });
  }, "Australia/Sydney");

  assert.equal(state.kind, "ready");
  assert.equal(state.workspaceTitle, "My receipts");
  assert.equal(state.summary.partial, true);
  assert.deepEqual(requests.map(({ url }) => url.split("?")[0]), [
    "/api/auth/session",
    "/api/sheets/workspace",
    "/api/cashflow/legacy-summary",
  ]);
  const query = new URLSearchParams(requests[2].url.split("?")[1]);
  assert.equal(query.get("expectedUserId"), "user-a");
  assert.equal(query.get("timeZone"), "Australia/Sydney");
  assert.ok(requests.every(({ init }) => init.cache === "no-store"));
});

test("a missing workspace does not request a summary", async () => {
  const requests = [];
  const state = await loadHomeData(async (url) => {
    requests.push(url);
    if (url === "/api/auth/session") return response(200, { signedIn: true, userId: "user-a" });
    return response(404, { ok: false, workspace: null });
  }, "Asia/Jakarta");

  assert.deepEqual(state, { kind: "noWorkspace" });
  assert.deepEqual(requests, ["/api/auth/session", "/api/sheets/workspace"]);
});

test("an unsupported template is rejected before summary fetch", async () => {
  const requests = [];
  const state = await loadHomeData(async (url) => {
    requests.push(url);
    if (url === "/api/auth/session") return response(200, { signedIn: true, userId: "user-a" });
    return response(200, { ok: true, workspace: { template_id: "sales-recap", spreadsheet_title: "Sales" } });
  }, "Asia/Jakarta");

  assert.deepEqual(state, { kind: "unsupported" });
  assert.deepEqual(requests, ["/api/auth/session", "/api/sheets/workspace"]);
});
