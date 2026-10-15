import type { PersonaId } from "@/lib/personas";
import type { Lang } from "@/lib/region";
import type { T } from "@/lib/t";

type PreviewKind = PersonaId | "master";

const PREVIEWS: Record<
    PreviewKind,
    { title: string; tabs: string[]; headers: string[]; rows: string[][] }
> = {
    master: {
        title: "[zippp] Resto inventory",
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
        tabs: ["Summary", "2026-10"],
        headers: ["Date", "Merchant", "Description", "Amount", "Category", "Payment"],
        rows: [
            ["2026-10-10", "Indomaret", "Air mineral", "12000", "Food", "QRIS"],
            ["2026-10-11", "Grab", "Trip ke kantor", "45000", "Transport", "E-wallet"],
            ["2026-10-12", "Starbucks", "Latte", "58000", "Food", "Debit"],
        ],
    },
    sales: {
        title: "[zippp] Sales",
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
        tabs: ["Summary", "2026-10"],
        headers: ["Date", "Merchant", "Description", "Total", "Purpose", "Photo"],
        rows: [
            ["2026-10-08", "KAI", "Tiket Bandung", "275000", "Client visit", "link"],
            ["2026-10-09", "Hotel", "1 malam", "650000", "Client visit", "link"],
            ["2026-10-09", "GoFood", "Makan malam", "98000", "Client visit", "link"],
        ],
    },
};

/** Mock Google Sheet chrome with sample rows for landing proof. */
export default function SheetPreview({
    kind,
    t,
    lang,
}: {
    kind: PreviewKind;
    t: T;
    lang: Lang;
}) {
    const data = PREVIEWS[kind];
    const title =
        lang === "id" && kind === "purchasing"
            ? "[zippp] Stok dapur"
            : data.title;

    return (
        <div className="overflow-hidden rounded-panel border-2 border-line bg-[#f8f9fa] shadow-sm">
            <div className="flex items-center gap-2 border-b border-line bg-white px-3 py-2">
                <span className="inline-block h-3 w-3 rounded-full bg-[#0F9D58]" />
                <span className="truncate text-xs font-semibold text-body">
                    {title}
                </span>
                <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide text-muted">
                    {t("landing.sheet.badge")}
                </span>
            </div>
            <div className="flex gap-1 border-b border-line bg-[#e8f0fe] px-2 py-1.5">
                {data.tabs.map((tab, i) => (
                    <span
                        key={tab}
                        className={`rounded-t px-3 py-1 text-xs font-semibold ${
                            i === 1
                                ? "bg-white text-body shadow-sm"
                                : "text-muted"
                        }`}
                    >
                        {tab}
                    </span>
                ))}
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-left text-[11px] sm:text-xs">
                    <thead>
                        <tr className="bg-[#f3f3f3]">
                            <th className="w-8 border border-line px-2 py-1.5 font-semibold text-muted">
                                #
                            </th>
                            {data.headers.map((h) => (
                                <th
                                    key={h}
                                    className="whitespace-nowrap border border-line px-2 py-1.5 font-semibold text-body"
                                >
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.rows.map((row, ri) => (
                            <tr key={ri} className="bg-white">
                                <td className="border border-line px-2 py-1.5 text-muted">
                                    {ri + 2}
                                </td>
                                {row.map((cell, ci) => (
                                    <td
                                        key={ci}
                                        className="whitespace-nowrap border border-line px-2 py-1.5 text-body"
                                    >
                                        {cell}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <p className="border-t border-line bg-white px-3 py-2 text-[11px] text-muted">
                {t("landing.sheet.caption")}
            </p>
        </div>
    );
}
