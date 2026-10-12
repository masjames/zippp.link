"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PhoneShell from "@/components/app/PhoneShell";
import SheetsScreen from "@/components/app/screens/SheetsScreen";
import { useApp, type SheetTemplateId } from "@/components/app/AppProvider";

const TEMPLATES: { id: SheetTemplateId; name: string; body: string }[] = [
    { id: "resto-inventory", name: "app.sheets.tpl.resto", body: "app.sheets.tpl.restoBody" },
    { id: "personal-expense", name: "app.sheets.tpl.expense", body: "app.sheets.tpl.expenseBody" },
    { id: "custom", name: "app.sheets.tpl.custom", body: "app.sheets.tpl.customBody" },
];

/** Sheet status, create wizard, choose, reconnect, and picker. */
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
    const [wizard, setWizard] = useState(false);

    useEffect(() => {
        if (!workspace) void ensureSheet();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function chooseTemplate(id: SheetTemplateId) {
        setNotice(null);
        await createSheet(id);
        setWizard(false);
    }

    if (wizard) {
        return (
            <PhoneShell>
                <h2 className="mt-2 font-head text-3xl font-extrabold leading-none">
                    {t("app.sheets.wizard.title")}
                </h2>
                <p className="text-muted">{t("app.sheets.wizard.body")}</p>
                <div className="mt-2 grid gap-2">
                    {TEMPLATES.map((tpl) => (
                        <button
                            key={tpl.id}
                            type="button"
                            disabled={busy}
                            onClick={() => void chooseTemplate(tpl.id)}
                            className="rounded-2xl border-2 border-line bg-card px-4 py-3 text-left disabled:opacity-60"
                        >
                            <span className="block font-semibold">{t(tpl.name)}</span>
                            <span className="block text-xs text-muted">{t(tpl.body)}</span>
                        </button>
                    ))}
                </div>
                {busy ? (
                    <span
                        className="mx-auto mt-4 h-8 w-8 animate-spin rounded-full border-4 border-line border-t-brand"
                        aria-hidden
                    />
                ) : (
                    <button
                        type="button"
                        onClick={() => setWizard(false)}
                        className="mt-auto rounded-full bg-mist px-6 py-4 font-semibold text-ink"
                    >
                        {t("app.nav.back")}
                    </button>
                )}
            </PhoneShell>
        );
    }

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
                        onClick={() =>
                            window.open(
                                `https://docs.google.com/spreadsheets/d/${workspace.spreadsheet_id}/edit`,
                                "_blank",
                                "noopener,noreferrer"
                            )
                        }
                        className="rounded-full bg-brand px-6 py-4 font-semibold text-ink"
                    >
                        {t("app.sheets.open")}
                    </button>
                    <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                            setNotice(null);
                            setWizard(true);
                        }}
                        className="rounded-full bg-mist px-6 py-4 font-semibold text-ink disabled:opacity-60"
                    >
                        {t("app.sheets.create")}
                    </button>
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
