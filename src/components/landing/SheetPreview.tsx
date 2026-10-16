import {
    sheetPreviewFor,
    type PreviewKind,
} from "@/lib/sheet-previews";
import type { Lang } from "@/lib/region";
import type { T } from "@/lib/t";

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
    const data = sheetPreviewFor(kind, lang);

    return (
        <div className="w-full min-w-0 overflow-hidden rounded-panel border-2 border-line bg-[#f8f9fa] shadow-sm">
            <div className="flex min-w-0 items-center gap-2 border-b border-line bg-white px-3 py-2">
                <span className="inline-block h-3 w-3 shrink-0 rounded-full bg-[#0F9D58]" />
                <span className="min-w-0 truncate text-xs font-semibold text-body">
                    {data.displayTitle}
                </span>
                <span className="ml-auto shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted">
                    {t("landing.sheet.badge")}
                </span>
            </div>
            <div className="flex gap-1 overflow-x-auto border-b border-line bg-[#e8f0fe] px-2 py-1.5">
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
