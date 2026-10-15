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
import { prepareImage } from "@/lib/image";
import { captureDate, fromDraft, toDraft } from "./draft";
import { buildCorrectionRecord } from "@/lib/correction-diff";

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

export type SheetTemplateId =
    | "resto-inventory"
    | "personal-expense"
    | "sales-recap"
    | "reimbursement"
    | "custom";

/** One screen at a time for the sheet connect flow. */
export type SheetPhase =
    | "checking"
    | "choose-source"
    | "picking"
    | "wizard"
    | "creating"
    | "connected"
    | "error";

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
    auth: AuthState | null;
    authChecked: boolean;
    authError: string | null;
    workspace: Workspace | null;
    sheetPhase: SheetPhase;
    sheetBusy: boolean;
    sheetError: string | null;
    sheetCandidates: SheetCandidate[];
    sheetCreated: boolean;
    pendingTemplate: SheetTemplateId | null;
    balance: BalanceState | null;
    refreshBalance: () => Promise<void>;
    /** Increments on each successful append. */
    savedTick: number;
    batch: BatchItem[];
    openId: string | null;
    autoSnap: boolean;
    setAutoSnap: (on: boolean) => void;
    /** Epoch ms until which auto-capture pauses after a not_a_receipt refusal. */
    autoCooldownUntil: number;
    addFile: (file: File, source?: CaptureSource) => void;
    /** Add an already-prepared capture: no decode, card shows at once. */
    addBlob: (blob: Blob, thumb: string, source?: CaptureSource) => void;
    setOpen: (id: string | null) => void;
    updateDraft: (id: string, draft: BatchItem["draft"]) => void;
    acceptItem: (id: string) => void;
    removeItem: (id: string) => void;
    retryItem: (id: string) => void;
    contributeItem: (id: string) => void;
    login: () => void;
    signOut: () => Promise<void>;
    /** Find an existing `[zippp]` sheet. Never creates one. */
    checkSheet: () => Promise<void>;
    showWizard: () => void;
    /** List the `[zippp]` sheets to choose from. */
    showPicker: () => Promise<void>;
    /** Leave the wizard or the picker. */
    cancelSheetChoice: () => void;
    pickSheet: (id: string) => Promise<void>;
    /** Re-check the current sheet by reconnecting to it. */
    recheckSheet: () => Promise<void>;
    /** List the `[zippp]` sheets for the quick selector. No phase change. */
    listSheetChoices: () => Promise<SheetCandidate[]>;
    /** Create a new sheet for a template and connect it. */
    createSheet: (templateId: SheetTemplateId) => Promise<void>;
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
    region,
    lang,
    children,
}: {
    wording: Wording;
    region: Region;
    lang: Lang;
    children: ReactNode;
}) {
    const t = makeT(wording, lang);

    const [auth, setAuth] = useState<AuthState | null>(null);
    const [authChecked, setAuthChecked] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);

    const [workspace, setWorkspace] = useState<Workspace | null>(null);
    const [sheetPhase, setSheetPhase] = useState<SheetPhase>("checking");
    const [sheetBusy, setSheetBusy] = useState(false);
    const [sheetError, setSheetError] = useState<string | null>(null);
    const [sheetCandidates, setSheetCandidates] = useState<SheetCandidate[]>([]);
    const [sheetCreated, setSheetCreated] = useState(false);
    const [pendingTemplate, setPendingTemplate] =
        useState<SheetTemplateId | null>(null);

    const [balance, setBalance] = useState<BalanceState | null>(null);

    const [batch, setBatch] = useState<BatchItem[]>([]);
    const [openId, setOpenIdState] = useState<string | null>(null);
    const [autoSnap, setAutoSnapState] = useState(true);
    const [autoCooldownUntil, setAutoCooldownUntil] = useState(0);
    /** Bumped on every successful append, so the UI can show "saved". */
    const [savedTick, setSavedTick] = useState(0);

    const inflight = useRef<Set<string>>(new Set());
    /** Sends run one at a time so the rows keep their order. */
    const sendQueue = useRef<Promise<void>>(Promise.resolve());

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
                if (wsData.ok && wsData.workspace) {
                    setWorkspace(wsData.workspace);
                    setSheetPhase("connected");
                } else {
                    // No saved sheet. Look for an existing `[zippp]` one. This
                    // never creates a sheet; the sheet page asks the user.
                    void checkSheet();
                }
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
                // A missing date is assumed from the capture time and marked in
                // the review card, never treated as a failed read.
                if (!draft.date) {
                    draft.date = captureDate(item.createdAt);
                    draft.dateAssumed = true;
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

    /** Add a capture whose image and thumb are already built (camera path). */
    function addBlob(
        blob: Blob,
        thumb: string,
        source: CaptureSource = "manual"
    ) {
        const id = crypto.randomUUID();
        const createdAt = Date.now();
        const item: BatchItem = {
            id,
            createdAt,
            blob,
            thumb,
            status: "queued",
            source,
        };
        // Show the card first; persist in the background.
        setBatch((items) => [item, ...items]);
        void putItem(item);
    }

    function addFile(file: File, source: CaptureSource = "manual") {
        void (async () => {
            const { blob, thumb } = await prepareImage(file);
            addBlob(blob, thumb, source);
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

    /** Free production signal: what the user changed before accepting. No images,
     * no raw values, only edited-or-not plus flag reasons. */
    function logCorrection(item: BatchItem) {
        if (!item.receipt || !item.draft) return;
        const record = buildCorrectionRecord({
            receipt: item.receipt,
            draft: item.draft,
            runId: item.debug?.runId ?? null,
        });
        void fetch("/api/corrections", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...record, lang }),
        }).catch(() => undefined);
    }

    function acceptItem(id: string) {
        const item = batch.find((i) => i.id === id);
        if (!item) return;
        logCorrection(item);
        patchItem(id, { status: "accepted" });
        const remaining = batch.filter(
            (i) => i.id !== id && i.status !== "accepted"
        );
        setOpen(remaining[0]?.id ?? null);
        // Accept writes the row straight away: one check, one sheet row.
        sendQueue.current = sendQueue.current
            .then(() => sendOne(item))
            .catch(() => undefined);
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

    /** Explicit opt-in: save a photo that could not be read, for the harness. */
    function contributeItem(id: string) {
        const item = batch.find((i) => i.id === id);
        if (!item) return;
        void (async () => {
            try {
                const form = new FormData();
                form.append("image", item.blob, "receipt.jpg");
                form.append("consent", "true");
                form.append("reason", item.error ?? "");
                form.append("lang", lang);
                const res = await fetch("/api/contribute", {
                    method: "POST",
                    body: form,
                });
                const data = await res.json();
                if (data.ok) patchItem(id, { contributed: true });
            } catch {
                /* leave the prompt available to try again */
            }
        })();
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

    /** Append one accepted check to the sheet, then drop it on success. */
    async function sendOne(item: BatchItem) {
        patchItem(item.id, { status: "sending" });
        try {
            const edited = item.draft ? fromDraft(item.draft) : item.receipt;
            if (!edited) {
                patchItem(item.id, { status: "ready", error: t("app.error.noData") });
                return;
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
                patchItem(item.id, { status: "ready" });
                return;
            }
            if (res.status === 402) {
                patchItem(item.id, { status: "ready", error: t("app.error.noCredits") });
                return;
            }
            const data = await res.json();
            if (data.ok) {
                await dbDeleteItem(item.id);
                setBatch((items) => items.filter((i) => i.id !== item.id));
                setSavedTick((n) => n + 1);
            } else {
                patchItem(item.id, { status: "ready", error: data.error });
            }
        } catch {
            patchItem(item.id, { status: "ready", error: t("app.error.network") });
        } finally {
            void refreshBalance();
        }
    }

    function markAuthLost() {
        setAuthError(t("app.signin.error"));
        setAuth({ signedIn: false, oauthConfigured: true, googleUserId: null });
    }

    /** Look for an existing `[zippp]` sheet. Never creates one. */
    async function checkSheet() {
        setSheetPhase("checking");
        setSheetBusy(true);
        setSheetError(null);
        setSheetCandidates([]);
        setSheetCreated(false);
        try {
            const res = await fetch("/api/sheets/connect", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mode: "find" }),
            });
            if (res.status === 401) {
                markAuthLost();
                return;
            }
            const data = await res.json();
            if (data.ok && data.workspace) {
                setWorkspace(data.workspace);
                setSheetPhase("connected");
            } else if (
                data.needsPick &&
                Array.isArray(data.candidates) &&
                data.candidates.length > 0
            ) {
                setSheetCandidates(data.candidates as SheetCandidate[]);
                setSheetPhase("picking");
            } else {
                setSheetPhase("choose-source");
            }
        } catch {
            setSheetError(null);
            setSheetPhase("error");
        } finally {
            setSheetBusy(false);
        }
    }

    function showWizard() {
        setSheetError(null);
        setSheetCandidates([]);
        setSheetPhase("wizard");
    }

    /** List the `[zippp]` sheets so the user can choose one. */
    async function showPicker() {
        setSheetPhase("picking");
        setSheetBusy(true);
        setSheetError(null);
        setSheetCandidates([]);
        try {
            const res = await fetch("/api/sheets/connect", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mode: "list" }),
            });
            if (res.status === 401) {
                markAuthLost();
                return;
            }
            const data = await res.json();
            setSheetCandidates(
                Array.isArray(data.candidates)
                    ? (data.candidates as SheetCandidate[])
                    : []
            );
        } catch {
            setSheetError(null);
            setSheetPhase("error");
        } finally {
            setSheetBusy(false);
        }
    }

    function cancelSheetChoice() {
        setSheetError(null);
        setSheetCandidates([]);
        setSheetPhase(workspace ? "connected" : "choose-source");
    }

    async function pickSheet(id: string) {
        setSheetBusy(true);
        setSheetError(null);
        try {
            const res = await fetch("/api/sheets/connect", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ spreadsheetId: id }),
            });
            if (res.status === 401) {
                markAuthLost();
                return;
            }
            const data = await res.json();
            if (data.ok && data.workspace) {
                setWorkspace(data.workspace);
                setSheetCandidates([]);
                setSheetCreated(false);
                setSheetPhase("connected");
            } else {
                setSheetError(data.error ?? null);
            }
        } catch {
            setSheetError(null);
        } finally {
            setSheetBusy(false);
        }
    }

    /** Re-check the current sheet by reconnecting to the same id. */
    async function recheckSheet() {
        if (!workspace) {
            await checkSheet();
            return;
        }
        await pickSheet(workspace.spreadsheet_id);
    }

    /** List the `[zippp]` sheets for the quick selector. No phase change. */
    async function listSheetChoices(): Promise<SheetCandidate[]> {
        try {
            const res = await fetch("/api/sheets/connect", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mode: "list" }),
            });
            if (res.status === 401) {
                markAuthLost();
                return [];
            }
            const data = await res.json();
            return Array.isArray(data.candidates)
                ? (data.candidates as SheetCandidate[])
                : [];
        } catch {
            return [];
        }
    }

    async function createSheet(templateId: SheetTemplateId) {
        setPendingTemplate(templateId);
        setSheetBusy(true);
        setSheetError(null);
        setSheetCandidates([]);
        setSheetCreated(false);
        setSheetPhase("creating");
        try {
            const res = await fetch("/api/sheets/connect", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mode: "create", templateId }),
            });
            if (res.status === 401) {
                markAuthLost();
                setSheetPhase("wizard");
                return;
            }
            const data = await res.json();
            if (data.ok && data.workspace) {
                setWorkspace(data.workspace);
                setSheetCreated(true);
                setSheetPhase("connected");
            } else {
                setSheetError(data.error ?? null);
                setSheetPhase("error");
            }
        } catch {
            setSheetError(null);
            setSheetPhase("error");
        } finally {
            setSheetBusy(false);
            setPendingTemplate(null);
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
        setSheetCandidates([]);
        setSheetCreated(false);
        setSheetPhase("checking");
    }

    const value: Value = {
        t,
        lang,
        region,
        auth,
        authChecked,
        authError,
        workspace,
        sheetPhase,
        sheetBusy,
        sheetError,
        sheetCandidates,
        sheetCreated,
        pendingTemplate,
        balance,
        refreshBalance,
        savedTick,
        batch,
        openId,
        autoSnap,
        setAutoSnap,
        autoCooldownUntil,
        addFile,
        addBlob,
        setOpen,
        updateDraft,
        acceptItem,
        removeItem,
        retryItem,
        contributeItem,
        login,
        signOut,
        checkSheet,
        showWizard,
        showPicker,
        cancelSheetChoice,
        pickSheet,
        recheckSheet,
        listSheetChoices,
        createSheet,
    };

    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
