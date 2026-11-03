"use client";

import { useCallback, useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useApp } from "./AppProvider";

type PairingSession = {
    code: string;
    expires_at: number;
    qr_payload: string;
};

type Props = {
    isOpen: boolean;
    onClose: () => void;
};

function formatCountdown(secondsLeft: number): string {
    const m = Math.floor(secondsLeft / 60);
    const s = secondsLeft % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function PairDeviceModal({ isOpen, onClose }: Props) {
    const { t } = useApp();
    const [session, setSession] = useState<PairingSession | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [secondsLeft, setSecondsLeft] = useState(0);
    const [qrVisible, setQrVisible] = useState(false);

    const generate = useCallback(async () => {
        setLoading(true);
        setError(null);
        setSession(null);
        setQrVisible(false);
        try {
            const res = await fetch("/api/auth/pair/generate", { method: "POST" });
            const data = await res.json();
            if (!res.ok || !data.ok) {
                setError(t("web.pairing.error"));
                return;
            }
            setSession(data as PairingSession);
            const now = Math.floor(Date.now() / 1000);
            setSecondsLeft(Math.max(0, Number(data.expires_at) - now));
        } catch {
            setError(t("web.pairing.error"));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        if (isOpen) {
            void generate();
        } else {
            setSession(null);
            setError(null);
            setQrVisible(false);
        }
    }, [isOpen, generate]);

    useEffect(() => {
        if (!session) return;
        const interval = setInterval(() => {
            setSecondsLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [session]);

    const isExpired = secondsLeft === 0 && session != null;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="relative w-full max-w-sm rounded-2xl bg-card p-6 text-body shadow-xl">
                <div className="mb-4 flex items-start justify-between gap-3">
                    <h2 className="font-head text-xl font-extrabold">
                        {t("web.pairing.title")}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-2xl leading-none text-muted hover:text-ink"
                        aria-label={t("web.pairing.close")}
                    >
                        ×
                    </button>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center py-8">
                        <span
                            className="h-8 w-8 animate-spin rounded-full border-4 border-line border-t-brand"
                            aria-hidden
                        />
                        <p className="mt-3 text-sm text-muted">
                            {t("web.pairing.generating")}
                        </p>
                    </div>
                ) : null}

                {error && !loading ? (
                    <div className="rounded-xl bg-mist p-4 text-sm text-danger">
                        <p>{error}</p>
                        <button
                            type="button"
                            onClick={() => void generate()}
                            className="mt-2 font-semibold underline"
                        >
                            {t("web.pairing.generate")}
                        </button>
                    </div>
                ) : null}

                {session && !loading ? (
                    <>
                        <p className="mb-4 text-sm text-muted">
                            {t("web.pairing.instruction")}
                        </p>

                        <div className="mb-4 flex justify-center">
                            <span
                                className={`rounded-xl border-2 px-5 py-3 font-mono text-2xl font-extrabold tracking-[0.2em] ${
                                    isExpired
                                        ? "border-line text-muted"
                                        : "border-brand text-ink"
                                }`}
                            >
                                {session.code}
                            </span>
                        </div>

                        <p
                            className={`mb-4 text-center text-sm font-semibold ${
                                isExpired
                                    ? "text-danger"
                                    : secondsLeft < 60
                                      ? "text-amber-700"
                                      : "text-muted"
                            }`}
                        >
                            {isExpired
                                ? t("web.pairing.expired")
                                : `${t("web.pairing.expires")} ${formatCountdown(secondsLeft)}`}
                        </p>

                        {!isExpired ? (
                            <button
                                type="button"
                                onClick={() => setQrVisible((v) => !v)}
                                className="mb-4 w-full rounded-xl border border-line py-2 text-sm font-semibold text-muted hover:text-ink"
                            >
                                {qrVisible
                                    ? t("web.pairing.qrHide")
                                    : t("web.pairing.qrShow")}
                            </button>
                        ) : null}

                        {qrVisible && !isExpired ? (
                            <div className="mb-4 flex justify-center rounded-xl bg-surface p-4">
                                <QRCodeSVG
                                    value={session.qr_payload}
                                    size={180}
                                    level="M"
                                    includeMargin
                                />
                            </div>
                        ) : null}

                        <button
                            type="button"
                            onClick={() => void generate()}
                            className="w-full rounded-xl bg-brand px-4 py-3 text-sm font-bold text-ink hover:opacity-90"
                        >
                            {t("web.pairing.generate")}
                        </button>
                    </>
                ) : null}
            </div>
        </div>
    );
}
