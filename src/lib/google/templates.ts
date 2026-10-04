import type { LineItem, Receipt } from "@/types/receipt";
import type { ColumnMap, ConstantsMap, TemplateId } from "./workspace-store";

/** Default title for a newly created resto-inventory sheet. */
export const ZIPPP_RESTO_SHEET_TITLE = "[zippp] Resto inventory";

/** Name marker used to find zippp-managed spreadsheets (case-insensitive). */
export const ZIPPP_NAME_MARKER = "[zippp]";

/** Row-1 headers for a new resto-inventory sheet (spec/TEMPLATES.md). */
export const RESTO_INVENTORY_HEADERS = [
  "Date",
  "Supplier",
  "Item",
  "Qty",
  "Unit",
  "Unit price",
  "Line amount",
  "Tax",
  "Receipt total",
  "Currency",
  "Staff",
  "Outlet",
  "Category",
  "Notes",
  "Captured at",
] as const;

/** Stable mill/op field ids used as column_map keys. */
export const RESTO_INVENTORY_FIELDS = [
  { id: "date", label: "Date", aliases: ["date"] },
  { id: "merchant", label: "Supplier / merchant", aliases: ["supplier", "merchant"] },
  { id: "description", label: "Item / description", aliases: ["item", "description"] },
  { id: "qty", label: "Qty", aliases: ["qty", "quantity"] },
  { id: "unit_price", label: "Unit price", aliases: ["unit price", "unit_price", "price"] },
  { id: "amount", label: "Line amount", aliases: ["line amount", "amount"] },
  { id: "tax", label: "Tax", aliases: ["tax"] },
  { id: "total", label: "Receipt total", aliases: ["receipt total", "total"] },
  { id: "currency", label: "Currency", aliases: ["currency"] },
  { id: "staff", label: "Staff (op)", aliases: ["staff"] },
  { id: "outlet", label: "Outlet (op)", aliases: ["outlet"] },
  { id: "captured_at", label: "Captured at (op)", aliases: ["captured at", "captured_at"] },
] as const;

/** Constant columns for resto-inventory (header → default value). */
const RESTO_CONSTANT_ALIASES: {
  aliases: string[];
  defaultValue: string;
}[] = [
  { aliases: ["unit", "units", "uom"], defaultValue: "" },
  { aliases: ["category"], defaultValue: "Bahan baku" },
  { aliases: ["notes", "note"], defaultValue: "" },
];

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/_/g, " ").replace(/\s+/g, " ");
}

function findHeader(headers: string[], aliases: string[]): string | null {
  const byNorm = new Map(headers.map((h) => [norm(h), h]));
  for (const alias of aliases) {
    const hit = byNorm.get(norm(alias));
    if (hit !== undefined) return hit;
  }
  return null;
}

/**
 * Build default column_map + constants for a template by matching
 * header names case-insensitively. Unmatched fields stay out of the map
 * (UI can fill them in).
 */
export function buildDefaultMap(
  templateId: TemplateId,
  headers: string[]
): { column_map: ColumnMap; constants: ConstantsMap } {
  if (templateId !== "resto-inventory") {
    return { column_map: {}, constants: {} };
  }

  const column_map: ColumnMap = {};
  for (const field of RESTO_INVENTORY_FIELDS) {
    const header = findHeader(headers, [...field.aliases]);
    if (header) column_map[field.id] = header;
  }

  const constants: ConstantsMap = {};
  for (const c of RESTO_CONSTANT_ALIASES) {
    const header = findHeader(headers, c.aliases);
    if (header) constants[header] = c.defaultValue;
  }

  return { column_map, constants };
}

export type CellValue = string | number;

export type BuildAppendRowsInput = {
  receipt: Receipt;
  column_map: ColumnMap;
  constants: ConstantsMap;
  headers: string[];
  staff: string;
  outlet: string | null;
  captured_at: string;
};

/** Empty string for null — never invent qty/units/money. */
function emptyIfNull(v: string | number | null | undefined): CellValue {
  if (v === null || v === undefined) return "";
  return v;
}

/**
 * Resolve one mill/op field for a line. Tax: header tax on last line only
 * (spec/TEMPLATES.md); other lines empty.
 */
function valueForField(
  fieldId: string,
  receipt: Receipt,
  line: LineItem,
  lineIndex: number,
  lineCount: number,
  staff: string,
  outlet: string | null,
  captured_at: string
): CellValue {
  switch (fieldId) {
    case "date":
      return emptyIfNull(receipt.date);
    case "merchant":
      return emptyIfNull(receipt.merchant);
    case "description":
      return emptyIfNull(line.description);
    case "qty":
      return emptyIfNull(line.qty);
    case "unit_price":
      return emptyIfNull(line.unit_price);
    case "amount":
      return emptyIfNull(line.amount);
    case "tax":
      if (lineIndex === lineCount - 1) return emptyIfNull(receipt.tax);
      return "";
    case "total":
      return emptyIfNull(receipt.total);
    case "subtotal":
      return emptyIfNull(receipt.subtotal);
    case "currency":
      return emptyIfNull(receipt.currency);
    case "staff":
      return staff;
    case "outlet":
      return outlet ?? "";
    case "captured_at":
      return captured_at;
    default:
      return "";
  }
}

/**
 * One row per line_item. Header facts + op fields repeat per spec/TEMPLATES.md.
 * Column order follows workspace.headers (row 1). Constants applied first;
 * column_map overrides. Unmapped headers stay empty (or constant).
 */
export function buildAppendRows(input: BuildAppendRowsInput): CellValue[][] {
  const { receipt, column_map, constants, headers, staff, outlet, captured_at } =
    input;

  if (!headers.length) {
    throw new Error("Workspace has no header row — cannot append.");
  }

  const lines =
    receipt.line_items.length > 0
      ? receipt.line_items
      : [];

  if (lines.length === 0) {
    throw new Error("Receipt has no line items to append.");
  }

  const headerIndex = new Map(headers.map((h, i) => [h, i]));
  const width = headers.length;
  const rows: CellValue[][] = [];

  for (let i = 0; i < lines.length; i++) {
    const row: CellValue[] = Array.from({ length: width }, () => "");

    for (const [header, value] of Object.entries(constants)) {
      const idx = headerIndex.get(header);
      if (idx !== undefined) row[idx] = value;
    }

    for (const [fieldId, header] of Object.entries(column_map)) {
      const idx = headerIndex.get(header);
      if (idx === undefined) continue;
      row[idx] = valueForField(
        fieldId,
        receipt,
        lines[i],
        i,
        lines.length,
        staff,
        outlet,
        captured_at
      );
    }

    rows.push(row);
  }

  return rows;
}
