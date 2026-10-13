"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PhoneShell from "../PhoneShell";
import { useApp } from "../AppProvider";
import { fill } from "@/lib/t";
import type { PaddleConfig } from "@/lib/billing/paddle";
import { CREDIT_TTL_DAYS, IDR_TOPUP_PRESETS as PRESETS } from "@/lib/billing/config";

type Props = {
    region: "id" | "intl";
    paddle: PaddleConfig & { configured: boolean };
    /** DOKU hosted checkout is configured (Indonesia). */
    doku: boolean;
    minIdr: number;
    idrPerCredit: number;
};

type DokuState = "pending" | "paid" | "failed" | "expired";

export default function TopUpClient({
    region,
    paddle,
    doku,
    minIdr,
    idrPerCredit,
}: Props) {
    const { t, auth, balance, lang, refreshBalance } = useApp();
    const router = useRouter();
    const params = useSearchParams();
    const returnedInvoice = params.get("doku");
    const [amount, setAmount] = useState(PRESETS[1]);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [dokuState, setDokuState] = useState<DokuState | null>(null);
    const [dokuAmount, setDokuAmount] = useState<number | null>(null);
    const paidCredits =
        dokuAmount != null ? Math.floor(dokuAmount / idrPerCredit) : null;

    // Back from DOKU's page: poll until the notification has landed.
    useEffect(() => {
        if (!returnedInvoice) return;
        let stop = false;
        let tries = 0;
        async function poll() {
            const res = await fetch(`/api/topup/doku/${returnedInvoice}`, { cache: "no-store" });
            const data = await res.json();
            if (stop) return;
            const state: DokuState | null = data.ok ? data.order.state : null;
            if (data.ok && typeof data.order.amount === "number") {
                setDokuAmount(data.order.amount);
            }
            setDokuState(state ?? "pending");
            if (state === "paid") {
                void refreshBalance();
                return;
            }
            if (state === "pending" && tries++ < 24) setTimeout(poll, 5000);
        }
        void poll();
        return () => {
            stop = true;
        };
    }, [returnedInvoice, refreshBalance]);

    useEffect(() => {
        if (region !== "intl" || !paddle.clientToken) return;
        const script = document.createElement("script");
        script.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
        script.onload = () => {
            const P = (window as unknown as { Paddle?: any }).Paddle;
            if (!P) return;
            if (paddle.env === "sandbox") P.Environment.set("sandbox");
            P.Initialize({ token: paddle.clientToken });
        };
        document.body.appendChild(script);
        return () => {
            script.remove();
        };
    }, [region, paddle.clientToken, paddle.env]);

    async function payWithDoku() {
        setBusy(true);
        setError(null);
        try {
            const res = await fetch("/api/topup/doku", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ amountIdr: amount }),
            });
            const data = await res.json();
            if (data.ok && data.order?.url) {
                window.location.assign(data.order.url);
                return;
            }
            setError(data.error || t("app.error.failed"));
        } catch {
            setError(t("app.error.network"));
        }
        setBusy(false);
    }

    function buyPaddle() {
        const P = (window as unknown as { Paddle?: any }).Paddle;
        if (!P) {
            setError(t("app.topup.checkoutLoading"));
            return;
        }
        P.Checkout.open({
            items: [{ priceId: paddle.priceId, quantity: 1 }],
            customData: { google_user_id: auth?.googleUserId ?? "" },
        });
    }

    return (
        <PhoneShell>
            <h2 className="mt-2 font-head text-3xl font-extrabold leading-none">
                {t("app.topup.title")}
            </h2>

            {region === "id" && returnedInvoice ? (
                <div
                    className={`rounded-2xl px-4 py-3 text-sm font-medium ${
                        dokuState === "paid"
                            ? "bg-peach text-ink"
                            : dokuState === "failed" || dokuState === "expired"
                              ? "bg-card text-danger"
                              : "bg-card text-muted"
                    }`}
                >
                    <p>{t(`app.topup.doku.${dokuState ?? "pending"}`)}</p>
                    {dokuState === "paid" && paidCredits != null ? (
                        <>
                            <p className="mt-1 font-head text-2xl font-extrabold">
                                {fill(t("app.credits.balance"), {
                                    count: paidCredits,
                                })}
                            </p>
                            <p className="text-xs">
                                {fill(t("app.credits.expires"), {
                                    date: new Date(
                                        Date.now() +
                                            CREDIT_TTL_DAYS *
                                                24 *
                                                60 *
                                                60 *
                                                1000
                                    ).toLocaleDateString(
                                        lang === "id" ? "id-ID" : "en-US"
                                    ),
                                })}
                            </p>
                        </>
                    ) : null}
                </div>
            ) : null}

            {region === "id" && dokuState === "paid" ? (
                <button
                    type="button"
                    onClick={() => router.push("/app/snap")}
                    className="rounded-full bg-btn px-6 py-4 font-semibold text-btntext"
                >
                    {t("app.topup.backToCamera")}
                </button>
            ) : null}

            {region === "id" ? (
                dokuState === "paid" ? null : (
                <>
                    <p className="text-muted">{t("app.topup.choose")}</p>
                    <div className="grid grid-cols-2 gap-2">
                        {PRESETS.map((p) => (
                            <button
                                key={p}
                                type="button"
                                onClick={() => setAmount(p)}
                                className={`rounded-2xl px-4 py-3 text-left font-semibold ${
                                    amount === p
                                        ? "bg-maroon text-white"
                                        : "bg-peach text-ink"
                                }`}
                            >
                                <span className="block">
                                    Rp {p.toLocaleString("id-ID")}
                                </span>
                                <span className="block text-xs font-medium opacity-80">
                                    {fill(t("app.topup.scans"), {
                                        count: Math.floor(p / idrPerCredit),
                                    })}
                                </span>
                            </button>
                        ))}
                    </div>
                    {balance?.configured ? (
                        <p className="text-sm text-muted">
                            {fill(t("app.topup.preview"), {
                                current: balance.credits,
                                after:
                                    balance.credits +
                                    Math.floor(amount / idrPerCredit),
                                date: new Date(
                                    Date.now() +
                                        CREDIT_TTL_DAYS * 24 * 60 * 60 * 1000
                                ).toLocaleDateString(
                                    lang === "id" ? "id-ID" : "en-US"
                                ),
                            })}
                        </p>
                    ) : null}
                    <label className="grid gap-1.5">
                        <span className="text-sm font-semibold">
                            {t("app.topup.custom")}
                        </span>
                        <input
                            type="number"
                            min={minIdr}
                            step={1000}
                            value={amount}
                            onChange={(e) => setAmount(Number(e.target.value))}
                            className="w-full rounded-2xl border-2 border-line bg-card px-4 py-3 text-body focus:border-brand focus:outline-none"
                        />
                    </label>
                    <p className="text-sm text-muted">
                        {fill(t("app.credits.balance"), {
                            count: Math.floor(amount / idrPerCredit),
                        })}
                    </p>
                    {error ? (
                        <p className="text-sm font-medium text-danger">{error}</p>
                    ) : null}
                    <button
                        type="button"
                        disabled={busy || amount < minIdr || !doku}
                        onClick={payWithDoku}
                        className="mt-auto rounded-full bg-btn px-6 py-4 font-semibold text-btntext disabled:opacity-60"
                    >
                        {t("app.topup.doku.pay")}
                    </button>
                    <p className="text-center text-xs text-muted">
                        {t(doku ? "app.topup.doku.methods" : "app.topup.unavailable")}
                    </p>
                </>
                )
            ) : (
                <>
                    <p className="text-muted">
                        {fill(t("app.topup.packBody"), {
                            credits: paddle.credits,
                            usd: paddle.usd,
                        })}
                    </p>
                    {error ? (
                        <p className="text-sm font-medium text-danger">{error}</p>
                    ) : null}
                    <button
                        type="button"
                        disabled={!paddle.configured}
                        onClick={buyPaddle}
                        className="mt-auto rounded-full bg-btn px-6 py-4 font-semibold text-btntext disabled:opacity-60"
                    >
                        {fill(t("app.topup.buy"), { credits: paddle.credits })}
                    </button>
                    {!paddle.configured ? (
                        <p className="text-center text-xs text-muted">
                            {t("app.topup.unavailable")}
                        </p>
                    ) : null}
                </>
            )}
        </PhoneShell>
    );
}
