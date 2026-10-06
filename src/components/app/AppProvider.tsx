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
import type { ExtractResponse, Receipt } from "@/types/receipt";
import { formatMoney } from "./draft";
import type { QueueItem, SentInfo } from "./queue";

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
    queue: QueueItem[];
    sent: SentInfo | null;
    sending: boolean;
    sendError: string | null;
    addFile: (file: File) => void;
    removeItem: (id: string) => void;
    retryItem: (id: string) => void;
    send: (
        edited: Receipt,
        staff: string,
        outlet: string | null,
        itemId: string
    ) => Promise<boolean>;
    login: () => void;
    signOut: () => Promise<void>;
    ensureSheet: () => Promise<void>;
    pickSheet: (id: string) => Promise<void>;
    resetSent: () => void;
};

const Ctx = createContext<Value | null>(null);

export function useApp(): Value {
    const value = useContext(Ctx);
    if (!value) throw new Error("useApp must be used inside AppProvider");
    return value;
}

/**
 * Shared app state, mounted in /app/layout.tsx so it (and the in-memory snap
 * queue) survives route changes.
 */
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
    const [queue, setQueue] = useState<QueueItem[]>([]);
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

    async function refreshBalance() {
        try {
            const res = await fetch("/api/billing/balance", { cache: "no-store" });
            const data = await res.json();
            if (data.ok) setBalance(data as BalanceState);
        } catch {
            /* keep the last value */
        }
    }

    function updateItem(id: string, patch: Partial<QueueItem>) {
        setQueue((items) =>
            items.map((item) => (item.id === id ? { ...item, ...patch } : item))
        );
    }

    // Process the queue one item at a time, on any route.
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

    function makeThumb(file: File): Promise<string> {
        return new Promise((resolve) => {
            const url = URL.createObjectURL(file);
            const image = new window.Image();
            image.onload = () => {
                const size = 96;
                const canvas = document.createElement("canvas");
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext("2d");
                if (ctx && image.width && image.height) {
                    const scale = Math.max(size / image.width, size / image.height);
                    const w = image.width * scale;
                    const h = image.height * scale;
                    ctx.drawImage(image, (size - w) / 2, (size - h) / 2, w, h);
                    resolve(canvas.toDataURL("image/jpeg", 0.6));
                } else {
                    resolve("");
                }
                URL.revokeObjectURL(url);
            };
            image.onerror = () => {
                URL.revokeObjectURL(url);
                resolve("");
            };
            image.src = url;
        });
    }

    function addFile(file: File) {
        const id = crypto.randomUUID();
        setQueue((items) => [...items, { id, file, thumb: "", status: "queued" }]);
        void makeThumb(file).then((thumb) => {
            if (thumb) updateItem(id, { thumb });
        });
    }

    function removeItem(id: string) {
        setQueue((items) => items.filter((item) => item.id !== id));
    }

    function retryItem(id: string) {
        updateItem(id, { status: "queued", error: undefined });
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
            if (data.ok && data.workspace) {
                setWorkspace(data.workspace);
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
            } else {
                setSheetError(true);
            }
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
        setQueue([]);
        setSent(null);
        setCandidates([]);
    }

    async function send(
        edited: Receipt,
        staff: string,
        outlet: string | null,
        itemId: string
    ): Promise<boolean> {
        const item = queue.find((q) => q.id === itemId);
        if (!item) return false;
        setSending(true);
        setSendError(null);
        updateItem(itemId, { status: "sending" });
        try {
            const res = await fetch("/api/sheets/append", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ receipt: edited, staff, outlet }),
            });
            if (res.status === 401) {
                updateItem(itemId, { status: "ready", receipt: edited });
                setAuthError(t("app.signin.error"));
                setAuth({ signedIn: false, oauthConfigured: true, googleUserId: null });
                setWorkspace(null);
                setSendError(null);
                return false;
            }
            const data = await res.json();
            if (data.ok) {
                setQueue((items) => items.filter((i) => i.id !== itemId));
                setSent({
                    count:
                        typeof data.rows_written === "number"
                            ? data.rows_written
                            : edited.line_items.length,
                    merchant: edited.merchant || t("app.check.merchantFallback"),
                    total: formatMoney(edited.total, edited.currency, region, lang),
                });
                void refreshBalance();
                return true;
            }
            updateItem(itemId, { status: "ready", receipt: edited });
            setSendError(data.error || t("app.check.sendErr"));
            return false;
        } catch {
            updateItem(itemId, { status: "ready", receipt: edited });
            setSendError(t("app.check.sendErr"));
            return false;
        } finally {
            setSending(false);
        }
    }

    function resetSent() {
        setSent(null);
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
        queue,
        sent,
        sending,
        sendError,
        addFile,
        removeItem,
        retryItem,
        send,
        login,
        signOut,
        ensureSheet,
        pickSheet,
        resetSent,
    };

    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
