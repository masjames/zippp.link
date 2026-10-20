import type { PersonaId } from "@/lib/personas";
import type { Lang } from "@/lib/region";

export type PreviewKind = PersonaId | "master";

/** Map sheet template id → landing preview sample. */
export function previewKindForTemplate(
    templateId: string
): PreviewKind {
    switch (templateId) {
        case "resto-inventory":
            return "purchasing";
        case "personal-expense":
            return "expenses";
        case "sales-recap":
            return "sales";
        case "reimbursement":
            return "reimbursement";
        default:
            return "expenses";
    }
}

export type SheetPreviewData = {
    title: string;
    titleId?: string;
    tabs: string[];
    headers: string[];
    rows: string[][];
};

export const SHEET_PREVIEWS: Record<PreviewKind, SheetPreviewData> = {
    master: {
        title: "[zippp] Resto inventory",
        titleId: "[zippp] Stok dapur",
        tabs: ["Summary", "2026-10"],
        headers: ["Date", "Supplier", "Item", "Qty", "Line amount", "Staff"],
        rows: [
            ["2026-10-12", "Pasar Induk", "Bawang merah", "5", "75000", "Rina"],
            ["2026-10-12", "Pasar Induk", "Cabai", "2", "40000", "Rina"],
            ["2026-10-13", "Sumber Ayam", "Dada ayam", "10", "180000", "Budi"],
        ],
    },
    purchasing: {
        title: "[zippp] Resto inventory",
        titleId: "[zippp] Stok dapur",
        tabs: ["Summary", "2026-10"],
        headers: ["Date", "Supplier", "Item", "Qty", "Line amount", "Outlet"],
        rows: [
            ["2026-10-12", "Pasar Induk", "Bawang merah", "5", "75000", "Kemang"],
            ["2026-10-12", "Pasar Induk", "Cabai", "2", "40000", "Kemang"],
            ["2026-10-13", "Sumber Ayam", "Dada ayam", "10", "180000", "Kemang"],
        ],
    },
    expenses: {
        title: "[zippp] Expenses",
        titleId: "[zippp] Expenses",
        tabs: ["Summary", "2026-10"],
        headers: [
            "Date",
            "Merchant",
            "Description",
            "Amount",
            "Category",
            "Payment",
        ],
        rows: [
            ["2026-10-10", "Indomaret", "Air mineral", "12000", "Food", "QRIS"],
            [
                "2026-10-11",
                "Grab",
                "Trip ke kantor",
                "45000",
                "Transport",
                "E-wallet",
            ],
            ["2026-10-12", "Starbucks", "Latte", "58000", "Food", "Debit"],
        ],
    },
    sales: {
        title: "[zippp] Sales",
        titleId: "[zippp] Sales",
        tabs: ["Summary", "2026-10"],
        headers: ["Date", "Item", "Qty", "Amount", "Nota total", "Payment"],
        rows: [
            ["2026-10-14", "Nasi goreng", "2", "50000", "85000", "Cash"],
            ["2026-10-14", "Es teh", "2", "20000", "85000", "Cash"],
            ["2026-10-14", "Ayam geprek", "1", "28000", "28000", "QRIS"],
        ],
    },
    reimbursement: {
        title: "[zippp] Reimbursement",
        titleId: "[zippp] Reimbursement",
        tabs: ["Summary", "2026-10"],
        headers: [
            "Date",
            "Merchant",
            "Description",
            "Total",
            "Purpose",
            "Photo",
        ],
        rows: [
            ["2026-10-08", "KAI", "Tiket Bandung", "275000", "Client visit", "link"],
            ["2026-10-09", "Hotel", "1 malam", "650000", "Client visit", "link"],
            ["2026-10-09", "GoFood", "Makan malam", "98000", "Client visit", "link"],
        ],
    },
};

export function sheetPreviewFor(
    kind: PreviewKind,
    lang: Lang
): SheetPreviewData & { displayTitle: string } {
    const data = SHEET_PREVIEWS[kind];
    return {
        ...data,
        displayTitle:
            lang === "id" && data.titleId ? data.titleId : data.title,
    };
}
