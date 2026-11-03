"use client";

import { useCallback, useEffect, useState } from "react";
import { useApp } from "./AppProvider";

type Status = { linked: boolean };

export default function TelegramLinkPanel() {
    const { t } = useApp();
    const [status, setStatus] = useState<Status | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(false);

    const load = useCallback(async () => {
        try {
            const res = await fetch("/api/telegram/link", { cache: "no-store" });
            const data = await res.json();
            if (!res.ok || !data.ok) {
                setError(true);
                return;
            }
            setStatus({ linked: Boolean(data.linked) });
        } catch {
            setError(true);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    async function start() {
        setBusy(true);
        setError(false);
        try {
            const res = await fetch("/api/telegram/link", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "start" }),
            });
            const data = await res.json();
            if (!res.ok || !data.ok || !data.url) {
                setError(true);
                return;
            }
            window.open(data.url, "_blank", "noopener,noreferrer");
        } catch {
            setError(true);
        } finally {
            setBusy(false);
        }
    }

    async function unlink() {
        if (!window.confirm(t("web.telegram.unlink"))) return;
        setBusy(true);
        setError(false);
        try {
            const res = await fetch("/api/telegram/link", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "unlink" }),
            });
            if (!res.ok) {
                setError(true);
                return;
            }
            setStatus({ linked: false });
        } catch {
            setError(true);
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="rounded-2xl bg-card p-4">
            <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">{t("web.telegram.title")}</p>
                {status?.linked ? (
                    <button
                        type="button"
                        disabled={busy}
                        onClick={() => void unlink()}
                        className="text-xs font-semibold text-danger disabled:opacity-50"
                    >
                        {t("web.telegram.unlink")}
                    </button>
                ) : (
                    <button
                        type="button"
                        disabled={busy || status === null}
                        onClick={() => void start()}
                        className="text-xs font-semibold text-brand disabled:opacity-50"
                    >
                        {t("web.telegram.link")}
                    </button>
                )}
            </div>
            <p className="mt-2 text-sm text-muted">
                {status?.linked
                    ? t("web.telegram.linked")
                    : t("web.telegram.notLinked")}
            </p>
            {error ? (
                <p className="mt-2 text-xs text-danger">{t("web.telegram.error")}</p>
            ) : null}
        </div>
    );
}
