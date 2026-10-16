"use client";

import { useEffect, useState } from "react";
import type { PersonaId } from "@/lib/personas";
import type { Lang } from "@/lib/region";
import { sheetPreviewFor } from "@/lib/sheet-previews";
import type { T } from "@/lib/t";

const ROW_MS = 900;
const HOLD_MS = 1800;

/**
 * Case-study hero: that persona’s sheet template, rows appearing one by one.
 * Not the master landing snap→sheet loop.
 */
export default function PersonaSheetHero({
    kind,
    t,
    lang,
}: {
    kind: PersonaId;
    t: T;
    lang: Lang;
}) {
    const data = sheetPreviewFor(kind, lang);
    const [visible, setVisible] = useState(0);

    useEffect(() => {
        setVisible(0);
        let row = 0;
        let cancelled = false;
        const timers: ReturnType<typeof setTimeout>[] = [];

        const later = (fn: () => void, ms: number) => {
            const id = setTimeout(() => {
                if (!cancelled) fn();
            }, ms);
            timers.push(id);
        };

        const tick = () => {
            if (row < data.rows.length) {
                row += 1;
                setVisible(row);
                later(tick, ROW_MS);
            } else {
                later(() => {
                    row = 0;
                    setVisible(0);
                    later(tick, 400);
                }, HOLD_MS);
            }
        };

        later(tick, 500);
        return () => {
            cancelled = true;
            timers.forEach(clearTimeout);
        };
    }, [kind, data.rows.length]);

    return (
        <div className="relative mx-auto w-full min-w-0 max-w-full sm:max-w-[400px]">
            <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wide text-maroon/80">
                {t(`landing.who.${whoKey(kind)}.template`)}
            </p>
            <div className="w-full min-w-0 overflow-hidden rounded-2xl border-[3px] border-line bg-[#f8f9fa] shadow-[0_18px_40px_rgba(28,11,9,0.2)]">
                <div className="flex min-w-0 items-center gap-2 border-b border-line bg-white px-3 py-3 sm:px-4">
                    <span className="inline-block h-3.5 w-3.5 shrink-0 rounded-full bg-[#0F9D58]" />
                    <span className="min-w-0 truncate text-sm font-semibold text-body">
                        {data.displayTitle}
                    </span>
                    <span className="ml-auto shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted">
                        Sheets
                    </span>
                </div>
                <div className="flex gap-1 overflow-x-auto border-b border-line bg-[#e8f0fe] px-2 py-2 sm:px-3">
                    {data.tabs.map((tab, i) => (
                        <span
                            key={tab}
                            className={`shrink-0 rounded-t px-3 py-1 text-xs font-semibold ${
                                i === 1
                                    ? "bg-white text-body shadow-sm"
                                    : "text-muted"
                            }`}
                        >
                            {tab}
                        </span>
                    ))}
                </div>
                <div className="max-w-full overflow-x-auto overscroll-x-contain">
                    <table className="w-max min-w-full border-collapse text-left text-[11px] sm:text-xs">
                        <thead>
                            <tr className="bg-[#f3f3f3]">
                                <th className="w-8 border border-line px-2 py-2 font-semibold text-muted">
                                    #
                                </th>
                                {data.headers.map((h) => (
                                    <th
                                        key={h}
                                        className="whitespace-nowrap border border-line px-2 py-2 font-semibold text-body"
                                    >
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {data.rows.map((row, ri) => {
                                const show = ri < visible;
                                const newest = ri === visible - 1;
                                return (
                                    <tr
                                        key={ri}
                                        className={`transition-all duration-500 ${
                                            show
                                                ? newest
                                                    ? "hero-row-land bg-brand/15 opacity-100"
                                                    : "bg-white opacity-100"
                                                : "h-0 opacity-0"
                                        }`}
                                        style={{
                                            visibility: show
                                                ? "visible"
                                                : "hidden",
                                        }}
                                    >
                                        <td className="border border-line px-2 py-2 text-muted">
                                            {ri + 2}
                                        </td>
                                        {row.map((cell, ci) => (
                                            <td
                                                key={ci}
                                                className={`whitespace-nowrap border border-line px-2 py-2 ${
                                                    newest
                                                        ? "font-semibold text-body"
                                                        : "text-body"
                                                }`}
                                            >
                                                {show ? cell : ""}
                                            </td>
                                        ))}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                <p
                    className={`border-t border-line bg-white px-4 py-3 text-sm font-semibold text-[#0F9D58] transition-opacity duration-300 ${
                        visible >= data.rows.length
                            ? "opacity-100"
                            : "opacity-0"
                    }`}
                >
                    {t("landing.flow.sent")}
                </p>
            </div>
        </div>
    );
}

function whoKey(kind: PersonaId): "resto" | "personal" | "sales" | "reimburse" {
    switch (kind) {
        case "purchasing":
            return "resto";
        case "expenses":
            return "personal";
        case "sales":
            return "sales";
        case "reimbursement":
            return "reimburse";
    }
}
