"use client";

import { useRef } from "react";
import type { Language } from "@/components/copy";
import type { Receipt } from "@/types/receipt";
import { APP_COPY } from "./copy";

const EMPTY = "—";

function num(value: number | null): string {
    return value === null ? EMPTY : value.toLocaleString("en-US");
}

function csvCell(value: string | number | null): string {
    const s = value === null ? "" : String(value);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(r: Receipt): string {
    const meta = [r.merchant, r.date, r.currency];
    const rows: (string | number | null)[][] = [
        ["merchant", "date", "currency", "item", "qty", "unit_price", "amount"],
        ...r.line_items.map((i) => [
            ...meta,
            i.description,
            i.qty,
            i.unit_price,
            i.amount,
        ]),
        [...meta, "subtotal", null, null, r.subtotal],
        [...meta, "tax", null, null, r.tax],
        [...meta, "total", null, null, r.total],
    ];
    return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

function download(name: string, mime: string, body: string) {
    const url = URL.createObjectURL(new Blob([body], { type: mime }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
}

/**
 * Screen 03 / Result. Read-only table with CSV and JSON download.
 *
 * Args:
 *     language: Interface language.
 *     receipt: Extracted receipt data.
 *     onFile: Called when another receipt is dropped, to start over.
 */
export default function ResultScreen({
    language,
    receipt,
    onFile,
}: {
    language: Language;
    receipt: Receipt;
    onFile: (file: File) => void;
}) {
    const t = APP_COPY[language].result;
    const inputRef = useRef<HTMLInputElement>(null);

    return (
        <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file) onFile(file);
            }}
            className="w-full"
        >
            <div className="mb-4 flex items-baseline justify-between gap-3">
                <div className="min-w-0">
                    <p className="truncate text-lg font-semibold text-gray-900">
                        {receipt.merchant ?? EMPTY}
                    </p>
                    <p className="text-sm text-gray-500">
                        {receipt.date ?? EMPTY}
                    </p>
                </div>
                <p className="text-sm font-medium text-gray-700">
                    {receipt.currency ?? EMPTY}
                </p>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-500">
                        <tr>
                            <th className="px-3 py-2 text-left font-medium">
                                {t.item}
                            </th>
                            <th className="px-3 py-2 text-right font-medium">
                                {t.qty}
                            </th>
                            <th className="px-3 py-2 text-right font-medium">
                                {t.amt}
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-900">
                        {receipt.line_items.map((item, i) => (
                            <tr key={i}>
                                <td className="px-3 py-2">
                                    {item.description ?? EMPTY}
                                </td>
                                <td className="px-3 py-2 text-right tabular-nums">
                                    {num(item.qty)}
                                </td>
                                <td className="px-3 py-2 text-right tabular-nums">
                                    {num(item.amount)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="border-t border-gray-200 text-gray-900">
                        <tr>
                            <td colSpan={2} className="px-3 py-2 text-gray-500">
                                {t.subtotal}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">
                                {num(receipt.subtotal)}
                            </td>
                        </tr>
                        <tr>
                            <td colSpan={2} className="px-3 py-2 text-gray-500">
                                {t.tax}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">
                                {num(receipt.tax)}
                            </td>
                        </tr>
                        <tr className="font-semibold">
                            <td colSpan={2} className="px-3 py-2">
                                {t.total}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">
                                {num(receipt.total)}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                    type="button"
                    onClick={() =>
                        download("receipt.csv", "text/csv", toCsv(receipt))
                    }
                    className="rounded-xl bg-gray-900 px-4 py-3 font-medium text-white hover:bg-gray-700"
                >
                    {t.csv}
                </button>
                <button
                    type="button"
                    onClick={() =>
                        download(
                            "receipt.json",
                            "application/json",
                            JSON.stringify(receipt, null, 2),
                        )
                    }
                    className="rounded-xl bg-gray-900 px-4 py-3 font-medium text-white hover:bg-gray-700"
                >
                    {t.json}
                </button>
            </div>

            <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="mt-6 block w-full text-center text-sm text-gray-500 hover:text-gray-900"
            >
                {t.startOver}
            </button>
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onFile(file);
                    e.target.value = "";
                }}
            />
        </div>
    );
}
