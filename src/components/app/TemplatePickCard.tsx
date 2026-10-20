"use client";

import type { LucideIcon } from "lucide-react";
import {
    Wallet,
    ShoppingBasket,
    Receipt,
    ClipboardList,
    Table2,
} from "lucide-react";
import {
    previewKindForTemplate,
    sheetPreviewFor,
} from "@/lib/sheet-previews";
import type { Lang } from "@/lib/region";
import type { SheetTemplateId } from "@/components/app/AppProvider";

const ICONS: Record<SheetTemplateId, LucideIcon> = {
    "personal-expense": Wallet,
    "resto-inventory": ShoppingBasket,
    "sales-recap": Receipt,
    reimbursement: ClipboardList,
    custom: Table2,
};

/** Compact icon + short label chip for the horizontal type strip. */
export function TemplateChip({
    id,
    title,
    selected,
    disabled,
    onPick,
}: {
    id: SheetTemplateId;
    title: string;
    selected?: boolean;
    disabled?: boolean;
    onPick: () => void;
}) {
    const Icon = ICONS[id];
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={onPick}
            aria-pressed={selected}
            className={`flex w-[4.75rem] shrink-0 snap-start flex-col items-center gap-1.5 rounded-2xl px-1 py-2 transition disabled:opacity-60 ${
                selected
                    ? "bg-brand/15 ring-2 ring-brand"
                    : "bg-mist/80 hover:bg-mist"
            }`}
        >
            <span
                className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                    selected ? "bg-brand text-ink" : "bg-card text-ink"
                }`}
            >
                <Icon className="h-5 w-5" strokeWidth={2.25} aria-hidden />
            </span>
            <span className="w-full truncate text-center text-[11px] font-bold leading-tight text-body">
                {title}
            </span>
        </button>
    );
}

/** Full-width sheet sneak peek for the selected template. */
export function TemplatePeek({
    templateId,
    lang,
    customLabel,
}: {
    templateId: SheetTemplateId;
    lang: Lang;
    customLabel: string;
}) {
    if (templateId === "custom") {
        return (
            <div className="overflow-hidden rounded-2xl border-2 border-line bg-[#f8f9fa]">
                <div className="border-b border-line bg-white px-3 py-2 text-xs font-semibold text-muted">
                    {customLabel}
                </div>
                <div className="px-3 py-6 text-center text-sm text-muted">
                    A · B · C · …
                </div>
            </div>
        );
    }
    const data = sheetPreviewFor(previewKindForTemplate(templateId), lang);
    const headers = data.headers.slice(0, 5);
    const rows = data.rows.slice(0, 3).map((r) => r.slice(0, 5));
    return (
        <div className="overflow-hidden rounded-2xl border-2 border-line bg-[#f8f9fa]">
            <div className="flex items-center gap-2 border-b border-line bg-white px-3 py-2">
                <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-[#0F9D58]" />
                <span className="min-w-0 truncate text-xs font-semibold text-body">
                    {data.displayTitle}
                </span>
            </div>
            <div className="overflow-x-auto">
                <table className="w-max min-w-full border-collapse text-left text-[11px]">
                    <thead>
                        <tr className="bg-[#f3f3f3]">
                            {headers.map((h) => (
                                <th
                                    key={h}
                                    className="whitespace-nowrap border border-line px-2 py-1.5 font-semibold text-muted"
                                >
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, ri) => (
                            <tr key={ri} className="bg-white">
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
        </div>
    );
}

/** @deprecated Prefer TemplateChip + TemplatePeek. Kept for any leftover import. */
export default function TemplatePickCard(props: {
    id: SheetTemplateId;
    title: string;
    body: string;
    lang: Lang;
    customPeekLabel: string;
    disabled?: boolean;
    selected?: boolean;
    onPick: () => void;
}) {
    return (
        <TemplateChip
            id={props.id}
            title={props.title}
            selected={props.selected}
            disabled={props.disabled}
            onPick={props.onPick}
        />
    );
}
