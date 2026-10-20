"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fill, type T } from "@/lib/t";

type LinkState = {
    enabled: boolean;
    configured: boolean;
    mock: boolean;
    live: boolean;
    linked: { phone: string; linkedAt: number } | null;
    mockUrl: string | null;
};

export default function WaLinkPanel({ t }: { t: T }) {
    const router = useRouter();
    const [state, setState] = useState<LinkState | null>(null);
    const [busy, setBusy] = useState(false);
    const [openUrl, setOpenUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        const res = await fetch("/api/wa/link");
        if (!res.ok) {
            setState({
                enabled: false,
                configured: false,
                mock: false,
                live: false,
                linked: null,
                mockUrl: null,
            });
            return;
        }
        const data = (await res.json()) as {
            enabled?: boolean;
            configured?: boolean;
            mock?: boolean;
            live?: boolean;
            mockUrl?: string | null;
            linked?: { phone: string; linkedAt: number } | null;
        };
        setState({
            enabled: Boolean(data.enabled),
            configured: Boolean(data.configured),
            mock: Boolean(data.mock),
            live: Boolean(data.live),
            linked: data.linked ?? null,
            mockUrl: data.mockUrl ?? null,
        });
    }, []);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    if (!state?.enabled) return null;
    const isMock = state.mock;

    async function startLink() {
        setBusy(true);
        setError(null);
        try {
            const res = await fetch("/api/wa/link", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: isMock ? "mock" : "start",
                }),
            });
            const data = (await res.json()) as {
                ok?: boolean;
                openUrl?: string;
                mock?: boolean;
                error?: string;
            };
            if (!res.ok || !data.ok) {
                setError(data.error ?? "Failed");
                return;
            }
            if (data.mock && data.openUrl) {
                router.push(data.openUrl);
                return;
            }
            if (data.openUrl) {
                setOpenUrl(data.openUrl);
                window.open(data.openUrl, "_blank", "noopener,noreferrer");
            }
            await refresh();
        } finally {
            setBusy(false);
        }
    }

    async function unlink() {
        setBusy(true);
        setError(null);
        try {
            await fetch("/api/wa/link", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "unlink" }),
            });
            setOpenUrl(null);
            await refresh();
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="rounded-2xl bg-card p-4">
            <div className="flex flex-wrap items-baseline gap-2">
                <p className="text-sm font-semibold">{t("app.wa.link.title")}</p>
                {state.mock ? (
                    <span className="text-[10px] font-bold uppercase tracking-wide text-brand">
                        {t("app.wa.mock.badge")}
                    </span>
                ) : null}
            </div>
            <p className="mt-1 text-sm text-muted">
                {state.mock ? t("app.wa.mock.panelBody") : t("app.wa.link.body")}
            </p>

            {state.mock ? (
                <div className="mt-3 grid gap-2">
                    <button
                        type="button"
                        disabled={busy}
                        onClick={() => void startLink()}
                        className="rounded-full bg-btn px-4 py-3 text-sm font-semibold text-btntext disabled:opacity-60"
                    >
                        {t("app.wa.mock.open")}
                    </button>
                    {state.mockUrl ? (
                        <button
                            type="button"
                            onClick={() => router.push(state.mockUrl!)}
                            className="text-center text-xs font-semibold text-brand"
                        >
                            {state.mockUrl}
                        </button>
                    ) : null}
                </div>
            ) : !state.configured ? (
                <p className="mt-2 text-xs text-muted">{t("app.wa.disabled")}</p>
            ) : state.linked ? (
                <div className="mt-3 grid gap-2">
                    <p className="text-sm font-semibold">
                        {fill(t("app.wa.link.linked"), {
                            phone: state.linked.phone,
                        })}
                    </p>
                    <button
                        type="button"
                        disabled={busy}
                        onClick={() => void unlink()}
                        className="rounded-full bg-mist px-4 py-3 text-sm font-semibold text-ink disabled:opacity-60"
                    >
                        {t("app.wa.link.unlink")}
                    </button>
                </div>
            ) : (
                <div className="mt-3 grid gap-2">
                    <button
                        type="button"
                        disabled={busy}
                        onClick={() => void startLink()}
                        className="rounded-full bg-btn px-4 py-3 text-sm font-semibold text-btntext disabled:opacity-60"
                    >
                        {t("app.wa.link.button")}
                    </button>
                    {openUrl ? (
                        <a
                            href={openUrl}
                            className="text-center text-xs font-semibold text-brand"
                            target="_blank"
                            rel="noreferrer"
                        >
                            {t("app.wa.link.open")}
                        </a>
                    ) : null}
                </div>
            )}
            {error ? <p className="mt-2 text-xs text-red-700">{error}</p> : null}
        </div>
    );
}
