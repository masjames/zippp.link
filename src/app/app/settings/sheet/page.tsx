"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PhoneShell from "@/components/app/PhoneShell";
import SheetsScreen from "@/components/app/screens/SheetsScreen";
import { useApp } from "@/components/app/AppProvider";

/** Sheet status, create/choose, reconnect, and picker. */
export default function SheetPage() {
    const {
        t,
        workspace,
        candidates,
        sheetError,
        busy,
        ensureSheet,
        pickSheet,
        createSheet,
        listSheets,
    } = useApp();
    const router = useRouter();
    const [notice, setNotice] = useState<string | null>(null);

    useEffect(() => {
        if (!workspace) void ensureSheet();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // A pick shows whenever candidates were loaded, from the guard or Choose.
    if (candidates.length > 0) {
        return (
            <SheetsScreen
                t={t}
                busy={busy}
                error={sheetError}
                candidates={candidates}
                onPick={(id) => {
                    setNotice(null);
                    void pickSheet(id);
                }}
                onRetry={() => void ensureSheet()}
            />
        );
    }

    if (workspace) {
        return (
            <PhoneShell>
                <h2 className="mt-2 font-head text-3xl font-extrabold leading-none">
                    {t("app.sheets.connected")}
                </h2>
                <p className="text-muted">
                    {workspace.spreadsheet_title} · {workspace.sheet_tab}
                </p>
                {notice ? (
                    <p className="text-sm font-medium text-danger">{notice}</p>
                ) : null}
                <div className="mt-auto grid gap-3">
                    <button
                        type="button"
                        disabled={busy}
                        onClick={async () => {
                            setNotice(null);
                            const count = await listSheets();
                            if (count === 0) setNotice(t("app.sheets.none"));
                        }}
                        className="rounded-full bg-mist px-6 py-4 font-semibold text-ink disabled:opacity-60"
                    >
                        {t("app.sheets.choose")}
                    </button>
                    <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                            setNotice(null);
                            void createSheet();
                        }}
                        className="rounded-full bg-mist px-6 py-4 font-semibold text-ink disabled:opacity-60"
                    >
                        {t("app.sheets.create")}
                    </button>
                    <button
                        type="button"
                        disabled={busy}
                        onClick={() => void ensureSheet()}
                        className="rounded-full bg-mist px-6 py-4 font-semibold text-ink disabled:opacity-60"
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
            onPick={(id) => void pickSheet(id)}
            onRetry={() => void ensureSheet()}
        />
    );
}
