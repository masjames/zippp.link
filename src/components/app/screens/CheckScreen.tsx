"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "../AppProvider";
import PhoneShell from "../PhoneShell";
import DebugPanel from "../DebugPanel";
import { fill, type T } from "@/lib/t";
import type { ExtractDebug, Receipt } from "@/types/receipt";
import { fromDraft, toDraft, type Draft, type DraftLine } from "../draft";

const INPUT =
    "w-full rounded-2xl border-2 border-line bg-card px-4 py-3 text-body focus:border-brand focus:outline-none";
const INPUT_BAD =
    "w-full rounded-2xl border-2 border-danger bg-card px-4 py-3 text-body focus:outline-none";

/** Screen 04 / Check. Editable extraction before the rows are sent. */
export default function CheckScreen({
    t,
    receipt,
    sheetTitle,
    sheetTab,
    requireStaff,
    requireOutlet,
    sending,
    sendError,
    onSend,
    debug,
}: {
    t: T;
    receipt: Receipt;
    sheetTitle: string;
    sheetTab: string;
    requireStaff: boolean;
    requireOutlet: boolean;
    sending: boolean;
    sendError: string | null;
    onSend: (receipt: Receipt, staff: string, outlet: string | null) => void;
    debug?: ExtractDebug | null;
}) {
    const { balance } = useApp();
    const router = useRouter();
    const outOfCredits = balance?.configured === true && balance.credits <= 0;

    const [draft, setDraft] = useState<Draft>(() => toDraft(receipt));
    const [showErrors, setShowErrors] = useState(false);

    const dateMissing = draft.date.trim() === "";
    const staffMissing = requireStaff && draft.staff.trim() === "";
    const outletMissing = requireOutlet && draft.outlet.trim() === "";
    const noLines = !draft.lines.some(
        (l) => l.description.trim() || l.amount.trim()
    );

    function patch(next: Partial<Draft>) {
        setDraft((d) => ({ ...d, ...next }));
    }

    function patchLine(index: number, next: Partial<DraftLine>) {
        setDraft((d) => ({
            ...d,
            lines: d.lines.map((line, i) =>
                i === index ? { ...line, ...next } : line
            ),
        }));
    }

    function submit() {
        setShowErrors(true);
        if (dateMissing || staffMissing || outletMissing || noLines) return;
        onSend(fromDraft(draft), draft.staff.trim(), draft.outlet.trim() || null);
    }

    return (
        <PhoneShell
            pill={fill(t("app.check.found"), { count: draft.lines.length })}
        >
            <input
                value={draft.merchant}
                onChange={(e) => patch({ merchant: e.target.value })}
                placeholder={t("app.check.merchantFallback")}
                className="w-full bg-transparent font-head text-3xl font-extrabold tracking-tight focus:outline-none"
            />

            <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1.5">
                    <span className="text-sm font-semibold">
                        {t("app.check.date")}
                    </span>
                    <input
                        value={draft.date}
                        onChange={(e) => patch({ date: e.target.value })}
                        placeholder="dd/mm/yyyy"
                        className={showErrors && dateMissing ? INPUT_BAD : INPUT}
                    />
                </label>
                <label className="grid gap-1.5">
                    <span className="text-sm font-semibold">
                        {t("app.check.staff")}
                    </span>
                    <input
                        value={draft.staff}
                        onChange={(e) => patch({ staff: e.target.value })}
                        className={showErrors && staffMissing ? INPUT_BAD : INPUT}
                    />
                </label>
            </div>

            {showErrors && dateMissing ? (
                <span className="-mt-2 text-sm font-medium text-danger">
                    {t("app.check.dateErr")}
                </span>
            ) : null}
            {showErrors && staffMissing ? (
                <span className="-mt-2 text-sm font-medium text-danger">
                    {t("app.check.staffErr")}
                </span>
            ) : null}

            <label className="grid gap-1.5">
                <span className="text-sm font-semibold">
                    {t("app.check.outlet")}{" "}
                    <span className="font-normal text-muted">
                        ({t("app.check.optional")})
                    </span>
                </span>
                <input
                    value={draft.outlet}
                    onChange={(e) => patch({ outlet: e.target.value })}
                    className={showErrors && outletMissing ? INPUT_BAD : INPUT}
                />
            </label>

            <div className="grid gap-2">
                {draft.lines.map((line, i) => (
                    <div key={i} className="rounded-line bg-surface p-3">
                        <input
                            value={line.description}
                            onChange={(e) =>
                                patchLine(i, { description: e.target.value })
                            }
                            placeholder={t("app.check.item")}
                            className="w-full bg-transparent font-medium focus:outline-none"
                        />
                        <div className="mt-2 flex gap-2">
                            <input
                                value={line.qty}
                                onChange={(e) =>
                                    patchLine(i, { qty: e.target.value })
                                }
                                placeholder={t("app.check.qty")}
                                inputMode="decimal"
                                className="w-20 rounded-xl border-2 border-line bg-card px-3 py-2 text-sm focus:border-brand focus:outline-none"
                            />
                            <input
                                value={line.amount}
                                onChange={(e) =>
                                    patchLine(i, { amount: e.target.value })
                                }
                                placeholder={t("app.check.amt")}
                                inputMode="decimal"
                                className="flex-1 rounded-xl border-2 border-line bg-card px-3 py-2 text-right text-sm tabular-money focus:border-brand focus:outline-none"
                            />
                        </div>
                    </div>
                ))}
                {showErrors && noLines ? (
                    <span className="text-sm font-medium text-danger">
                        {t("app.check.itemsErr")}
                    </span>
                ) : null}
            </div>

            <label className="mt-1 flex items-baseline justify-between gap-3">
                <span className="text-sm font-semibold">
                    {t("app.check.total")}
                </span>
                <input
                    value={draft.total}
                    onChange={(e) => patch({ total: e.target.value })}
                    inputMode="decimal"
                    className="w-40 bg-transparent text-right font-head text-2xl font-extrabold tracking-tight tabular-money focus:outline-none"
                />
            </label>

            {sendError ? (
                <p className="text-sm font-medium text-danger">{sendError}</p>
            ) : null}

            <DebugPanel debug={debug} />

            <div className="mt-auto grid gap-2">
                {outOfCredits ? (
                    <div className="rounded-2xl bg-peach p-3 text-center text-sm">
                        <p className="font-semibold text-ink">
                            {t("app.credits.none")}
                        </p>
                        <button
                            type="button"
                            onClick={() => router.push("/app/topup")}
                            className="mt-2 rounded-full bg-maroon px-4 py-2 font-semibold text-white"
                        >
                            {t("app.topup.title")}
                        </button>
                    </div>
                ) : null}
                <button
                    type="button"
                    onClick={submit}
                    disabled={sending || outOfCredits}
                    className="rounded-full bg-btn px-6 py-4 font-semibold text-btntext disabled:opacity-60"
                >
                    {t("app.check.send")}
                </button>
                <p className="text-center text-xs text-muted">
                    {fill(t("app.check.dest"), {
                        sheet: sheetTitle,
                        tab: sheetTab,
                    })}
                </p>
            </div>
        </PhoneShell>
    );
}
