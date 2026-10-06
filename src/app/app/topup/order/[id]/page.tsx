"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import PhoneShell from "@/components/app/PhoneShell";
import { useApp } from "@/components/app/AppProvider";
import { fill } from "@/lib/t";

type Order = {
    id: string;
    baseIdr: number;
    payIdr: number;
    state: "pending" | "claimed" | "approved" | "rejected" | "expired";
    expiresAt: number;
};

function remaining(expiresAt: number): string {
    const ms = expiresAt - Date.now();
    if (ms <= 0) return "0:00";
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${m}:${String(s).padStart(2, "0")}`;
}

export default function OrderPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const { t, refreshBalance } = useApp();
    const [order, setOrder] = useState<Order | null>(null);
    const [gopay, setGopay] = useState<{ number: string; name: string } | null>(null);
    const [busy, setBusy] = useState(false);
    const [tick, setTick] = useState(0);

    const load = useCallback(async () => {
        const res = await fetch(`/api/topup/orders/${id}`, { cache: "no-store" });
        const data = await res.json();
        if (data.ok) {
            setOrder(data.order as Order);
            setGopay(data.gopay as { number: string; name: string });
        }
    }, [id]);

    useEffect(() => {
        void load();
        const poll = setInterval(() => void load(), 5000);
        const clock = setInterval(() => setTick((n) => n + 1), 1000);
        return () => {
            clearInterval(poll);
            clearInterval(clock);
        };
    }, [load]);

    useEffect(() => {
        if (order?.state === "approved") void refreshBalance();
    }, [order?.state, refreshBalance]);

    async function iPaid() {
        setBusy(true);
        try {
            await fetch(`/api/topup/orders/${id}/claim`, { method: "POST" });
            await load();
        } finally {
            setBusy(false);
        }
    }

    const statusText =
        order?.state === "approved"
            ? t("app.order.approved")
            : order?.state === "rejected"
              ? t("app.order.rejected")
              : order?.state === "expired"
                ? t("app.order.expired")
                : order?.state === "claimed"
                  ? t("app.order.claimed")
                  : t("app.order.waiting");

    return (
        <PhoneShell>
            <h2 className="mt-2 font-head text-3xl font-extrabold leading-none">
                {t("app.topup.title")}
            </h2>

            {order ? (
                <>
                    <div className="rounded-2xl bg-surface p-4">
                        <p className="text-sm font-semibold">
                            {t("app.order.payTo")}
                        </p>
                        <p className="mt-1 font-mono text-lg">{gopay?.number}</p>
                        <p className="text-sm text-muted">{gopay?.name}</p>
                    </div>

                    <div className="rounded-2xl bg-card p-4">
                        <p className="text-sm text-muted">
                            {t("app.order.amount")}
                        </p>
                        <p className="font-head text-2xl font-extrabold">
                            Rp {order.payIdr.toLocaleString("id-ID")}
                        </p>
                        {order.state === "pending" ? (
                            <p className="mt-1 text-sm text-muted">
                                {fill(t("app.order.expiresIn"), {
                                    time: remaining(order.expiresAt),
                                })}
                            </p>
                        ) : null}
                    </div>

                    <p className="text-center text-sm font-medium">{statusText}</p>

                    <div className="mt-auto grid gap-3">
                        {order.state === "pending" ? (
                            <button
                                type="button"
                                disabled={busy}
                                onClick={iPaid}
                                className="rounded-full bg-btn px-6 py-4 font-semibold text-btntext disabled:opacity-60"
                            >
                                {t("app.order.paid")}
                            </button>
                        ) : null}
                        <button
                            type="button"
                            onClick={() => router.push("/app/snap")}
                            className="rounded-full bg-mist px-6 py-4 font-semibold text-ink"
                        >
                            {t("app.nav.back")}
                        </button>
                    </div>
                </>
            ) : (
                <p className="mt-8 text-center text-muted">…</p>
            )}
        </PhoneShell>
    );
}
