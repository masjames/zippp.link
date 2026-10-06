"use client";

import PhoneShell from "../PhoneShell";
import { useApp } from "../AppProvider";
import { fill } from "@/lib/t";

/** Shown after a batch send: open the sheet, or go back to the camera. */
export default function SuccessScreen() {
    const { t, summary, workspace, clearSummary } = useApp();
    const sheetUrl = workspace
        ? `https://docs.google.com/spreadsheets/d/${workspace.spreadsheet_id}`
        : null;

    return (
        <PhoneShell>
            <div className="mt-7 flex h-[84px] w-[84px] items-center justify-center rounded-full bg-brand">
                <span className="h-[17px] w-[34px] -rotate-45 border-b-[7px] border-l-[7px] border-white" />
            </div>
            <h2 className="mt-4 font-head text-3xl font-extrabold leading-none">
                {fill(t("app.review.summary"), {
                    sent: summary?.sent ?? 0,
                    total: summary?.total ?? 0,
                })}
            </h2>
            <p className="text-muted">{t("app.sent.note")}</p>

            <div className="mt-auto grid gap-3">
                {sheetUrl ? (
                    <a
                        href={sheetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full bg-btn px-6 py-4 text-center font-semibold text-btntext"
                    >
                        {t("app.sent.open")}
                    </a>
                ) : null}
                <button
                    type="button"
                    onClick={clearSummary}
                    className="rounded-full bg-mist px-6 py-4 font-semibold text-ink"
                >
                    {t("app.sent.again")}
                </button>
            </div>
        </PhoneShell>
    );
}
