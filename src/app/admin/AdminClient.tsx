"use client";

import { useCallback, useEffect, useState } from "react";
import { makeT, type Wording } from "@/lib/t";

type Order = {
    id: string;
    email: string | null;
    baseIdr: number;
    code: number;
    payIdr: number;
    state: string;
    createdAt: number;
};

export default function AdminClient({ wording }: { wording: Wording }) {
    const t = makeT(wording, "en");
    const [open, setOpen] = useState<Order[]>([]);
    const [recent, setRecent] = useState<Order[]>([]);
    const [tab, setTab] = useState<"pending" | "recent">("pending");
    const [busy, setBusy] = useState(false);
    const [email, setEmail] = useState("");
    const [credits, setCredits] = useState(100);
    const [reason, setReason] = useState("");
    const [msg, setMsg] = useState<string | null>(null);

    const load = useCallback(async () => {
        const res = await fetch("/api/admin/orders", { cache: "no-store" });
        const data = await res.json();
        if (data.ok) {
            setOpen(data.open as Order[]);
            setRecent(data.recent as Order[]);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    async function act(id: string, action: "approve" | "reject") {
        setBusy(true);
        try {
            await fetch(`/api/admin/orders/${id}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action }),
            });
            await load();
        } finally {
            setBusy(false);
        }
    }

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

    const rows = tab === "pending" ? open : recent;

    return (
        <div className="mx-auto max-w-4xl px-5 py-10">
            <a
                href="/app/snap"
                className="text-sm font-semibold text-muted hover:text-body"
            >
                &larr; {t("admin.back")}
            </a>
            <h1 className="mt-2 font-head text-4xl font-extrabold tracking-tight">
                {t("admin.title")}
            </h1>

            <div className="mt-6 flex gap-2">
                {(["pending", "recent"] as const).map((value) => (
                    <button
                        key={value}
                        type="button"
                        onClick={() => setTab(value)}
                        className={`rounded-full px-4 py-2 text-sm font-semibold ${
                            tab === value
                                ? "bg-btn text-btntext"
                                : "bg-surface text-body"
                        }`}
                    >
                        {value === "pending" ? "Pending" : "Recent"}
                    </button>
                ))}
            </div>

            <div className="mt-4 overflow-x-auto rounded-2xl border-2 border-line bg-card">
                <table className="w-full text-sm">
                    <thead className="bg-surface text-left">
                        <tr>
                            <th className="px-3 py-2">id</th>
                            <th className="px-3 py-2">email</th>
                            <th className="px-3 py-2">base</th>
                            <th className="px-3 py-2">code</th>
                            <th className="px-3 py-2">pay</th>
                            <th className="px-3 py-2">state</th>
                            <th className="px-3 py-2"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-3 py-6 text-center text-muted">
                                    {t("admin.empty")}
                                </td>
                            </tr>
                        ) : (
                            rows.map((o) => (
                                <tr key={o.id} className="border-t border-line">
                                    <td className="px-3 py-2 font-mono text-xs">
                                        {o.id.slice(0, 8)}
                                    </td>
                                    <td className="px-3 py-2">{o.email ?? "—"}</td>
                                    <td className="px-3 py-2">
                                        {o.baseIdr.toLocaleString("id-ID")}
                                    </td>
                                    <td className="px-3 py-2">{o.code}</td>
                                    <td className="px-3 py-2 font-semibold">
                                        {o.payIdr.toLocaleString("id-ID")}
                                    </td>
                                    <td className="px-3 py-2">{o.state}</td>
                                    <td className="px-3 py-2">
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                disabled={busy}
                                                onClick={() => act(o.id, "approve")}
                                                className="rounded-full bg-brand px-3 py-1 text-xs font-semibold text-ink disabled:opacity-50"
                                            >
                                                {t("admin.approve")}
                                            </button>
                                            <button
                                                type="button"
                                                disabled={busy}
                                                onClick={() => act(o.id, "reject")}
                                                className="rounded-full bg-mist px-3 py-1 text-xs font-semibold text-ink disabled:opacity-50"
                                            >
                                                {t("admin.reject")}
                                            </button>
                                        </div>
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
