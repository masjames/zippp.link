// @implements FEAT-121
import { readSheet } from "read-excel-file/node";
import { parse as parseCsvSync } from "csv-parse/sync";

export type RawCellValue = string | number | boolean | Date | null;
export type RawRow = RawCellValue[];

export interface ParsedTable {
    rows: RawRow[];
    format: "csv" | "xlsx";
    rowCount: number;
    colCount: number;
    encoding?: string;
    delimiter?: string;
}

export interface ParseTableLimits {
    maxBytes?: number;
    maxUnzippedBytes?: number;
    maxZipEntries?: number;
    maxZipRatio?: number;
    maxRows?: number;
    maxCols?: number;
}

export const DEFAULT_LIMITS: Required<ParseTableLimits> = {
    maxBytes: 4 * 1024 * 1024, // 4 MiB (Vercel payload constraint)
    maxUnzippedBytes: 50 * 1024 * 1024, // 50 MiB uncompressed zip cap
    maxZipEntries: 200, // Maximum entries in zip container
    maxZipRatio: 100, // Maximum compression ratio
    maxRows: 2000,
    maxCols: 50,
};

export class TableParseError extends Error {
    constructor(
        public readonly code: "TOO_LARGE" | "UNSUPPORTED_TYPE" | "EMPTY" | "UNREADABLE",
        message: string
    ) {
        super(message);
        this.name = "TableParseError";
    }
}

/**
 * Detect delimiter by scanning commas, semicolons, and tabs in sample lines.
 * Indonesian Excel exports commonly use semicolon delimiter.
 */
export function detectCsvDelimiter(sampleText: string): string {
    const lines = sampleText.split(/\r?\n/).slice(0, 20).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return ",";

    let commaCount = 0;
    let semicolonCount = 0;
    let tabCount = 0;

    for (const line of lines) {
        // Count unquoted occurrences roughly
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === ",") commaCount++;
            else if (char === ";") semicolonCount++;
            else if (char === "\t") tabCount++;
        }
    }

    if (semicolonCount > commaCount && semicolonCount > tabCount) return ";";
    if (tabCount > commaCount && tabCount > semicolonCount) return "\t";
    return ",";
}

/**
 * Check zip central directory headers in an XLSX buffer for zip bombs before unzipping.
 * Standard ZIP end-of-central-directory signature is 0x06054b50.
 */
export function checkZipSafety(
    buffer: Buffer,
    limits: Pick<Required<ParseTableLimits>, "maxUnzippedBytes" | "maxZipEntries" | "maxZipRatio">
): void {
    // Magic check: PK\x03\x04
    if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4b || buffer[2] !== 0x03 || buffer[3] !== 0x04) {
        throw new TableParseError("UNREADABLE", "File is not a valid zip archive");
    }

    // Locate End of Central Directory Record (EOCD) from the end
    let eocdOffset = -1;
    const maxSearch = Math.min(buffer.length, 65536 + 22);
    for (let i = buffer.length - 22; i >= buffer.length - maxSearch; i--) {
        if (
            buffer[i] === 0x50 &&
            buffer[i + 1] === 0x4b &&
            buffer[i + 2] === 0x05 &&
            buffer[i + 3] === 0x06
        ) {
            eocdOffset = i;
            break;
        }
    }

    if (eocdOffset === -1) {
        // Could be zip64 or malformed, reject for safe bounds
        throw new TableParseError("UNREADABLE", "Cannot verify zip central directory");
    }

    const totalEntries = buffer.readUInt16LE(eocdOffset + 10);
    const cdSize = buffer.readUInt32LE(eocdOffset + 12);
    const cdOffset = buffer.readUInt32LE(eocdOffset + 16);

    if (totalEntries > limits.maxZipEntries) {
        throw new TableParseError("TOO_LARGE", `Zip contains too many entries (${totalEntries} > ${limits.maxZipEntries})`);
    }

    if (cdOffset + cdSize > buffer.length) {
        throw new TableParseError("UNREADABLE", "Corrupted zip central directory bounds");
    }

    let uncompressedTotal = 0;
    let ptr = cdOffset;

    for (let entry = 0; entry < totalEntries; entry++) {
        if (ptr + 46 > buffer.length) break;
        // Central file header signature: 0x02014b50
        if (
            buffer[ptr] !== 0x50 ||
            buffer[ptr + 1] !== 0x4b ||
            buffer[ptr + 2] !== 0x01 ||
            buffer[ptr + 3] !== 0x02
        ) {
            break;
        }

        const compressedSize = buffer.readUInt32LE(ptr + 20);
        const uncompressedSize = buffer.readUInt32LE(ptr + 24);
        const fileNameLen = buffer.readUInt16LE(ptr + 28);
        const extraLen = buffer.readUInt16LE(ptr + 30);
        const commentLen = buffer.readUInt16LE(ptr + 32);

        uncompressedTotal += uncompressedSize;

        // Check compression ratio
        if (compressedSize > 0 && uncompressedSize / compressedSize > limits.maxZipRatio) {
            throw new TableParseError("TOO_LARGE", "Zip entry exceeds safe compression ratio (potential zip bomb)");
        }

        ptr += 46 + fileNameLen + extraLen + commentLen;
    }

    if (uncompressedTotal > limits.maxUnzippedBytes) {
        throw new TableParseError("TOO_LARGE", `Uncompressed size exceeds limit (${uncompressedTotal} > ${limits.maxUnzippedBytes})`);
    }
}

/**
 * Decode text buffer supporting UTF-8 with BOM, plain UTF-8, or Windows-1252.
 */
function decodeTextBuffer(buffer: Buffer): { text: string; encoding: string } {
    // Check UTF-8 BOM: EF BB BF
    if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
        return { text: buffer.subarray(3).toString("utf8"), encoding: "UTF-8 BOM" };
    }

    // Try standard UTF-8 decode
    try {
        const decoder = new TextDecoder("utf-8", { fatal: true });
        const text = decoder.decode(buffer);
        return { text, encoding: "UTF-8" };
    } catch {
        // Fallback to Windows-1252
        const decoder = new TextDecoder("windows-1252", { fatal: false });
        const text = decoder.decode(buffer);
        return { text, encoding: "windows-1252" };
    }
}

/**
 * Parse a CSV buffer into a 2D raw table.
 */
export function parseCsvTable(buffer: Buffer, limits: Required<ParseTableLimits>): ParsedTable {
    const { text, encoding } = decodeTextBuffer(buffer);
    const delimiter = detectCsvDelimiter(text);

    let rawRecords: string[][];
    try {
        rawRecords = parseCsvSync(text, {
            delimiter,
            relax_quotes: true,
            relax_column_count: true,
            skip_empty_lines: true,
            to: limits.maxRows + 10,
            max_record_size: 100 * 1024,
        });
    } catch (err: unknown) {
        throw new TableParseError("UNREADABLE", `CSV parse failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    if (!rawRecords || rawRecords.length === 0) {
        throw new TableParseError("EMPTY", "CSV file is empty");
    }

    const rows: RawRow[] = [];
    let maxColsSeen = 0;

    for (let r = 0; r < Math.min(rawRecords.length, limits.maxRows); r++) {
        const record = rawRecords[r];
        const rowCells: RawCellValue[] = [];
        const colsToTake = Math.min(record.length, limits.maxCols);
        if (colsToTake > maxColsSeen) maxColsSeen = colsToTake;

        for (let c = 0; c < colsToTake; c++) {
            const val = record[c].trim();
            rowCells.push(val === "" ? null : val);
        }
        rows.push(rowCells);
    }

    return {
        rows,
        format: "csv",
        rowCount: rows.length,
        colCount: maxColsSeen,
        encoding,
        delimiter,
    };
}

/**
 * Parse an XLSX buffer into a 2D raw table.
 */
export async function parseXlsxTable(buffer: Buffer, limits: Required<ParseTableLimits>): Promise<ParsedTable> {
    // 1. Pre-flight zip integrity and size checks
    checkZipSafety(buffer, limits);

    // 2. Read first sheet
    let parsedRows: any[][];
    try {
        parsedRows = await readSheet(buffer, 1);
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("XLS_FILE_NOT_SUPPORTED")) {
            throw new TableParseError("UNSUPPORTED_TYPE", "Legacy .xls format is not supported. Please save as .xlsx");
        }
        throw new TableParseError("UNREADABLE", `Excel parse failed: ${msg}`);
    }

    if (!parsedRows || parsedRows.length === 0) {
        throw new TableParseError("EMPTY", "Workbook sheet is empty");
    }

    // Filter out trailing completely empty rows
    const rows: RawRow[] = [];
    let maxColsSeen = 0;

    for (let r = 0; r < Math.min(parsedRows.length, limits.maxRows); r++) {
        const record = parsedRows[r];
        if (!record || record.every((cell) => cell === null || cell === undefined || cell === "")) {
            continue;
        }

        const rowCells: RawCellValue[] = [];
        const colsToTake = Math.min(record.length, limits.maxCols);
        if (colsToTake > maxColsSeen) maxColsSeen = colsToTake;

        for (let c = 0; c < colsToTake; c++) {
            const val = record[c];
            if (val === null || val === undefined) {
                rowCells.push(null);
            } else if (typeof val === "string") {
                const trimmed = val.trim();
                rowCells.push(trimmed === "" ? null : trimmed);
            } else {
                rowCells.push(val);
            }
        }
        rows.push(rowCells);
    }

    if (rows.length === 0) {
        throw new TableParseError("EMPTY", "Workbook contains only empty cells");
    }

    return {
        rows,
        format: "xlsx",
        rowCount: rows.length,
        colCount: maxColsSeen,
    };
}

/**
 * Main parser entry point. Detects type from filename, mime type, or buffer magic.
 */
export async function parseTable(
    buffer: Buffer,
    filename: string,
    customLimits?: ParseTableLimits
): Promise<ParsedTable> {
    const limits: Required<ParseTableLimits> = { ...DEFAULT_LIMITS, ...customLimits };

    if (!buffer || buffer.length === 0) {
        throw new TableParseError("EMPTY", "File buffer is empty");
    }

    if (buffer.length > limits.maxBytes) {
        throw new TableParseError("TOO_LARGE", `File size ${buffer.length} exceeds max allowed ${limits.maxBytes}`);
    }

    const lower = filename.toLowerCase();

    // Check if legacy .xls
    if (lower.endsWith(".xls") || (buffer.length >= 8 && buffer[0] === 0xd0 && buffer[1] === 0xcf && buffer[2] === 0x11 && buffer[3] === 0xe0)) {
        throw new TableParseError("UNSUPPORTED_TYPE", "Legacy .xls format is not supported. Please save as .xlsx");
    }

    // Check if XLSX (magic PK\x03\x04 or .xlsx extension)
    const isZip = buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04;
    if (lower.endsWith(".xlsx") || isZip) {
        return parseXlsxTable(buffer, limits);
    }

    // Otherwise treat as CSV
    return parseCsvTable(buffer, limits);
}
