"use client";

import { useEffect, useMemo, useState } from "react";
import { makeT, type Wording } from "@/lib/t";

type Contribution = {
    id: string;
    at: number;
    pathname: string;
    reason: string | null;
    lang: string | null;
    bytes: number;
    type: string;
};

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ContributionsClient({ wording }: { wording: Wording }) {
    const t = makeT(wording, "en");
    const [items, setItems] = useState<Contribution[]>([]);
    const [busy, setBusy] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    async function load() {
        const res = await fetch("/api/admin/contributions", { cache: "no-store" });
        const data = await res.json();
        if (data.ok) setItems(data.contributions as Contribution[]);
        setLoading(false);
    }

    useEffect(() => {
        void load();
    }, []);

    async function remove(id: string) {
        setBusy(id);
        try {
            await fetch("/api/admin/contributions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, action: "delete" }),
            });
            await load();
        } finally {
            setBusy(null);
        }
    }

    const totalBytes = useMemo(
        () => items.reduce((sum, item) => sum + item.bytes, 0),
        [items]
    );

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
                    <a href="/admin/insights" className="rounded-full bg-surface px-4 py-2 text-sm font-semibold">
                        {t("admin.insights.link")}
                    </a>
                </div>
            </div>

            <h1 className="mt-2 font-head text-3xl font-extrabold tracking-tight sm:text-4xl">
                {t("admin.contrib.title")}
            </h1>
            <p className="mt-1 max-w-3xl text-sm text-muted">
                {t("admin.contrib.subtitle")}
            </p>
            <p className="mt-2 text-xs font-semibold">
                {items.length} {t("admin.contrib.photos")} · {formatBytes(totalBytes)}
            </p>

            {loading ? (
                <p className="mt-6 text-sm text-muted">{t("admin.contrib.loading")}</p>
            ) : items.length === 0 ? (
                <p className="mt-6 text-sm text-muted">{t("admin.contrib.empty")}</p>
            ) : (
                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map((item) => (
                        <div
                            key={item.id}
                            className="rounded-2xl border-2 border-line bg-card p-3"
                        >
                            <a
                                href={`/api/admin/contributions/${item.id}`}
                                target="_blank"
                                rel="noreferrer"
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={`/api/admin/contributions/${item.id}`}
                                    alt=""
                                    className="h-48 w-full rounded-xl border-2 border-line bg-surface object-contain"
                                />
                            </a>
                            <p className="mt-2 truncate text-xs font-semibold">
                                {item.reason ?? t("admin.contrib.noReason")}
                            </p>
                            <p className="text-xs text-muted">
                                {new Date(item.at).toLocaleString()} · {formatBytes(item.bytes)}
                                {item.lang ? ` · ${item.lang}` : ""}
                            </p>
                            <button
                                type="button"
                                disabled={busy === item.id}
                                onClick={() => void remove(item.id)}
                                className="mt-2 rounded-full bg-surface px-3 py-1 text-xs font-semibold text-danger disabled:opacity-60"
                            >
                                {t("admin.contrib.delete")}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
