import type { LineItem, Receipt } from "@/types/receipt";

/** Editable form state for the Check screen (all values are strings). */
export type DraftLine = {
    description: string;
    qty: string;
    amount: string;
};

export type Draft = {
    merchant: string;
    date: string;
    currency: string;
    staff: string;
    outlet: string;
    tax: string;
    total: string;
    lines: DraftLine[];
    /** Set when the date could not be read and was filled from the capture time. */
    dateAssumed?: boolean;
};

/** Local calendar date (YYYY-MM-DD) for a capture timestamp. */
export function captureDate(ms: number): string {
    const d = new Date(ms);
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${month}-${day}`;
}

export function toDraft(receipt: Receipt): Draft {
    return {
        merchant: receipt.merchant ?? "",
        date: receipt.date ?? "",
        currency: receipt.currency ?? "",
        staff: "",
        outlet: "",
        tax: receipt.tax == null ? "" : String(receipt.tax),
        total: receipt.total == null ? "" : String(receipt.total),
        lines: receipt.line_items.map((item) => ({
            description: item.description ?? "",
            qty: item.qty == null ? "" : String(item.qty),
            amount: item.amount == null ? "" : String(item.amount),
        })),
    };
}

/**
 * Parse a money/qty string. Accepts plain numbers, Indonesian grouping
 * (1.234.567 or 1.234,56) and US grouping (1,234.56).
 */
export function parseMoney(input: string): number | null {
    const s = input.trim();
    if (s === "") return null;
    if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) {
        return Number(s.replace(/\./g, "").replace(",", "."));
    }
    if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) {
        return Number(s.replace(/,/g, ""));
    }
    const n = Number(s.replace(",", "."));
    return Number.isFinite(n) ? n : null;
}

/** Turn the edited draft back into the Receipt the Sheets API expects. */
export function fromDraft(draft: Draft): Receipt {
    const line_items: LineItem[] = draft.lines
        .filter((l) => l.description.trim() || l.qty.trim() || l.amount.trim())
        .map((l) => {
            const qty = parseMoney(l.qty);
            const amount = parseMoney(l.amount);
            const unit_price =
                qty !== null && qty !== 0 && amount !== null ? amount / qty : null;
            return {
                description: l.description.trim() || null,
                qty,
                unit_price,
                amount,
            };
        });

    return {
        merchant: draft.merchant.trim() || null,
        date: draft.date.trim() || null,
        currency: draft.currency.trim() || null,
        line_items,
        subtotal: null,
        tax: parseMoney(draft.tax),
        total: parseMoney(draft.total),
    };
}

/** Format an amount for display, using the region's currency/locale. */
export function formatMoney(
    value: number | null,
    currency: string | null,
    region: "id" | "intl",
    lang: string
): string {
    if (value === null) return "—";
    const locale = lang === "id" ? "id-ID" : "en-US";
    const code = currency || (region === "id" ? "IDR" : "USD");
    try {
        return new Intl.NumberFormat(locale, {
            style: "currency",
            currency: code,
            maximumFractionDigits: 0,
        }).format(value);
    } catch {
        return `${code} ${value.toLocaleString(locale)}`;
    }
}
