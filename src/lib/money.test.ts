import test from "node:test";
import assert from "node:assert/strict";
import { parseMoney } from "./money";

test("parseMoney parses basic numbers and numeric types", () => {
    assert.equal(parseMoney(1234), 1234);
    assert.equal(parseMoney(0), 0);
    assert.equal(parseMoney(-50.5), -50.5);
    assert.equal(parseMoney(null), null);
    assert.equal(parseMoney(undefined), null);
    assert.equal(parseMoney(""), null);
    assert.equal(parseMoney("   "), null);
});

test("parseMoney parses Indonesian format with dots as thousand separator", () => {
    assert.equal(parseMoney("12.500"), 12500);
    assert.equal(parseMoney("12.500,50"), 12500.5);
    assert.equal(parseMoney("1.234.567,89"), 1234567.89);
    assert.equal(parseMoney("Rp 12.500"), 12500);
    assert.equal(parseMoney("Rp. 12.500,00"), 12500);
    assert.equal(parseMoney("IDR 50.000"), 50000);
});

test("parseMoney parses US/English format with commas as thousand separator", () => {
    assert.equal(parseMoney("12,500.50"), 12500.5);
    assert.equal(parseMoney("1,234,567.89"), 1234567.89);
    assert.equal(parseMoney("$ 1,500.00"), 1500);
});

test("parseMoney parses decimals without thousands separator", () => {
    assert.equal(parseMoney("12.5"), 12.5);
    assert.equal(parseMoney("12,5"), 12.5);
    assert.equal(parseMoney("0,75"), 0.75);
});

test("parseMoney handles negative amounts, brackets, and bank notations", () => {
    assert.equal(parseMoney("(1.000)"), -1000);
    assert.equal(parseMoney("(1,234.50)"), -1234.5);
    assert.equal(parseMoney("-15.000"), -15000);
    assert.equal(parseMoney("15.000-"), -15000);
    assert.equal(parseMoney("25.000 DB"), 25000);
    assert.equal(parseMoney("25.000 CR"), 25000);
});
