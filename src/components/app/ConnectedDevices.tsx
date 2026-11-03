"use client";

import { useCallback, useEffect, useState } from "react";
import { useApp } from "./AppProvider";

type Device = {
    device_id: string;
    device_name: string;
    platform: string;
    app_version: string;
    paired_at: number;
    last_seen_at: number;
    revoked: boolean;
};

function formatDate(ms: number, lang: string): string {
    if (!ms) return "-";
    try {
        return new Date(ms).toLocaleString(lang === "id" ? "id-ID" : "en-US", {
            dateStyle: "medium",
            timeStyle: "short",
        });
    } catch {
        return "-";
    }
}

export default function ConnectedDevices() {
    const { t, lang } = useApp();
    const [devices, setDevices] = useState<Device[] | null>(null);
    const [error, setError] = useState(false);
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        setError(false);
        try {
            const res = await fetch("/api/auth/devices", { cache: "no-store" });
            const data = await res.json();
            if (!res.ok || !data.ok) {
                setError(true);
                setDevices([]);
                return;
            }
            setDevices(Array.isArray(data.devices) ? data.devices : []);
        } catch {
            setError(true);
            setDevices([]);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    async function revoke(deviceId?: string) {
        if (!window.confirm(t("web.devices.confirmRevoke"))) return;
        setBusy(true);
        try {
            const body = deviceId ? { device_id: deviceId } : { revoke_all: true };
            await fetch("/api/auth/device/revoke", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            await load();
        } catch {
            setError(true);
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="rounded-2xl bg-card p-4">
            <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">{t("web.devices.title")}</p>
                {devices && devices.some((d) => !d.revoked) ? (
                    <button
                        type="button"
                        disabled={busy}
                        onClick={() => void revoke()}
                        className="text-xs font-semibold text-danger disabled:opacity-50"
                    >
                        {t("web.devices.revoke_all")}
                    </button>
                ) : null}
            </div>

            {devices === null ? (
                <p className="mt-2 text-sm text-muted">{t("web.devices.loading")}</p>
            ) : error ? (
                <p className="mt-2 text-sm text-danger">{t("web.devices.error")}</p>
            ) : devices.length === 0 ? (
                <p className="mt-2 text-sm text-muted">{t("web.devices.empty")}</p>
            ) : (
                <ul className="mt-2 divide-y divide-line">
                    {devices.map((device) => (
                        <li key={device.device_id} className="py-3">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold">
                                        {device.device_name}
                                    </p>
                                    <p className="text-xs text-muted">
                                        {device.platform} · {device.app_version}
                                    </p>
                                    <p className="text-xs text-muted">
                                        {t("web.devices.paired_at")}:{" "}
                                        {formatDate(device.paired_at, lang)}
                                    </p>
                                    <p className="text-xs text-muted">
                                        {t("web.devices.last_seen")}:{" "}
                                        {formatDate(device.last_seen_at, lang)}
                                    </p>
                                </div>
                                {device.revoked ? (
                                    <span className="flex-none text-xs font-semibold text-muted">
                                        {t("web.devices.revoked")}
                                    </span>
                                ) : (
                                    <button
                                        type="button"
                                        disabled={busy}
                                        onClick={() => void revoke(device.device_id)}
                                        className="flex-none text-xs font-semibold text-danger disabled:opacity-50"
                                    >
                                        {t("web.devices.revoke")}
                                    </button>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
