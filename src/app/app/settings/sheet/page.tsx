"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import PhoneShell from "@/components/app/PhoneShell";
import SheetsScreen from "@/components/app/screens/SheetsScreen";
import { useApp } from "@/components/app/AppProvider";

/** Sheet status, reconnect, and picker. Guards to here when no sheet is set. */
export default function SheetPage() {
    const {
        t,
        workspace,
        candidates,
        sheetError,
        busy,
        ensureSheet,
        pickSheet,
    } = useApp();
    const router = useRouter();

    useEffect(() => {
        if (!workspace) void ensureSheet();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (workspace) {
        return (
            <PhoneShell>
                <h2 className="mt-2 font-head text-3xl font-extrabold leading-none">
                    {t("app.sheets.connected")}
                </h2>
                <p className="text-muted">
                    {workspace.spreadsheet_title} · {workspace.sheet_tab}
                </p>
                <div className="mt-auto grid gap-3">
                    <button
                        type="button"
                        onClick={() => void ensureSheet()}
                        className="rounded-full bg-mist px-6 py-4 font-semibold text-ink"
                    >
                        {t("app.sheets.reconnect")}
                    </button>
                    <button
                        type="button"
                        onClick={() => router.push("/app/snap")}
                        className="rounded-full bg-btn px-6 py-4 font-semibold text-btntext"
                    >
                        {t("app.sheets.continue")}
                    </button>
                </div>
            </PhoneShell>
        );
    }

    return (
        <SheetsScreen
            t={t}
            busy={busy}
            error={sheetError}
            candidates={candidates}
            onPick={pickSheet}
            onRetry={ensureSheet}
        />
    );
}
