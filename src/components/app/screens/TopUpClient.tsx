"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PhoneShell from "../PhoneShell";
import { useApp } from "../AppProvider";
import { fill } from "@/lib/t";
import type { PaddleConfig } from "@/lib/billing/paddle";
import { IDR_TOPUP_PRESETS as PRESETS } from "@/lib/billing/config";

type Props = {
    region: "id" | "intl";
    paddle: PaddleConfig & { configured: boolean };
    /** Manual GoPay is configured (Indonesia). */
    gopay: boolean;
    minIdr: number;
    /** The open invite belongs to another email. */
    inviteMismatch?: string | null;
    idrPerCredit: number;
};

export default function TopUpClient({
    region,
    paddle,
    gopay,
    minIdr,
    inviteMismatch,
    idrPerCredit,
}: Props) {
    const { t, auth } = useApp();
    const router = useRouter();
    const presets = minIdr < PRESETS[0] ? [minIdr, ...PRESETS] : PRESETS;
    const [amount, setAmount] = useState(
        minIdr < PRESETS[0] ? minIdr : PRESETS[1]
    );
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

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

    async function createGoPayOrder() {
        setBusy(true);
        setError(null);
        try {
            const res = await fetch("/api/topup/orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ baseIdr: amount }),
            });
            const data = await res.json();
            if (data.ok && data.order?.id) {
                router.push(`/app/topup/order/${data.order.id}`);
                return;
            }
            setError(data.error || t("app.error.failed"));
        } catch {
            setError(t("app.error.network"));
        } finally {
            setBusy(false);
        }
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

            {region === "id" ? (
                <>
                    {inviteMismatch ? (
                        <p className="rounded-2xl bg-peach px-4 py-3 text-sm font-semibold text-ink">
                            {fill(t("app.invite.mismatch"), {
                                email: inviteMismatch,
                            })}
                        </p>
                    ) : null}
                    <p className="text-muted">{t("app.topup.choose")}</p>
                    <p className="text-xs text-muted">{t("app.topup.gopay.methods")}</p>
                    <div className="grid grid-cols-2 gap-2">
                        {presets.map((p) => (
                            <button
                                key={p}
                                type="button"
                                onClick={() => setAmount(p)}
                                className={`rounded-2xl px-4 py-3 font-semibold ${
                                    amount === p
                                        ? "bg-maroon text-white"
                                        : "bg-card text-ink shadow-sm"
                                }`}
                            >
                                Rp {p.toLocaleString("id-ID")}
                            </button>
                        ))}
                    </div>
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
                        disabled={busy || amount < minIdr || !gopay}
                        onClick={createGoPayOrder}
                        className="mt-auto rounded-full bg-btn px-6 py-4 font-semibold text-btntext disabled:opacity-60"
                    >
                        {t("app.topup.create")}
                    </button>
                    {!gopay ? (
                        <p className="text-center text-xs text-muted">
                            {t("app.topup.unavailable")}
                        </p>
                    ) : null}
                </>
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
