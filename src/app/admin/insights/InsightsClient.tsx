"use client";

import { useEffect, useState } from "react";
import { makeT, type Wording } from "@/lib/t";

type Summary = {
    total: number;
    boxes: {
        editedFlagged: number;
        editedUnflagged: number;
        leftFlagged: number;
        leftUnflagged: number;
    };
    byField: {
        path: string;
        seen: number;
        edited: number;
        flagged: number;
        wrongUnflagged: number;
        leftFlagged: number;
    }[];
    byReason: { reason: string; seen: number; edited: number }[];
};

function rate(part: number, whole: number): string {
    if (whole === 0) return "n/a";
    return `${Math.round((part / whole) * 100)}%`;
}

export default function InsightsClient({ wording }: { wording: Wording }) {
    const t = makeT(wording, "en");
    const [summary, setSummary] = useState<Summary | null>(null);

    useEffect(() => {
        void (async () => {
            const res = await fetch("/api/admin/corrections", { cache: "no-store" });
            const data = await res.json();
            if (data.ok) setSummary(data.summary as Summary);
        })();
    }, []);

    return (
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-5 sm:py-10">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <a href="/admin" className="text-sm font-semibold text-muted hover:text-body">
                    &larr; {t("admin.back")}
                </a>
                <div className="flex flex-wrap gap-2">
                    <a href="/admin/eval" className="rounded-full bg-surface px-4 py-2 text-sm font-semibold">
                        {t("admin.eval.link")}
                    </a>
                    <a href="/admin/lessons" className="rounded-full bg-surface px-4 py-2 text-sm font-semibold">
                        {t("admin.lessons.link")}
                    </a>
                    <a href="/admin/releases" className="rounded-full bg-surface px-4 py-2 text-sm font-semibold">
                        {t("admin.releases.link")}
                    </a>
                </div>
            </div>

            <h1 className="mt-2 font-head text-3xl font-extrabold tracking-tight sm:text-4xl">
                {t("admin.insights.title")}
            </h1>
            <p className="mt-1 max-w-3xl text-sm text-muted">
                {t("admin.insights.subtitle")}
            </p>

            {!summary ? (
                <p className="mt-6 text-sm text-muted">{t("admin.insights.loading")}</p>
            ) : summary.total === 0 ? (
                <p className="mt-6 text-sm text-muted">{t("admin.insights.empty")}</p>
            ) : (
                <>
                    <section className="mt-6">
                        <h2 className="font-head text-2xl font-extrabold">
                            {t("admin.insights.boxesTitle")}
                        </h2>
                        <div className="mt-3 grid gap-2 sm:grid-cols-4">
                            <Box
                                label={t("admin.insights.editedFlagged")}
                                value={summary.boxes.editedFlagged}
                                tone="good"
                            />
                            <Box
                                label={t("admin.insights.editedUnflagged")}
                                value={summary.boxes.editedUnflagged}
                                tone="bad"
                            />
                            <Box
                                label={t("admin.insights.leftFlagged")}
                                value={summary.boxes.leftFlagged}
                                tone="warn"
                            />
                            <Box
                                label={t("admin.insights.leftUnflagged")}
                                value={summary.boxes.leftUnflagged}
                                tone="muted"
                            />
                        </div>
                    </section>

                    <section className="mt-8">
                        <h2 className="font-head text-2xl font-extrabold">
                            {t("admin.insights.byField")}
                        </h2>
                        <div className="mt-3 overflow-x-auto rounded-2xl border-2 border-line bg-card">
                            <table className="w-full text-sm">
                                <thead className="bg-surface text-left">
                                    <tr>
                                        <th className="px-3 py-2">{t("admin.insights.col.field")}</th>
                                        <th className="px-3 py-2">{t("admin.insights.col.seen")}</th>
                                        <th className="px-3 py-2">{t("admin.insights.col.edited")}</th>
                                        <th className="px-3 py-2">{t("admin.insights.col.flagged")}</th>
                                        <th className="px-3 py-2 text-danger">
                                            {t("admin.insights.col.wrongUnflagged")}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {summary.byField.map((field) => (
                                        <tr key={field.path} className="border-t border-line">
                                            <td className="px-3 py-2 font-mono text-xs">
                                                {field.path}
                                            </td>
                                            <td className="px-3 py-2">{field.seen}</td>
                                            <td className="px-3 py-2">
                                                {field.edited} ({rate(field.edited, field.seen)})
                                            </td>
                                            <td className="px-3 py-2">{field.flagged}</td>
                                            <td className="px-3 py-2 font-semibold text-danger">
                                                {field.wrongUnflagged}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <section className="mt-8">
                        <h2 className="font-head text-2xl font-extrabold">
                            {t("admin.insights.byReason")}
                        </h2>
                        <div className="mt-3 overflow-x-auto rounded-2xl border-2 border-line bg-card">
                            <table className="w-full text-sm">
                                <thead className="bg-surface text-left">
                                    <tr>
                                        <th className="px-3 py-2">{t("admin.insights.col.reason")}</th>
                                        <th className="px-3 py-2">{t("admin.insights.col.seen")}</th>
                                        <th className="px-3 py-2">{t("admin.insights.col.edited")}</th>
                                        <th className="px-3 py-2">{t("admin.insights.col.editRate")}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {summary.byReason.map((reason) => (
                                        <tr key={reason.reason} className="border-t border-line">
                                            <td className="px-3 py-2 font-mono text-xs">
                                                {reason.reason}
                                            </td>
                                            <td className="px-3 py-2">{reason.seen}</td>
                                            <td className="px-3 py-2">{reason.edited}</td>
                                            <td className="px-3 py-2 font-semibold">
                                                {rate(reason.edited, reason.seen)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </>
            )}
        </div>
    );
}

function Box({
    label,
    value,
    tone,
}: {
    label: string;
    value: number;
    tone: "good" | "bad" | "warn" | "muted";
}) {
    const color =
        tone === "good"
            ? "text-green-700"
            : tone === "bad"
              ? "text-danger"
              : tone === "warn"
                ? "text-amber-700"
                : "text-muted";
    return (
        <div className="rounded-2xl border-2 border-line bg-card p-3">
            <p className="text-xs font-semibold text-muted">{label}</p>
            <p className={`mt-1 font-head text-3xl font-extrabold ${color}`}>{value}</p>
        </div>
    );
}
