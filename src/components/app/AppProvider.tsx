"use client";

import {
    createContext,
    useContext,
    useEffect,
    useRef,
    useState,
    type ReactNode,
} from "react";
import type { Lang, Region } from "@/lib/region";
import { makeT, type T, type Wording } from "@/lib/t";
import type { ExtractResponse } from "@/types/receipt";
import {
    allItems,
    deleteItem as dbDeleteItem,
    getMeta,
    putItem,
    setOpenId as dbSetOpenId,
    type BatchItem,
    type CaptureSource,
} from "@/lib/batch-db";
import { downscaleImage, makeThumb } from "@/lib/image";
import { captureDate, fromDraft, toDraft } from "./draft";

export type AuthState = {
    signedIn: boolean;
    oauthConfigured: boolean;
    googleUserId: string | null;
};

export type Workspace = {
    spreadsheet_id: string;
    spreadsheet_title: string;
    sheet_tab: string;
    template_id: string;
    staff_names: string[];
    outlets: string[];
    default_outlet: string | null;
    headers: string[];
};

export type SheetCandidate = { id: string; name: string; modifiedTime: string };

export type BalanceState = {
    configured: boolean;
    credits: number;
    soonestExpiry: number | null;
    refCode: string | null;
    referralEarned?: number;
    admin?: boolean;
};

type Summary = { sent: number; total: number };

type Value = {
    t: T;
    lang: Lang;
    region: Region;
    setLang: (lang: Lang) => void;
    auth: AuthState | null;
    authChecked: boolean;
    authError: string | null;
    workspace: Workspace | null;
    candidates: SheetCandidate[];
    sheetError: boolean;
    busy: boolean;
    balance: BalanceState | null;
    refreshBalance: () => Promise<void>;
    batch: BatchItem[];
    openId: string | null;
    autoSnap: boolean;
    setAutoSnap: (on: boolean) => void;
    /** Epoch ms until which auto-capture pauses after a not_a_receipt refusal. */
    autoCooldownUntil: number;
    addFile: (file: File, source?: CaptureSource) => void;
    setOpen: (id: string | null) => void;
    updateDraft: (id: string, draft: BatchItem["draft"]) => void;
    acceptItem: (id: string) => void;
    removeItem: (id: string) => void;
    retryItem: (id: string) => void;
    sendAll: () => Promise<void>;
    sending: boolean;
    summary: Summary | null;
    clearSummary: () => void;
    login: () => void;
    signOut: () => Promise<void>;
    ensureSheet: () => Promise<void>;
    pickSheet: (id: string) => Promise<void>;
};

const Ctx = createContext<Value | null>(null);

export function useApp(): Value {
    const value = useContext(Ctx);
    if (!value) throw new Error("useApp must be used inside AppProvider");
    return value;
}

const AUTOSNAP_KEY = "zippp_autosnap";
/** Reads can run in parallel; the Send queue stays sequential. */
const MAX_CONCURRENT_EXTRACTIONS = 3;
/** Pause auto-capture after the server says the frame is not a receipt. */
const REFUSAL_COOLDOWN_MS = 2_500;

export default function AppProvider({
    wording,
    initialLang,
    region,
    children,
}: {
    wording: Wording;
    initialLang: Lang;
    region: Region;
    children: ReactNode;
}) {
    const [lang, setLang] = useState<Lang>(initialLang);
    const t = makeT(wording, lang);

    const [auth, setAuth] = useState<AuthState | null>(null);
    const [authChecked, setAuthChecked] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);

    const [workspace, setWorkspace] = useState<Workspace | null>(null);
    const [candidates, setCandidates] = useState<SheetCandidate[]>([]);
    const [sheetError, setSheetError] = useState(false);
    const [busy, setBusy] = useState(false);

    const [balance, setBalance] = useState<BalanceState | null>(null);

    const [batch, setBatch] = useState<BatchItem[]>([]);
    const [openId, setOpenIdState] = useState<string | null>(null);
    const [autoSnap, setAutoSnapState] = useState(true);
    const [autoCooldownUntil, setAutoCooldownUntil] = useState(0);
    const [sending, setSending] = useState(false);
    const [summary, setSummary] = useState<Summary | null>(null);

    const inflight = useRef<Set<string>>(new Set());

    // Restore the persisted batch and preferences.
    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const [items, meta] = await Promise.all([allItems(), getMeta()]);
                if (!alive) return;
                // Interrupted reads/sends become retryable.
                const restored = items.map((it) =>
                    it.status === "reading" || it.status === "sending"
                        ? { ...it, status: "ready" as const }
                        : it
                );
                setBatch(restored);
                setOpenIdState(meta.openId);
            } catch {
                /* ignore */
            }
            try {
                const pref = localStorage.getItem(AUTOSNAP_KEY);
                if (pref === "0") setAutoSnapState(false);
            } catch {
                /* ignore */
            }
        })();
        return () => {
            alive = false;
        };
    }, []);

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
                    return;
                }
                if (!data.signedIn) return;
                const [wsRes, balRes] = await Promise.all([
                    fetch("/api/sheets/workspace", { cache: "no-store" }),
                    fetch("/api/billing/balance", { cache: "no-store" }),
                ]);
                const wsData = await wsRes.json();
                const balData = await balRes.json();
                if (!alive) return;
                if (wsData.ok && wsData.workspace) setWorkspace(wsData.workspace);
                if (balData.ok) setBalance(balData as BalanceState);
            } catch {
                /* logged-out view */
            } finally {
                if (alive) setAuthChecked(true);
            }
        })();
        return () => {
            alive = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function patchItem(id: string, patch: Partial<BatchItem>) {
        setBatch((items) => {
            const next = items.map((it) =>
                it.id === id ? { ...it, ...patch } : it
            );
            const changed = next.find((it) => it.id === id);
            if (changed) void putItem(changed);
            return next;
        });
    }

    // Extract queued items, up to MAX_CONCURRENT_EXTRACTIONS at a time.
    useEffect(() => {
        const reading = batch.filter((item) => item.status === "reading").length;
        const slots = MAX_CONCURRENT_EXTRACTIONS - reading;
        if (slots <= 0) return;
        const next = batch
            .filter(
                (item) => item.status === "queued" && !inflight.current.has(item.id)
            )
            .slice(0, slots);
        if (next.length === 0) return;
        for (const item of next) {
            inflight.current.add(item.id);
            patchItem(item.id, { status: "reading" });
            void extractItem(item);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [batch]);

    async function extractItem(item: BatchItem) {
        try {
            const form = new FormData();
            form.append("image", item.blob, "receipt.jpg");
            const res = await fetch("/api/extract", { method: "POST", body: form });
            const data = (await res.json()) as ExtractResponse;
            if (data.ok) {
                const draft = toDraft(data.receipt);
                // A missing date is assumed from the capture time and flagged in
                // the review card, never treated as a failed read.
                if (!draft.date) {
                    draft.date = captureDate(item.createdAt);
                    draft.dateAssumed = true;
                    draft.flagged = Array.from(
                        new Set([...(draft.flagged ?? []), "date"])
                    );
                }
                patchItem(item.id, {
                    status: "ready",
                    receipt: data.receipt,
                    draft,
                    debug: data.debug ?? null,
                });
            } else if (item.source === "auto" && data.refusal === "not_a_receipt") {
                // Auto captures only stick if the read is a receipt. Drop it
                // silently and pause auto-capture so the same scene is not retried.
                setAutoCooldownUntil(Date.now() + REFUSAL_COOLDOWN_MS);
                setBatch((items) => items.filter((i) => i.id !== item.id));
                void dbDeleteItem(item.id);
            } else {
                patchItem(item.id, {
                    status: "failed",
                    error: data.error,
                    debug: data.debug ?? null,
                });
            }
        } catch (err) {
            patchItem(item.id, {
                status: "failed",
                error: err instanceof Error ? err.message : "network error",
            });
        } finally {
            inflight.current.delete(item.id);
        }
    }

    function addFile(file: File, source: CaptureSource = "manual") {
        const id = crypto.randomUUID();
        const createdAt = Date.now();
        void (async () => {
            const blob = await downscaleImage(file);
            const thumb = await makeThumb(blob);
            const item: BatchItem = {
                id,
                createdAt,
                blob,
                thumb,
                status: "queued",
                source,
            };
            await putItem(item);
            setBatch((items) => [item, ...items]);
        })();
    }

    function setAutoSnap(on: boolean) {
        setAutoSnapState(on);
        try {
            localStorage.setItem(AUTOSNAP_KEY, on ? "1" : "0");
        } catch {
            /* ignore */
        }
    }

    function setOpen(id: string | null) {
        setOpenIdState(id);
        void dbSetOpenId(id);
    }

    function updateDraft(id: string, draft: BatchItem["draft"]) {
        patchItem(id, { draft });
    }

    function acceptItem(id: string) {
        patchItem(id, { status: "accepted" });
        const remaining = batch.filter(
            (i) => i.id !== id && i.status !== "accepted"
        );
        setOpen(remaining[0]?.id ?? null);
    }

    function removeItem(id: string) {
        setBatch((items) => items.filter((i) => i.id !== id));
        void dbDeleteItem(id);
        if (openId === id) {
            const remaining = batch.filter((i) => i.id !== id);
            setOpen(remaining[0]?.id ?? null);
        }
    }

    function retryItem(id: string) {
        patchItem(id, { status: "queued", error: undefined });
    }

    async function refreshBalance() {
        try {
            const res = await fetch("/api/billing/balance", { cache: "no-store" });
            const data = await res.json();
            if (data.ok) setBalance(data as BalanceState);
        } catch {
            /* keep last */
        }
    }

    async function sendAll() {
        const accepted = batch.filter((item) => item.status === "accepted");
        if (accepted.length === 0) return;
        setSending(true);
        let sent = 0;
        let stop = false;

        for (const item of accepted) {
            if (stop) break;
            patchItem(item.id, { status: "sending" });
            try {
                const edited = item.draft ? fromDraft(item.draft) : item.receipt;
                if (!edited) {
                    patchItem(item.id, { status: "failed", error: "No data." });
                    continue;
                }
                const res = await fetch("/api/sheets/append", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        receipt: edited,
                        staff: (item.draft?.staff ?? "").trim(),
                        outlet: (item.draft?.outlet ?? "").trim() || null,
                        scanId: item.id,
                    }),
                });
                if (res.status === 401) {
                    setAuth({
                        signedIn: false,
                        oauthConfigured: true,
                        googleUserId: null,
                    });
                    setAuthError(t("app.signin.error"));
                    patchItem(item.id, { status: "accepted" });
                    stop = true;
                    continue;
                }
                if (res.status === 402) {
                    patchItem(item.id, { status: "ready", error: "No credits." });
                    stop = true;
                    continue;
                }
                const data = await res.json();
                if (data.ok) {
                    sent++;
                    await dbDeleteItem(item.id);
                    setBatch((items) => items.filter((i) => i.id !== item.id));
                } else {
                    patchItem(item.id, { status: "ready", error: data.error });
                }
            } catch {
                patchItem(item.id, { status: "ready", error: "network error" });
            }
        }

        setSending(false);
        setSummary({ sent, total: accepted.length });
        void refreshBalance();
    }

    function clearSummary() {
        setSummary(null);
    }

    async function ensureSheet() {
        setSheetError(false);
        setCandidates([]);
        setBusy(true);
        try {
            const res = await fetch("/api/sheets/connect", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: "{}",
            });
            if (res.status === 401) {
                setAuthError(t("app.signin.error"));
                setAuth({ signedIn: false, oauthConfigured: true, googleUserId: null });
                return;
            }
            const data = await res.json();
            if (data.ok && data.workspace) setWorkspace(data.workspace);
            else if (data.needsPick && Array.isArray(data.candidates))
                setCandidates(data.candidates as SheetCandidate[]);
            else setSheetError(true);
        } catch {
            setSheetError(true);
        } finally {
            setBusy(false);
        }
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
            } else setSheetError(true);
        } catch {
            setSheetError(true);
        } finally {
            setBusy(false);
        }
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
        setCandidates([]);
    }

    const value: Value = {
        t,
        lang,
        region,
        setLang,
        auth,
        authChecked,
        authError,
        workspace,
        candidates,
        sheetError,
        busy,
        balance,
        refreshBalance,
        batch,
        openId,
        autoSnap,
        setAutoSnap,
        autoCooldownUntil,
        addFile,
        setOpen,
        updateDraft,
        acceptItem,
        removeItem,
        retryItem,
        sendAll,
        sending,
        summary,
        clearSummary,
        login,
        signOut,
        ensureSheet,
        pickSheet,
    };

    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
