"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useApp } from "../AppProvider";
import PhoneShell from "../PhoneShell";
import { formatCurrencyTotal } from "@/lib/cashflow/format";
import { fill } from "@/lib/t";
import type { CurrencyTotal, LegacyReceiptSummary } from "@/lib/cashflow/legacy-summary";

function Totals({ values, locale, empty }: { values: CurrencyTotal[]; locale: string; empty: string }) {
    if (values.length === 0) return <p className="text-sm text-muted">{empty}</p>;
    return (
        <div className="grid gap-1">
            {values.map((value) => (
                <p key={value.currency} className="break-words text-lg font-bold tabular-money text-ink">
                    {formatCurrencyTotal(value, locale)}
                </p>
            ))}
        </div>
    );
}

export default function HomeScreen() {
    const { t, lang, workspace, auth, batch, legacyDraftCount } = useApp();
    const [summary, setSummary] = useState<LegacyReceiptSummary | null>(null);
    const [state, setState] = useState<"loading" | "ready" | "unsupported" | "error">("loading");
    const [attempt, setAttempt] = useState(0);
    const locale = lang === "id" ? "id-ID" : "en-AU";

    useEffect(() => {
        if (!workspace) return;
        const controller = new AbortController();
        setState("loading");
        setSummary(null);
        void (async () => {
            try {
                const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
                if (!timeZone) throw new Error("Missing time zone");
                const query = new URLSearchParams({ timeZone, expectedUserId: auth?.googleUserId ?? "" });
                const response = await fetch(`/api/cashflow/legacy-summary?${query}`, {
                    cache: "no-store", signal: controller.signal,
                });
                const data = await response.json() as { ok: boolean; code?: string; summary?: LegacyReceiptSummary };
                if (controller.signal.aborted) return;
                if (data.code === "OWNER_MISMATCH") {
                    window.location.reload();
                    return;
                }
                if (data.code === "UNSUPPORTED_TEMPLATE") {
                    setState("unsupported");
                } else if (response.ok && data.ok && data.summary) {
                    setSummary(data.summary);
                    setState("ready");
                } else {
                    setState("error");
                }
            } catch {
                if (!controller.signal.aborted) setState("error");
            }
        })();
        return () => controller.abort();
    }, [workspace?.spreadsheet_id, workspace?.sheet_tab, workspace?.template_id, attempt, auth?.googleUserId]);

    return (
        <PhoneShell tone="page" pill={workspace?.spreadsheet_title}>
            <h1 className="font-head text-2xl font-black text-ink">{t("app.home.title")}</h1>
            <p className="text-sm text-muted">{t("app.home.legacyNotice")}</p>
            {batch.length > 0 || legacyDraftCount > 0 ? (
                <Link href="/app/inbox" className="flex items-center justify-between gap-3 rounded-xl bg-card p-3 text-sm font-semibold text-ink shadow-sm">
                    <span>
                        {batch.length > 0 ? <span className="block">{batch.length === 1 ? t("app.inbox.one") : fill(t("app.inbox.many"), { count: batch.length })}</span> : null}
                        {legacyDraftCount > 0 ? <span className="block">{t("app.inbox.legacyAvailable")}</span> : null}
                    </span>
                    <span className="underline">{t("app.inbox.open")}</span>
                </Link>
            ) : null}
            {state === "loading" ? <p role="status" className="text-sm text-muted">{t("app.home.loading")}</p> : null}
            {state === "unsupported" ? (
                <div className="rounded-2xl bg-card p-4 text-sm text-body">
                    <p>{t("app.home.unsupported")}</p>
                    <Link href="/app/settings/sheet" className="mt-3 inline-block font-semibold text-ink underline">{t("app.home.sheetSettings")}</Link>
                </div>
            ) : null}
            {state === "error" ? (
                <div role="alert" className="rounded-2xl bg-card p-4 text-sm text-body">
                    <p>{t("app.home.error")}</p>
                    <button type="button" onClick={() => setAttempt((value) => value + 1)} className="mt-3 font-semibold text-ink underline">{t("app.home.retry")}</button>
                </div>
            ) : null}
            {summary && state === "ready" ? (
                <>
                    {summary.partial ? <p role="status" className="rounded-xl bg-amber-100 p-3 text-sm text-amber-900">{t("app.home.partial")}</p> : null}
                    <div className="grid grid-cols-2 gap-2 rounded-2xl bg-card p-4 shadow-sm">
                        <section className="min-w-0">
                            <h2 className="mb-2 text-xs font-semibold text-muted">{t("app.home.today")}</h2>
                            <Totals values={summary.todayTotals} locale={locale} empty={t("app.home.noTotals")} />
                        </section>
                        <div className="grid min-w-0 gap-4">
                            <section>
                                <h2 className="text-xs font-semibold text-muted">{t("app.home.week")}</h2>
                                <p className="mb-2 text-xs text-muted">{t("app.home.weekNote")}</p>
                                <Totals values={summary.weekTotals} locale={locale} empty={t("app.home.noTotals")} />
                            </section>
                            <section>
                                <h2 className="text-xs font-semibold text-muted">{t("app.home.balance")}</h2>
                                <p className="text-sm text-muted">{t("app.home.balanceUnavailable")}</p>
                            </section>
                        </div>
                    </div>
                    <section>
                        <h2 className="mb-2 font-head text-lg font-bold text-ink">{t("app.home.latest")}</h2>
                        {summary.latest.length === 0 ? <p className="text-sm text-muted">{t("app.home.empty")}</p> : (
                            <ul className="grid gap-2">
                                {summary.latest.map((receipt) => (
                                    <li key={receipt.receiptId} className="flex items-center justify-between gap-3 rounded-xl bg-card p-3 text-sm">
                                        <span><span className="block font-semibold text-ink">{t("app.home.receipt")}</span><time dateTime={receipt.occurredOn} className="text-muted">{receipt.occurredOn}</time></span>
                                        <span className="font-semibold tabular-money text-ink">{formatCurrencyTotal(receipt.amount, locale)}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                </>
            ) : null}
            <Link href="/app/snap" className="mt-auto rounded-full bg-maroon px-5 py-3 text-center font-semibold text-white">
                {t("app.home.capture")}
            </Link>
        </PhoneShell>
    );
}
