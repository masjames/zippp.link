"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import PhoneShell from "@/components/app/PhoneShell";
import { useApp } from "@/components/app/AppProvider";
import { IDR_PER_CREDIT } from "@/lib/billing/config";
import { fill } from "@/lib/t";

type Order = {
    id: string;
    amount: number;
    status: "pending" | "succeeded" | "failed" | "expired" | "canceled";
    expiresAt: number;
    checkoutUrl: string;
};

/** Return page after the Kasera hosted QRIS checkout. */
export default function QrisOrderPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const { t, refreshBalance } = useApp();
    const [order, setOrder] = useState<Order | null>(null);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        const res = await fetch(`/api/topup/qris/${id}`, { cache: "no-store" });
        const data = await res.json();
        if (data.ok) {
            setOrder(data.order as Order);
            setError(null);
        } else {
            setError(data.error || t("app.error.failed"));
        }
    }, [id, t]);

    useEffect(() => {
        void load();
        const poll = setInterval(() => void load(), 3000);
        return () => clearInterval(poll);
    }, [load]);

    useEffect(() => {
        if (order?.status === "succeeded") void refreshBalance();
    }, [order?.status, refreshBalance]);

    const credits = order ? Math.floor(order.amount / IDR_PER_CREDIT) : 0;
    const settled = order?.status === "succeeded";
    const dead =
        order?.status === "expired" ||
        order?.status === "failed" ||
        order?.status === "canceled";

    return (
        <PhoneShell>
            <h2 className="mt-2 font-head text-3xl font-extrabold leading-none">
                {t("app.topup.title")}
            </h2>

            {order ? (
                <>
                    <div className="rounded-2xl bg-surface p-4">
                        <p className="text-sm font-semibold">
                            {settled
                                ? t("app.qris.paid")
                                : dead
                                  ? t("app.qris.expired")
                                  : t("app.qris.waiting")}
                        </p>
                        <p className="mt-1 font-head text-2xl font-extrabold tabular-money">
                            Rp {order.amount.toLocaleString("id-ID")}
                        </p>
                        {settled ? (
                            <p className="mt-1 text-sm text-muted">
                                {fill(t("app.qris.credits"), { count: credits })}
                            </p>
                        ) : null}
                    </div>

                    <div className="mt-auto grid gap-3">
                        {!settled && !dead ? (
                            <a
                                href={order.checkoutUrl}
                                className="rounded-full bg-btn px-6 py-4 text-center font-semibold text-btntext"
                            >
                                {t("app.qris.open")}
                            </a>
                        ) : null}
                        {settled ? (
                            <button
                                type="button"
                                onClick={() => router.push("/app/snap")}
                                className="rounded-full bg-btn px-6 py-4 font-semibold text-btntext"
                            >
                                {t("app.qris.backSnap")}
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => router.push("/app/topup")}
                                className="rounded-full bg-mist px-6 py-4 font-semibold text-ink"
                            >
                                {t("app.qris.backTopup")}
                            </button>
                        )}
                    </div>
                </>
            ) : error ? (
                <p className="mt-8 text-center text-sm font-medium text-danger">
                    {error}
                </p>
            ) : (
                <p className="mt-8 text-center text-muted">…</p>
            )}
        </PhoneShell>
    );
}
