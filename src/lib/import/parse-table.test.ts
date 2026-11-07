import test from "node:test";
import assert from "node:assert/strict";
import {
    detectCsvDelimiter,
    parseCsvTable,
    parseTable,
    TableParseError,
    DEFAULT_LIMITS
} from "./parse-table";

test("detectCsvDelimiter correctly detects commas, semicolons, and tabs", () => {
    assert.equal(detectCsvDelimiter("date,description,amount\n2026-01-01,Coffee,25000"), ",");
    assert.equal(detectCsvDelimiter("Tanggal;Keterangan;Jumlah\n01/01/2026;Kopi;25.000"), ";");
    assert.equal(detectCsvDelimiter("date\tdescription\tamount\n2026-01-01\tCoffee\t25000"), "\t");
});

test("parseCsvTable parses standard comma-separated CSV", () => {
    const csv = Buffer.from("Date,Description,Amount\n2026-11-01,Groceries,150000\n2026-11-02,Transport,25000", "utf8");
    const result = parseCsvTable(csv, DEFAULT_LIMITS);
    assert.equal(result.format, "csv");
    assert.equal(result.delimiter, ",");
    assert.equal(result.rowCount, 3);
    assert.equal(result.colCount, 3);
    assert.deepEqual(result.rows[0], ["Date", "Description", "Amount"]);
    assert.deepEqual(result.rows[1], ["2026-11-01", "Groceries", "150000"]);
});

test("parseCsvTable handles Indonesian semicolon-delimited CSV with quotes", () => {
    const csv = Buffer.from(
        'Tanggal;Keterangan;Debit;Kredit\n01/11/2026;"Kopi Kenangan, Grand Indonesia";28.000;\n02/11/2026;Gojek;18.000;',
        "utf8"
    );
    const result = parseCsvTable(csv, DEFAULT_LIMITS);
    assert.equal(result.format, "csv");
    assert.equal(result.delimiter, ";");
    assert.equal(result.rowCount, 3);
    assert.equal(result.rows[1][1], "Kopi Kenangan, Grand Indonesia");
    assert.equal(result.rows[1][2], "28.000");
    assert.equal(result.rows[1][3], null);
});

test("parseCsvTable handles UTF-8 with BOM", () => {
    const bom = Buffer.from([0xef, 0xbb, 0xbf]);
    const text = Buffer.from("Date,Merchant,Total\n2026-11-01,Shop,50000", "utf8");
    const full = Buffer.concat([bom, text]);
    const result = parseCsvTable(full, DEFAULT_LIMITS);
    assert.equal(result.encoding, "UTF-8 BOM");
    assert.deepEqual(result.rows[0], ["Date", "Merchant", "Total"]);
});

test("parseTable rejects file exceeding maxBytes", async () => {
    const buffer = Buffer.alloc(100);
    await assert.rejects(
        async () => {
            await parseTable(buffer, "test.csv", { maxBytes: 50 });
        },
        (err: Error) => {
            assert(err instanceof TableParseError);
            assert.equal((err as TableParseError).code, "TOO_LARGE");
            return true;
        }
    );
});

test("parseTable rejects legacy binary .xls files", async () => {
    const legacyMagic = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
    await assert.rejects(
        async () => {
            await parseTable(legacyMagic, "statement.xls");
        },
        (err: Error) => {
            assert(err instanceof TableParseError);
            assert.equal((err as TableParseError).code, "UNSUPPORTED_TYPE");
            return true;
        }
    );
});

test("parseTable rejects empty files", async () => {
    await assert.rejects(
        async () => {
            await parseTable(Buffer.alloc(0), "empty.csv");
        },
        (err: Error) => {
            assert(err instanceof TableParseError);
            assert.equal((err as TableParseError).code, "EMPTY");
            return true;
        }
    );
});
