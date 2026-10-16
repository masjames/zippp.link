"use client";

import { useEffect, useRef } from "react";
import {
    sheetPreviewFor,
    type PreviewKind,
} from "@/lib/sheet-previews";
import type { Lang } from "@/lib/region";
import type { T } from "@/lib/t";

/** Mock Google Sheet chrome with sample rows; table auto-scrolls slowly. */
export default function SheetPreview({
    kind,
    t,
    lang,
}: {
    kind: PreviewKind;
    t: T;
    lang: Lang;
}) {
    const data = sheetPreviewFor(kind, lang);
    const scrollerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = scrollerRef.current;
        if (!el) return;

        let raf = 0;
        let last = performance.now();
        let dir = 1;
        const speed = 18; // px/sec — slow, no jank
        let paused = false;

        const onEnter = () => {
            paused = true;
        };
        const onLeave = () => {
            paused = false;
            last = performance.now();
        };
        el.addEventListener("pointerenter", onEnter);
        el.addEventListener("pointerleave", onLeave);

        const tick = (now: number) => {
            const dt = Math.min(0.05, (now - last) / 1000);
            last = now;
            const max = el.scrollWidth - el.clientWidth;
            if (!paused && max > 4) {
                let next = el.scrollLeft + dir * speed * dt;
                if (next >= max) {
                    next = max;
                    dir = -1;
                } else if (next <= 0) {
                    next = 0;
                    dir = 1;
                }
                el.scrollLeft = next;
            }
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);

        return () => {
            cancelAnimationFrame(raf);
            el.removeEventListener("pointerenter", onEnter);
            el.removeEventListener("pointerleave", onLeave);
        };
    }, [kind]);

    return (
        <div className="overflow-hidden rounded-panel border-2 border-line bg-[#f8f9fa] shadow-sm">
            <div className="flex items-center gap-2 border-b border-line bg-white px-3 py-2">
                <span className="inline-block h-3 w-3 rounded-full bg-[#0F9D58]" />
                <span className="truncate text-xs font-semibold text-body">
                    {data.displayTitle}
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
            <div
                ref={scrollerRef}
                className="overflow-x-auto scrollbar-none"
                style={{ scrollbarWidth: "none" }}
            >
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
