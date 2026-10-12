"use client";

import { useRouter } from "next/navigation";
import PhoneShell from "@/components/app/PhoneShell";
import { useApp, type SheetTemplateId } from "@/components/app/AppProvider";
import { fill } from "@/lib/t";

const TEMPLATES: { id: SheetTemplateId; name: string; body: string }[] = [
    { id: "resto-inventory", name: "app.sheets.tpl.resto", body: "app.sheets.tpl.restoBody" },
    { id: "personal-expense", name: "app.sheets.tpl.expense", body: "app.sheets.tpl.expenseBody" },
    { id: "custom", name: "app.sheets.tpl.custom", body: "app.sheets.tpl.customBody" },
];

function Centered({ children }: { children: React.ReactNode }) {
    return (
        <PhoneShell>
            <div className="flex flex-1 flex-col items-center justify-center text-center">
                {children}
            </div>
        </PhoneShell>
    );
}

function Spinner() {
    return (
        <span
            className="h-9 w-9 animate-spin rounded-full border-4 border-line border-t-brand"
            aria-hidden
        />
    );
}

/** One screen at a time: check, choose, pick, wizard, create, connected. */
export default function SheetPage() {
    const {
        t,
        workspace,
        sheetPhase,
        sheetBusy,
        sheetError,
        sheetCandidates,
        sheetCreated,
        pendingTemplate,
        checkSheet,
        showWizard,
        showPicker,
        cancelSheetChoice,
        pickSheet,
        recheckSheet,
        createSheet,
    } = useApp();
    const router = useRouter();

    const templateLabel = (id: string | null) => {
        const found = TEMPLATES.find((x) => x.id === id);
        return found ? t(found.name) : "";
    };

    if (sheetPhase === "checking") {
        return (
            <Centered>
                <Spinner />
                <p className="mt-6 text-lg text-muted">{t("app.sheets.checking")}</p>
            </Centered>
        );
    }

    if (sheetPhase === "creating") {
        return (
            <Centered>
                <Spinner />
                <p className="mt-6 text-lg text-muted">
                    {fill(t("app.sheets.creating"), {
                        template: templateLabel(pendingTemplate),
                    })}
                </p>
            </Centered>
        );
    }

    if (sheetPhase === "error") {
        return (
            <Centered>
                <p className="text-2xl font-semibold">{t("app.sheets.error")}</p>
                {sheetError ? (
                    <p className="mt-2 text-sm text-muted">{sheetError}</p>
                ) : null}
                <button
                    type="button"
                    onClick={() => void checkSheet()}
                    className="mt-8 w-full rounded-full bg-btn px-6 py-4 font-semibold text-btntext"
                >
                    {t("app.sheets.retry")}
                </button>
            </Centered>
        );
    }

    if (sheetPhase === "choose-source") {
        return (
            <PhoneShell>
                <h2 className="mt-2 font-head text-3xl font-extrabold leading-none">
                    {t("app.sheets.chooseTitle")}
                </h2>
                <p className="text-muted">{t("app.sheets.chooseBody")}</p>
                <div className="mt-auto grid gap-3">
                    <button
                        type="button"
                        onClick={showWizard}
                        className="rounded-full bg-btn px-6 py-4 font-semibold text-btntext"
                    >
                        {t("app.sheets.create")}
                    </button>
                    <button
                        type="button"
                        onClick={() => void showPicker()}
                        className="rounded-full bg-mist px-6 py-4 font-semibold text-ink"
                    >
                        {t("app.sheets.useExisting")}
                    </button>
                </div>
            </PhoneShell>
        );
    }

    if (sheetPhase === "wizard") {
        return (
            <PhoneShell>
                <h2 className="mt-2 font-head text-3xl font-extrabold leading-none">
                    {t("app.sheets.wizard.title")}
                </h2>
                <p className="text-muted">{t("app.sheets.wizard.body")}</p>
                {workspace ? (
                    <p className="text-xs text-muted">
                        {t("app.sheets.wizard.warn")}
                    </p>
                ) : null}
                <div className="mt-2 grid gap-2">
                    {TEMPLATES.map((tpl) => (
                        <button
                            key={tpl.id}
                            type="button"
                            disabled={sheetBusy}
                            onClick={() => void createSheet(tpl.id)}
                            className="rounded-2xl border-2 border-line bg-card px-4 py-3 text-left disabled:opacity-60"
                        >
                            <span className="block font-semibold">{t(tpl.name)}</span>
                            <span className="block text-xs text-muted">{t(tpl.body)}</span>
                        </button>
                    ))}
                </div>
                <button
                    type="button"
                    onClick={cancelSheetChoice}
                    className="mt-auto rounded-full bg-mist px-6 py-4 font-semibold text-ink"
                >
                    {t("app.sheets.cancel")}
                </button>
            </PhoneShell>
        );
    }

    if (sheetPhase === "picking") {
        const hasCandidates = sheetCandidates.length > 0;
        return (
            <PhoneShell>
                <h2 className="mt-2 font-head text-3xl font-extrabold leading-none">
                    {hasCandidates ? t("app.sheets.title") : t("app.sheets.emptyTitle")}
                </h2>
                <p className="text-muted">
                    {hasCandidates ? t("app.sheets.body") : t("app.sheets.emptyBody")}
                </p>
                {sheetError ? (
                    <p className="text-sm font-medium text-danger">{sheetError}</p>
                ) : null}
                <div className="mt-2 grid gap-2">
                    {sheetCandidates.map((c) => (
                        <button
                            key={c.id}
                            type="button"
                            disabled={sheetBusy}
                            onClick={() => void pickSheet(c.id)}
                            className="rounded-2xl border-2 border-line bg-card px-4 py-3 text-left disabled:opacity-60"
                        >
                            <span className="block font-semibold">{c.name}</span>
                            <span className="block text-xs text-muted">
                                {new Date(c.modifiedTime).toLocaleDateString()}
                            </span>
                        </button>
                    ))}
                </div>
                {sheetBusy && !hasCandidates ? (
                    <div className="mt-4 flex justify-center">
                        <Spinner />
                    </div>
                ) : null}
                <div className="mt-auto grid gap-3">
                    {!hasCandidates ? (
                        <button
                            type="button"
                            onClick={showWizard}
                            className="rounded-full bg-btn px-6 py-4 font-semibold text-btntext"
                        >
                            {t("app.sheets.create")}
                        </button>
                    ) : null}
                    <button
                        type="button"
                        onClick={cancelSheetChoice}
                        className="rounded-full bg-mist px-6 py-4 font-semibold text-ink"
                    >
                        {t("app.sheets.cancel")}
                    </button>
                </div>
            </PhoneShell>
        );
    }

    if (workspace) {
        return (
            <PhoneShell>
                {sheetCreated ? (
                    <p className="rounded-2xl bg-brand px-4 py-3 text-sm font-semibold text-ink">
                        {t("app.sheets.created")}
                    </p>
                ) : null}
                <h2 className="mt-2 font-head text-3xl font-extrabold leading-none">
                    {t("app.sheets.connected")}
                </h2>
                <p className="text-muted">
                    {workspace.spreadsheet_title} · {workspace.sheet_tab}
                </p>
                <p className="text-xs text-muted">
                    {t("app.sheets.template")}: {templateLabel(workspace.template_id)}
                </p>
                {sheetError ? (
                    <p className="text-sm font-medium text-danger">{sheetError}</p>
                ) : null}
                <div className="mt-auto grid gap-3">
                    <a
                        href={`https://docs.google.com/spreadsheets/d/${workspace.spreadsheet_id}/edit`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full bg-brand px-6 py-4 text-center font-semibold text-ink"
                    >
                        {t("app.sheets.open")}
                    </a>
                    <button
                        type="button"
                        onClick={showWizard}
                        className="rounded-full bg-mist px-6 py-4 font-semibold text-ink"
                    >
                        {t("app.sheets.create")}
                    </button>
                    <button
                        type="button"
                        onClick={() => void showPicker()}
                        className="rounded-full bg-mist px-6 py-4 font-semibold text-ink"
                    >
                        {t("app.sheets.choose")}
                    </button>
                    <button
                        type="button"
                        disabled={sheetBusy}
                        onClick={() => void recheckSheet()}
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

    // No workspace and no phase matched: treat as checking.
    return (
        <Centered>
            <Spinner />
            <p className="mt-6 text-lg text-muted">{t("app.sheets.checking")}</p>
        </Centered>
    );
}
