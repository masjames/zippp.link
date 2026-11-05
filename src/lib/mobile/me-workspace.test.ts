import { test } from "node:test";
import assert from "node:assert/strict";
import { mobileWorkspace } from "./me-workspace.ts";
import type { WorkspaceConfig } from "@/lib/google/workspace-store";

function ws(partial: Partial<WorkspaceConfig>): WorkspaceConfig {
  return {
    google_user_id: "u1",
    spreadsheet_id: "sheet-1",
    spreadsheet_title: "Pengeluaran 2026",
    sheet_tab: "Sheet1",
    template_id: "sales-recap",
    column_map: { date: 0, total: 1 },
    constants: {},
    staff_names: ["Sonny"],
    outlets: ["Pusat"],
    default_outlet: "Pusat",
    headers: [],
    updated_at: "2026-11-05T00:00:00.000Z",
    ...partial,
  } as unknown as WorkspaceConfig;
}

test("exposes the sheet title and id", () => {
  const out = mobileWorkspace(ws({}));
  assert.equal(out.spreadsheet_title, "Pengeluaran 2026");
  assert.equal(out.spreadsheet_id, "sheet-1");
});

test("never exposes a credits field", () => {
  assert.equal("credits" in mobileWorkspace(ws({})), false);
});

test("ready needs a spreadsheet and a column map", () => {
  assert.equal(mobileWorkspace(ws({})).ready, true);
  assert.equal(mobileWorkspace(ws({ column_map: {} })).ready, false);
  assert.equal(mobileWorkspace(ws({ spreadsheet_id: "" })).ready, false);
});

test("payment options follow the template", () => {
  assert.deepEqual(mobileWorkspace(ws({})).payment_options, [
    "Cash",
    "QRIS",
    "Transfer",
  ]);
  assert.deepEqual(
    mobileWorkspace(ws({ template_id: "resto-inventory" })).payment_options,
    []
  );
});
