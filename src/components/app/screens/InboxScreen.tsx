"use client";

import Link from "next/link";
import { useApp } from "../AppProvider";
import PhoneShell from "../PhoneShell";
import { formatMoney, parseMoney } from "../draft";
import { fill } from "@/lib/t";
import type { BatchItem, BatchStatus } from "@/lib/batch-db";

const STATUS_KEYS: Record<BatchStatus, string> = {
    queued: "app.queue.queued",
    reading: "app.queue.reading",
    ready: "app.queue.ready",
    failed: "app.queue.failed",
    accepted: "app.queue.sending",
    sending: "app.queue.sending",
};

export default function InboxScreen() {
    const { t, lang, region, auth, workspace, batch, balance, draftsReady, storageError, legacyDraftCount, claimingLegacy, claimLegacyDrafts } = useApp();
    const noCredits = balance?.configured === true && balance.credits <= 0;

    function details(item: BatchItem) {
        const merchantFlagged = item.receipt?.flags?.some((flag) => flag.path === "merchant");
        const totalFlagged = item.receipt?.flags?.some((flag) => flag.path === "total");
        const merchant = !merchantFlagged ? item.draft?.merchant.trim() : "";
        const currency = item.draft?.currency;
        const amount = !totalFlagged && (currency === "IDR" || currency === "AUD")
            ? parseMoney(item.draft?.total)
            : null;
        return (
            <>
                {item.thumb ? <img src={item.thumb} alt="" className="h-12 w-12 flex-none rounded-lg object-cover" /> : null}
                <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-ink">{merchant || t("app.inbox.receipt")}</span>
                    <span className="block text-xs text-muted">{t(STATUS_KEYS[item.status])}</span>
                </span>
                {amount !== null ? <span className="text-sm font-semibold tabular-money text-ink">{formatMoney(amount, currency ?? null, region, lang)}</span> : null}
            </>
        );
    }

    return (
        <PhoneShell tone="page" pill={workspace?.spreadsheet_title}>
            <h1 className="font-head text-2xl font-black text-ink">{t("app.inbox.title")}</h1>
            {noCredits && (batch.length > 0 || legacyDraftCount > 0) ? (
                <p className="rounded-xl bg-amber-100 p-3 text-sm text-amber-900">
                    {t("app.inbox.noCredits")} {" "}
                    <Link href="/app/topup" className="font-semibold underline">{t("app.topup.title")}</Link>
                </p>
            ) : null}
            {draftsReady && legacyDraftCount > 0 ? (
                <div className="rounded-xl bg-card p-3 text-sm text-body">
                    <p>{fill(t("app.inbox.legacyCount"), { count: legacyDraftCount })}</p>
                    <p className="mt-1">{t("app.inbox.legacyWarning")}</p>
                    <button type="button" onClick={() => void claimLegacyDrafts()} disabled={claimingLegacy} className="mt-3 font-semibold text-ink underline disabled:opacity-50">
                        {claimingLegacy ? t("app.inbox.importing") : t("app.inbox.importLegacy")}
                    </button>
                </div>
            ) : null}
            {draftsReady ? (
                batch.length === 0 && legacyDraftCount === 0 ? (
                    <p className="text-sm text-muted">{auth?.localPreview ? t("app.inbox.localPreviewEmpty") : t("app.inbox.empty")}</p>
                ) : batch.length > 0 ? (
                    <ul className="grid gap-2">
                        {batch.map((item) => {
                            const canReview = !noCredits && item.status !== "accepted" && item.status !== "sending";
                            return (
                                <li key={item.id}>
                                    {canReview ? (
                                        <Link href={`/app/snap?review=${encodeURIComponent(item.id)}`} className="flex items-center gap-3 rounded-xl bg-card p-3 text-left shadow-sm">
                                            {details(item)}
                                        </Link>
                                    ) : (
                                        <div className="flex items-center gap-3 rounded-xl bg-card p-3 text-left shadow-sm">{details(item)}</div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                ) : null
            ) : !storageError ? <p role="status" className="text-sm text-muted">{t("app.inbox.loading")}</p> : null}
            {auth?.localPreview ? (
                <p role="note" className="mt-6 rounded-xl bg-card p-3 text-center text-sm text-muted">
                    {t("app.localPreview.captureDisabled")}
                </p>
            ) : (
                <Link href="/app/snap" className="mt-6 rounded-full bg-maroon px-5 py-3 text-center font-semibold text-white">
                    {t("app.home.capture")}
                </Link>
            )}
        </PhoneShell>
    );
}
