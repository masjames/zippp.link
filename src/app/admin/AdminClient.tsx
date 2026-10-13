"use client";

import { useCallback, useEffect, useState } from "react";
import { makeT, type Wording } from "@/lib/t";

type Order = {
    invoice: string;
    email: string | null;
    amount: number;
    channel?: string;
    state: string;
    createdAt: number;
};

export default function AdminClient({ wording }: { wording: Wording }) {
    const t = makeT(wording, "en");
    const [recent, setRecent] = useState<Order[]>([]);
    const [busy, setBusy] = useState(false);
    const [email, setEmail] = useState("");
    const [credits, setCredits] = useState(100);
    const [reason, setReason] = useState("");
    const [msg, setMsg] = useState<string | null>(null);

    const load = useCallback(async () => {
        const res = await fetch("/api/admin/orders", { cache: "no-store" });
        const data = await res.json();
        if (data.ok) setRecent(data.recent as Order[]);
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    async function doGrant() {
        setBusy(true);
        setMsg(null);
        try {
            const res = await fetch("/api/admin/grant", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, credits, reason }),
            });
            const data = await res.json();
            setMsg(data.ok ? `Granted ${credits}.` : data.error);
        } catch {
            setMsg("Failed.");
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="mx-auto max-w-4xl px-5 py-10">
            <div className="flex items-center justify-between">
                <a
                    href="/app/snap"
                    className="text-sm font-semibold text-muted hover:text-body"
                >
                    &larr; {t("admin.back")}
                </a>
                <div className="flex flex-wrap gap-2">
                    <a
                        href="/admin/eval"
                        className="rounded-full bg-btn px-4 py-2 text-sm font-semibold text-btntext"
                    >
                        {t("admin.eval.link")}
                    </a>
                    <a
                        href="/admin/lessons"
                        className="rounded-full bg-surface px-4 py-2 text-sm font-semibold"
                    >
                        {t("admin.lessons.link")}
                    </a>
                    <a
                        href="/admin/releases"
                        className="rounded-full bg-surface px-4 py-2 text-sm font-semibold"
                    >
                        {t("admin.releases.link")}
                    </a>
                    <a
                        href="/admin/insights"
                        className="rounded-full bg-surface px-4 py-2 text-sm font-semibold"
                    >
                        {t("admin.insights.link")}
                    </a>
                    <a
                        href="/admin/contributions"
                        className="rounded-full bg-surface px-4 py-2 text-sm font-semibold"
                    >
                        {t("admin.contrib.link")}
                    </a>
                </div>
            </div>
            <h1 className="mt-2 font-head text-4xl font-extrabold tracking-tight">
                {t("admin.title")}
            </h1>

            <h2 className="mt-6 font-head text-2xl font-extrabold">{t("admin.doku")}</h2>
            <div className="mt-3 overflow-x-auto rounded-2xl border-2 border-line bg-card">
                <table className="w-full text-sm">
                    <thead className="bg-surface text-left">
                        <tr>
                            <th className="px-3 py-2">invoice</th>
                            <th className="px-3 py-2">email</th>
                            <th className="px-3 py-2">amount</th>
                            <th className="px-3 py-2">channel</th>
                            <th className="px-3 py-2">state</th>
                            <th className="px-3 py-2">created</th>
                        </tr>
                    </thead>
                    <tbody>
                        {recent.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-3 py-6 text-center text-muted">
                                    {t("admin.empty")}
                                </td>
                            </tr>
                        ) : (
                            recent.map((o) => (
                                <tr key={o.invoice} className="border-t border-line">
                                    <td className="px-3 py-2 font-mono text-xs">{o.invoice}</td>
                                    <td className="px-3 py-2">{o.email ?? "-"}</td>
                                    <td className="px-3 py-2 font-semibold">
                                        {o.amount.toLocaleString("id-ID")}
                                    </td>
                                    <td className="px-3 py-2">{o.channel ?? "-"}</td>
                                    <td className="px-3 py-2">{o.state}</td>
                                    <td className="px-3 py-2 text-xs text-muted">
                                        {new Date(o.createdAt).toLocaleString("id-ID")}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <h2 className="mt-10 font-head text-2xl font-extrabold">
                {t("admin.grant")}
            </h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t("admin.email")}
                    className="rounded-xl border-2 border-line bg-card px-3 py-2"
                />
                <input
                    type="number"
                    value={credits}
                    onChange={(e) => setCredits(Number(e.target.value))}
                    placeholder={t("admin.credits")}
                    className="rounded-xl border-2 border-line bg-card px-3 py-2"
                />
                <input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder={t("admin.reason")}
                    className="rounded-xl border-2 border-line bg-card px-3 py-2"
                />
            </div>
            <button
                type="button"
                disabled={busy || !email}
                onClick={doGrant}
                className="mt-3 rounded-full bg-btn px-6 py-3 font-semibold text-btntext disabled:opacity-60"
            >
                {t("admin.grant")}
            </button>
            {msg ? <p className="mt-2 text-sm font-medium">{msg}</p> : null}
        </div>
    );
}
