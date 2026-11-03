"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/components/app/AppProvider";
import { fill } from "@/lib/t";

type Plan = {
    status: "active" | "canceled";
    included: number;
    used: number;
    used_pct: number;
    period_end: number;
};

export default function PlanCard() {
    const { t } = useApp();
    const [plan, setPlan] = useState<Plan | null>(null);
    const [loaded, setLoaded] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(false);

    useEffect(() => {
        fetch("/api/billing/plan", { cache: "no-store" })
            .then((res) => res.json())
            .then((data) => setPlan((data.plan as Plan | null) ?? null))
            .catch(() => setPlan(null))
            .finally(() => setLoaded(true));
    }, []);

    async function subscribe() {
        setBusy(true);
        setError(false);
        try {
            const res = await fetch("/api/billing/subscribe", { method: "POST" });
            const data = await res.json();
            if (!res.ok || !data.ok || typeof data.url !== "string") {
                throw new Error("CHECKOUT_UNAVAILABLE");
            }
            window.location.href = data.url;
        } catch {
            setError(true);
            setBusy(false);
        }
    }

    if (!loaded) return null;

    return (
        <div className="rounded-2xl bg-card p-4">
            <div className="flex items-baseline justify-between gap-2">
                <p className="font-semibold">{t("app.plan.title")}</p>
                <span className="text-xs font-semibold text-muted">
                    {plan
                        ? t(
                              plan.status === "active"
                                  ? "app.plan.active"
                                  : "app.plan.canceled"
                          )
                        : t("app.plan.free")}
                </span>
            </div>

            {plan ? (
                <>
                    <div
                        className="mt-3 h-2 w-full overflow-hidden rounded-full bg-page"
                        role="meter"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={plan.used_pct}
                    >
                        <div
                            className="h-full rounded-full bg-brand"
                            style={{ width: `${plan.used_pct}%` }}
                        />
                    </div>
                    <p className="mt-2 text-xs text-muted">
                        {fill(t("app.plan.used"), {
                            used: plan.used,
                            included: plan.included,
                        })}{" "}
                        ·{" "}
                        {fill(t("app.plan.percent"), {
                            percent: plan.used_pct,
                        })}
                    </p>
                    <p className="text-xs text-muted">
                        {fill(t("app.plan.periodEnd"), {
                            date: new Date(plan.period_end).toLocaleDateString(),
                        })}
                    </p>
                </>
            ) : (
                <p className="mt-2 text-xs text-muted">{t("app.plan.body")}</p>
            )}

            <button
                type="button"
                disabled={busy}
                onClick={() => void subscribe()}
                className="mt-3 w-full rounded-full bg-brand px-4 py-3 text-sm font-semibold text-ink disabled:opacity-50"
            >
                {busy
                    ? t("app.plan.busy")
                    : plan
                      ? t("app.plan.renew")
                      : t("app.plan.subscribe")}
            </button>
            {error ? (
                <p className="mt-2 text-xs text-danger">{t("app.plan.error")}</p>
            ) : null}
        </div>
    );
}
