"use client";

import { useEffect, useRef, useState } from "react";
import LangToggle from "@/components/LangToggle";
import type { Lang, Region } from "@/lib/region";
import { makeT, type Wording } from "@/lib/t";
import type { ExtractResponse, Receipt } from "@/types/receipt";
import { formatMoney } from "./draft";
import type { QueueItem, SentInfo } from "./queue";
import BadPhotoScreen from "./screens/BadPhotoScreen";
import CaptureScreen from "./screens/CaptureScreen";
import CheckScreen from "./screens/CheckScreen";
import IntroScreen from "./screens/IntroScreen";
import SentScreen from "./screens/SentScreen";
import SheetsScreen, { type SheetCandidate } from "./screens/SheetsScreen";
import SignInScreen from "./screens/SignInScreen";

type Phase =
    | "intro"
    | "signin"
    | "sheets"
    | "capture"
    | "check"
    | "sent"
    | "bad";

type AuthState = {
    signedIn: boolean;
    oauthConfigured: boolean;
    googleUserId: string | null;
};

type Workspace = {
    spreadsheet_id: string;
    spreadsheet_title: string;
    sheet_tab: string;
    template_id: string;
    staff_names: string[];
    outlets: string[];
    default_outlet: string | null;
    headers: string[];
};

export default function AppFlow({
    wording,
    initialLang,
    region,
}: {
    wording: Wording;
    initialLang: Lang;
    region: Region;
}) {
    const [lang, setLang] = useState<Lang>(initialLang);
    const t = makeT(wording, lang);

    const [phase, setPhase] = useState<Phase>("intro");
    const [auth, setAuth] = useState<AuthState | null>(null);
    const [workspace, setWorkspace] = useState<Workspace | null>(null);
    const [candidates, setCandidates] = useState<SheetCandidate[]>([]);
    const [sheetError, setSheetError] = useState(false);
    const [busy, setBusy] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);
    const [authChecked, setAuthChecked] = useState(false);

    const [queue, setQueue] = useState<QueueItem[]>([]);
    const [reviewId, setReviewId] = useState<string | null>(null);
    const [sending, setSending] = useState(false);
    const [sendError, setSendError] = useState<string | null>(null);
    const [sent, setSent] = useState<SentInfo | null>(null);

    const inflight = useRef<Set<string>>(new Set());

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const params = new URLSearchParams(window.location.search);
                const res = await fetch("/api/auth/me", { cache: "no-store" });
                const data = (await res.json()) as AuthState;
                if (!alive) return;
                setAuth(data);

                if (params.get("auth") === "error") {
                    setAuthError(t("app.signin.error"));
                    setPhase("signin");
                    return;
                }

                // Ask the server who the user is before showing Intro or Sign in.
                if (!data.signedIn) return;

                const wsRes = await fetch("/api/sheets/workspace", {
                    cache: "no-store",
                });
                const wsData = await wsRes.json();
                if (!alive) return;
                const connected = wsData.ok && wsData.workspace ? wsData.workspace : null;
                if (connected) setWorkspace(connected);

                // Session is valid: land in the app, not on Intro.
                if (connected) setPhase("capture");
                else await ensureSheet();
            } catch {
                /* leave on Intro */
            } finally {
                if (alive) setAuthChecked(true);
            }
        })();
        return () => {
            alive = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function updateItem(id: string, patch: Partial<QueueItem>) {
        setQueue((items) =>
            items.map((item) => (item.id === id ? { ...item, ...patch } : item))
        );
    }

    // Process the queue one item at a time, regardless of which screen is open.
    useEffect(() => {
        if (queue.some((item) => item.status === "reading")) return;
        const next = queue.find(
            (item) => item.status === "queued" && !inflight.current.has(item.id)
        );
        if (!next) return;
        inflight.current.add(next.id);
        updateItem(next.id, { status: "reading" });
        void extractItem(next);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [queue]);

    async function extractItem(item: QueueItem) {
        try {
            const form = new FormData();
            form.append("image", item.file, item.file.name);
            const res = await fetch("/api/extract", { method: "POST", body: form });
            const data = (await res.json()) as ExtractResponse;
            console.debug("[extract]", {
                id: item.id,
                ok: data.ok,
                error: data.ok ? undefined : data.error,
                debug: data.debug,
            });
            if (data.ok) {
                updateItem(item.id, {
                    status: "ready",
                    receipt: data.receipt,
                    debug: data.debug ?? null,
                });
            } else {
                updateItem(item.id, {
                    status: "failed",
                    error: data.error,
                    debug: data.debug ?? null,
                });
            }
        } catch (err) {
            updateItem(item.id, {
                status: "failed",
                error: err instanceof Error ? err.message : "network error",
                debug: null,
            });
        } finally {
            inflight.current.delete(item.id);
        }
    }

    function addFile(file: File) {
        const id = crypto.randomUUID();
        setQueue((items) => [
            ...items,
            {
                id,
                file,
                previewUrl: URL.createObjectURL(file),
                status: "queued",
            },
        ]);
    }

    function removeItem(id: string) {
        setQueue((items) => {
            const target = items.find((item) => item.id === id);
            if (target) URL.revokeObjectURL(target.previewUrl);
            return items.filter((item) => item.id !== id);
        });
        if (reviewId === id) setReviewId(null);
    }

    function retryItem(id: string) {
        updateItem(id, { status: "queued", error: undefined });
        if (reviewId === id) setPhase("capture");
    }

    function openReview(id: string) {
        setReviewId(id);
        setSendError(null);
        setPhase("check");
    }

    function reviewNext() {
        const ready = queue.find((item) => item.status === "ready");
        if (ready) openReview(ready.id);
    }

    function nextAfterSent() {
        setSent(null);
        const ready = queue.find((item) => item.status === "ready");
        if (ready) openReview(ready.id);
        else setPhase("capture");
    }

    async function ensureSheet() {
        setSheetError(false);
        setCandidates([]);
        setPhase("sheets");
        setBusy(true);
        try {
            const res = await fetch("/api/sheets/connect", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: "{}",
            });
            if (res.status === 401) {
                setAuthError(t("app.signin.error"));
                setPhase("signin");
                return;
            }
            const data = await res.json();
            if (data.ok && data.workspace) {
                setWorkspace(data.workspace);
                setPhase("capture");
            } else if (data.needsPick && Array.isArray(data.candidates)) {
                setCandidates(data.candidates as SheetCandidate[]);
            } else {
                setSheetError(true);
            }
        } catch {
            setSheetError(true);
        } finally {
            setBusy(false);
        }
    }

    function start() {
        if (!auth?.signedIn) {
            setPhase("signin");
            return;
        }
        if (workspace) {
            setPhase("capture");
            return;
        }
        void ensureSheet();
    }

    function login() {
        setAuthError(null);
        window.location.href = "/api/auth/login";
    }

    async function signOut() {
        try {
            await fetch("/api/auth/logout", { method: "POST" });
        } catch {
            /* ignore */
        }
        setAuth({ signedIn: false, oauthConfigured: true, googleUserId: null });
        setAuthError(null);
        setWorkspace(null);
        setQueue([]);
        setReviewId(null);
        setSent(null);
        setCandidates([]);
        setPhase("intro");
    }

    async function pickSheet(id: string) {
        setBusy(true);
        try {
            const res = await fetch("/api/sheets/connect", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ spreadsheetId: id }),
            });
            const data = await res.json();
            if (data.ok && data.workspace) {
                setWorkspace(data.workspace);
                setCandidates([]);
                setPhase("capture");
            } else {
                setSheetError(true);
            }
        } catch {
            setSheetError(true);
        } finally {
            setBusy(false);
        }
    }

    async function send(
        edited: Receipt,
        staff: string,
        outlet: string | null
    ) {
        const item = queue.find((q) => q.id === reviewId);
        if (!item) return;
        setSending(true);
        setSendError(null);
        updateItem(item.id, { status: "sending" });
        try {
            const res = await fetch("/api/sheets/append", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ receipt: edited, staff, outlet }),
            });
            if (res.status === 401) {
                updateItem(item.id, { status: "ready", receipt: edited });
                setAuthError(t("app.signin.error"));
                setAuth({ signedIn: false, oauthConfigured: true, googleUserId: null });
                setWorkspace(null);
                setSendError(null);
                setPhase("signin");
                return;
            }
            const data = await res.json();
            if (data.ok) {
                updateItem(item.id, { status: "sent", receipt: edited });
                setSent({
                    count:
                        typeof data.rows_written === "number"
                            ? data.rows_written
                            : edited.line_items.length,
                    merchant: edited.merchant || t("app.check.merchantFallback"),
                    total: formatMoney(edited.total, edited.currency, region, lang),
                });
                setPhase("sent");
            } else {
                updateItem(item.id, { status: "ready", receipt: edited });
                setSendError(data.error || t("app.check.sendErr"));
            }
        } catch {
            updateItem(item.id, { status: "ready", receipt: edited });
            setSendError(t("app.check.sendErr"));
        } finally {
            setSending(false);
        }
    }

    const readyCount = queue.filter((item) => item.status === "ready").length;
    const reviewItem = queue.find((item) => item.id === reviewId) ?? null;

    function renderScreen() {
        switch (phase) {
            case "intro":
                return <IntroScreen t={t} onStart={start} />;
            case "signin":
                return (
                    <SignInScreen t={t} onSignIn={login} error={authError} />
                );
            case "sheets":
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
            case "capture":
                return (
                    <CaptureScreen
                        t={t}
                        pill={workspace?.spreadsheet_title}
                        onFile={addFile}
                        queue={queue}
                        onReview={openReview}
                        onRetry={retryItem}
                        onRemove={removeItem}
                        readyCount={readyCount}
                        onReviewNext={reviewNext}
                    />
                );
            case "check": {
                if (!reviewItem?.receipt) {
                    return (
                        <CaptureScreen
                            t={t}
                            pill={workspace?.spreadsheet_title}
                            onFile={addFile}
                            queue={queue}
                            onReview={openReview}
                            onRetry={retryItem}
                            onRemove={removeItem}
                            readyCount={readyCount}
                            onReviewNext={reviewNext}
                        />
                    );
                }
                return (
                    <CheckScreen
                        t={t}
                        receipt={reviewItem.receipt}
                        sheetTitle={workspace?.spreadsheet_title ?? ""}
                        sheetTab={workspace?.sheet_tab ?? ""}
                        requireStaff={workspace?.template_id === "resto-inventory"}
                        requireOutlet={(workspace?.outlets?.length ?? 0) > 1}
                        sending={sending}
                        sendError={sendError}
                        onSend={send}
                        debug={reviewItem.debug}
                    />
                );
            }
            case "sent":
                return (
                    <SentScreen
                        t={t}
                        count={sent?.count ?? 0}
                        merchant={sent?.merchant ?? ""}
                        total={sent?.total ?? ""}
                        sheetUrl={
                            workspace
                                ? `https://docs.google.com/spreadsheets/d/${workspace.spreadsheet_id}`
                                : null
                        }
                        onAgain={nextAfterSent}
                    />
                );
            case "bad":
                return (
                    <BadPhotoScreen
                        t={t}
                        debug={reviewItem?.debug}
                        onRetry={() => {
                            if (reviewItem) retryItem(reviewItem.id);
                        }}
                    />
                );
        }
    }

    // Hold the loading screen until we know who the user is.
    if (!authChecked) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-page">
                <span
                    className="h-8 w-8 animate-spin rounded-full border-4 border-line border-t-brand"
                    aria-hidden
                />
            </div>
        );
    }

    return (
        <div className="flex min-h-screen flex-col bg-page sm:py-8">
            <div className="mx-auto flex w-full max-w-[430px] items-center justify-between gap-3 px-4 pb-2">
                <LangToggle lang={lang} onChange={setLang} />
                <div className="flex items-center gap-3">
                    {readyCount > 0 ? (
                        <button
                            type="button"
                            onClick={reviewNext}
                            className="rounded-full bg-brand px-3 py-1 text-xs font-semibold text-ink"
                        >
                            {readyCount} ready
                        </button>
                    ) : null}
                    {auth?.signedIn ? (
                        <button
                            type="button"
                            onClick={signOut}
                            className="text-xs font-semibold text-muted hover:text-body"
                        >
                            {t("app.auth.signout")}
                        </button>
                    ) : null}
                </div>
            </div>
            {renderScreen()}
        </div>
    );
}
