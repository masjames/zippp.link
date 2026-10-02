"use client";

import { useEffect, useState } from "react";
import LangToggle from "@/components/LangToggle";
import type { Lang, Region } from "@/lib/region";
import { makeT, type Wording } from "@/lib/t";
import type { ExtractDebug, ExtractResponse, Receipt } from "@/types/receipt";
import { formatMoney } from "./draft";
import BadPhotoScreen from "./screens/BadPhotoScreen";
import CaptureScreen from "./screens/CaptureScreen";
import CheckScreen from "./screens/CheckScreen";
import IntroScreen from "./screens/IntroScreen";
import ReadingScreen from "./screens/ReadingScreen";
import SentScreen from "./screens/SentScreen";
import SignInScreen from "./screens/SignInScreen";
import SheetsScreen, { type SheetCandidate } from "./screens/SheetsScreen";

type Phase =
    | "intro"
    | "signin"
    | "sheets"
    | "capture"
    | "reading"
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

type SentInfo = { count: number; merchant: string; total: string };

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
    const [receipt, setReceipt] = useState<Receipt | null>(null);
    const [sent, setSent] = useState<SentInfo | null>(null);
    const [sending, setSending] = useState(false);
    const [sendError, setSendError] = useState<string | null>(null);
    const [authError, setAuthError] = useState<string | null>(null);
    const [debug, setDebug] = useState<ExtractDebug | null>(null);

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const res = await fetch("/api/auth/me", { cache: "no-store" });
                const data = (await res.json()) as AuthState;
                if (!alive) return;
                setAuth(data);
                if (!data.signedIn) return;

                const wsRes = await fetch("/api/sheets/workspace", {
                    cache: "no-store",
                });
                const wsData = await wsRes.json();
                if (!alive) return;
                const connected = wsData.ok && wsData.workspace ? wsData.workspace : null;
                if (connected) setWorkspace(connected);

                const params = new URLSearchParams(window.location.search);
                if (params.get("auth") === "ok") {
                    if (connected) setPhase("capture");
                    else await ensureSheet();
                } else if (params.get("auth") === "error") {
                    setAuthError(t("app.signin.error"));
                    setPhase("signin");
                }
            } catch {
                /* stay on intro */
            }
        })();
        return () => {
            alive = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
        setReceipt(null);
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

    async function handleFile(file: File) {
        setPhase("reading");
        setSendError(null);
        setDebug(null);
        try {
            const form = new FormData();
            form.append("image", file);
            const res = await fetch("/api/extract", { method: "POST", body: form });
            const data = (await res.json()) as ExtractResponse;
            setDebug(data.debug ?? null);
            // Always-on console trace, so the failure stage is visible in devtools.
            console.debug("[extract]", {
                ok: data.ok,
                error: data.ok ? undefined : data.error,
                debug: data.debug,
            });
            if (data.ok) {
                setReceipt(data.receipt);
                setPhase("check");
            } else {
                setPhase("bad");
            }
        } catch (err) {
            console.debug("[extract] network error", err);
            setPhase("bad");
        }
    }

    async function send(
        edited: Receipt,
        staff: string,
        outlet: string | null
    ) {
        setSending(true);
        setSendError(null);
        try {
            const res = await fetch("/api/sheets/append", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ receipt: edited, staff, outlet }),
            });
            const data = await res.json();
            if (data.ok) {
                setSent({
                    count:
                        typeof data.rows_written === "number"
                            ? data.rows_written
                            : edited.line_items.length,
                    merchant: edited.merchant || t("app.check.merchantFallback"),
                    total: formatMoney(
                        edited.total,
                        edited.currency,
                        region,
                        lang
                    ),
                });
                setPhase("sent");
            } else {
                setSendError(data.error || t("app.check.sendErr"));
            }
        } catch {
            setSendError(t("app.check.sendErr"));
        } finally {
            setSending(false);
        }
    }

    function beginAnother() {
        setReceipt(null);
        setSent(null);
        setSendError(null);
        setDebug(null);
        setPhase("capture");
    }

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
                        onFile={handleFile}
                    />
                );
            case "reading":
                return <ReadingScreen t={t} />;
            case "check":
                if (!receipt) {
                    return (
                        <CaptureScreen
                            t={t}
                            pill={workspace?.spreadsheet_title}
                            onFile={handleFile}
                        />
                    );
                }
                return (
                    <CheckScreen
                        t={t}
                        receipt={receipt}
                        sheetTitle={workspace?.spreadsheet_title ?? ""}
                        sheetTab={workspace?.sheet_tab ?? ""}
                        requireStaff={workspace?.template_id === "resto-inventory"}
                        requireOutlet={(workspace?.outlets?.length ?? 0) > 1}
                        sending={sending}
                        sendError={sendError}
                        onSend={send}
                        debug={debug}
                    />
                );
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
                        onAgain={beginAnother}
                    />
                );
            case "bad":
                return (
                    <BadPhotoScreen t={t} onRetry={beginAnother} debug={debug} />
                );
        }
    }

    return (
        <div className="flex min-h-screen flex-col bg-page sm:py-8">
            <div className="mx-auto flex w-full max-w-[430px] items-center justify-end gap-3 px-4 pb-2">
                <LangToggle lang={lang} onChange={setLang} />
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
            {renderScreen()}
        </div>
    );
}
