/**
 * Google Sheets formula injection prevention.
 *
 * valueInputOption=USER_ENTERED causes Sheets to evaluate cell values
 * starting with = + - @ \t \r as formulas. Prefix with a single quote to treat
 * them as plain text.
 *
 * There is no client-supplied formula exception. Deliberate formulas (for
 * example a server-generated photo hyperlink) must be constructed in a
 * dedicated server path and inserted after sanitization, never passed through
 * a user-controlled string.
 */

const FORMULA_STARTERS = ["=", "+", "-", "@", "\t", "\r"];

export function escapeSheetText(value: string): string {
    if (typeof value !== "string" || value.length === 0) return value;
    if (FORMULA_STARTERS.some((starter) => value.startsWith(starter))) {
        return "'" + value;
    }
    return value;
}

export function sanitizeRow(
    row: (string | number | boolean)[]
): (string | number | boolean)[] {
    return row.map((cell) =>
        typeof cell === "string" ? escapeSheetText(cell) : cell
    );
}

export function sanitizeRows(
    rows: (string | number | boolean)[][]
): (string | number | boolean)[][] {
    return rows.map(sanitizeRow);
}
