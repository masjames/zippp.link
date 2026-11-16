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
    claimLegacyItems,
    countLegacyItems,
    deleteItem as dbDeleteItem,
    getMeta,
    putItem,
    setOpenId as dbSetOpenId,
    type BatchItem,
    type CaptureSource,
} from "@/lib/batch-db";
import { isPdfFile, isReceiptUpload, prepareImage } from "@/lib/image";
import { fromDraft, toDraft } from "./draft";
import { buildCorrectionRecord } from "@/lib/correction-diff";

export type AuthState = {
    signedIn: boolean;
    oauthConfigured: boolean;
    googleUserId: string | null;
    mobileApiEnabled?: boolean;
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
    | "naming"
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
    /** Claimed invitation, shown until the first successful top-up. */
    invite?: { email: string; minTopupIdr: number } | null;
};

type Value = {
    t: T;
    lang: Lang;
    region: Region;
    auth: AuthState | null;
    authChecked: boolean;
    sessionChecking: boolean;
    sessionCheckFailed: boolean;
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
    /** Browser storage failed; drafts may not survive leaving the page. */
    storageError: boolean;
    draftsReady: boolean;
    legacyDraftCount: number;
    claimingLegacy: boolean;
    claimLegacyDrafts: () => Promise<void>;
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
    /** After template pick: ask the user to name the sheet. */
    beginNameSheet: (templateId: SheetTemplateId) => void;
    /** Create a new sheet with a unique display name and connect it. */
    createSheet: (
        templateId: SheetTemplateId,
        sheetName: string
    ) => Promise<void>;
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
const EMPTY_BATCH: BatchItem[] = [];

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
    const [storageError, setStorageError] = useState(false);
    const [draftsReady, setDraftsReady] = useState(false);
    const [loadedOwner, setLoadedOwner] = useState<string | null>(null);
    const [legacyDraftCount, setLegacyDraftCount] = useState(0);
    const [claimingLegacy, setClaimingLegacy] = useState(false);
    const ownerRef = useRef<string | null>(null);
    const identityCheckOwner = useRef<string | null>(null);
    const [sessionChecking, setSessionChecking] = useState(false);
    const [sessionCheckFailed, setSessionCheckFailed] = useState(false);

    const inflight = useRef<Set<string>>(new Set());
    /** Sends run one at a time so the rows keep their order. */
    const sendQueue = useRef<Promise<void>>(Promise.resolve());

    // Preferences do not contain receipt data.
    useEffect(() => {
        try {
            const pref = localStorage.getItem(AUTOSNAP_KEY);
            if (pref === "0") setAutoSnapState(false);
        } catch {
            /* ignore */
        }
    }, []);

    // Wait for a known account before restoring receipt data.
    useEffect(() => {
        const owner = auth?.signedIn ? auth.googleUserId : null;
        ownerRef.current = owner;
        setStorageError(false);
        setBatch([]);
        setLoadedOwner(null);
        setOpenIdState(null);
        setDraftsReady(false);
        setLegacyDraftCount(0);
        if (!owner) {
            if (auth?.signedIn) setStorageError(true);
            return;
        }
        let alive = true;
        void (async () => {
            try {
                const [items, meta, legacyCount] = await Promise.all([
                    allItems(owner), getMeta(owner), countLegacyItems(),
                ]);
                if (!alive || ownerRef.current !== owner) return;
                setBatch(items);
                setOpenIdState(meta.openId);
                setLegacyDraftCount(legacyCount);
                setLoadedOwner(owner);
                setDraftsReady(true);
            } catch {
                if (alive && ownerRef.current === owner) setStorageError(true);
            }
        })();
        return () => {
            alive = false;
            if (ownerRef.current === owner) ownerRef.current = null;
        };
    }, [auth?.signedIn, auth?.googleUserId]);

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

    // A different account can sign in from another tab while this page sleeps.
    useEffect(() => {
        const owner = auth?.signedIn ? auth.googleUserId : null;
        if (!authChecked || !owner) return;
        let alive = true;
        let controller: AbortController | null = null;

        const verifySession = async () => {
            if (identityCheckOwner.current !== null || document.visibilityState !== "visible") return;
            identityCheckOwner.current = owner;
            setSessionCheckFailed(false);
            setSessionChecking(true);
            setDraftsReady(false);
            setLoadedOwner(null);
            setBatch([]);
            setOpenIdState(null);
            setLegacyDraftCount(0);
            controller = new AbortController();
            try {
                const response = await fetch("/api/auth/session", { cache: "no-store", signal: controller.signal });
                if (!response.ok) throw new Error("Could not verify account");
                const current = await response.json() as { signedIn: boolean; userId: string | null };
                if (!alive) return;
                if (!current.signedIn || current.userId !== owner) {
                    clearDraftView();
                    setWorkspace(null);
                    setBalance(null);
                    setSessionCheckFailed(true);
                    window.location.reload();
                    return;
                }
                if (ownerRef.current !== owner) return;
                const [items, meta, legacyCount] = await Promise.all([
                    allItems(owner), getMeta(owner), countLegacyItems(),
                ]);
                if (!alive || ownerRef.current !== owner) return;
                setBatch(items);
                setOpenIdState(meta.openId);
                setLegacyDraftCount(legacyCount);
                setLoadedOwner(owner);
                setStorageError(false);
                setDraftsReady(true);
            } catch {
                if (alive && ownerRef.current === owner) {
                    setSessionCheckFailed(true);
                    setStorageError(true);
                }
            } finally {
                if (identityCheckOwner.current === owner) identityCheckOwner.current = null;
                if (alive) setSessionChecking(false);
            }
        };

        const onVisibility = () => {
            if (document.visibilityState === "visible") void verifySession();
        };
        window.addEventListener("focus", verifySession);
        document.addEventListener("visibilitychange", onVisibility);
        return () => {
            alive = false;
            controller?.abort();
            if (identityCheckOwner.current === owner) identityCheckOwner.current = null;
            window.removeEventListener("focus", verifySession);
            document.removeEventListener("visibilitychange", onVisibility);
        };
    }, [authChecked, auth?.signedIn, auth?.googleUserId]);


    function patchItem(id: string, patch: Partial<BatchItem>) {
        setBatch((items) => {
            const next = items.map((it) =>
                it.id === id && it.ownerId === ownerRef.current ? { ...it, ...patch } : it
            );
            const changed = next.find((it) => it.id === id && it.ownerId === ownerRef.current);
            if (changed) void putItem(changed).catch(() => setStorageError(true));
            return next;
        });
    }

    // Extract queued items, up to MAX_CONCURRENT_EXTRACTIONS at a time.
    useEffect(() => {
        if (!auth?.signedIn || !auth.googleUserId || loadedOwner !== auth.googleUserId || !draftsReady) return;
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
    }, [batch, auth?.signedIn, auth?.googleUserId, loadedOwner, draftsReady]);

    async function extractItem(item: BatchItem) {
        try {
            const form = new FormData();
            form.append("image", item.blob, "receipt.jpg");
            const res = await fetch("/api/extract", { method: "POST", body: form });
            const data = (await res.json()) as ExtractResponse;
            if (data.ok) {
                const draft = toDraft(data.receipt);
                patchItem(item.id, {
                    status: "ready",
                    receipt: data.receipt,
                    draft,
                    debug: data.debug ?? null,
                });
            } else if (item.source === "auto" && data.refusal === "not_a_receipt") {
                // Auto captures only stick if the read is a receipt. Drop it
                // silently and pause auto-capture so the same scene is not retried.
                if (ownerRef.current === item.ownerId) {
                    setAutoCooldownUntil(Date.now() + REFUSAL_COOLDOWN_MS);
                    setBatch((items) => items.filter((i) => i.id !== item.id || i.ownerId !== item.ownerId));
                }
                if (item.ownerId) void dbDeleteItem(item.ownerId, item.id).catch(() => setStorageError(true));
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
        const owner = ownerRef.current;
        if (!owner || !draftsReady || loadedOwner !== owner || auth?.googleUserId !== owner) return;
        const id = crypto.randomUUID();
        const createdAt = Date.now();
        const item: BatchItem = {
            id,
            ownerId: owner,
            createdAt,
            blob,
            thumb,
            status: "queued",
            source,
        };
        // Show the card first; persist in the background.
        setBatch((items) => ownerRef.current === owner ? [item, ...items] : items);
        void putItem(item).catch(() => setStorageError(true));
    }

    function addFile(file: File, source: CaptureSource = "manual") {
        const owner = ownerRef.current;
        if (!owner || !draftsReady || loadedOwner !== owner || auth?.googleUserId !== owner) return;
        void (async () => {
            if (!isReceiptUpload(file)) return;
            try {
                const { blob, thumb } = await prepareImage(file);
                if (ownerRef.current !== owner) return;
                if (isPdfFile(file) && (isPdfFile(blob) || !thumb)) {
                    throw new Error("pdf failed");
                }
                addBlob(blob, thumb, source);
            } catch {
                if (ownerRef.current !== owner) return;
                const item: BatchItem = {
                    id: crypto.randomUUID(),
                    ownerId: owner,
                    createdAt: Date.now(),
                    blob: file,
                    thumb: "",
                    status: "failed",
                    source,
                    error: t("app.capture.pdfFailed"),
                };
                setBatch((items) => ownerRef.current === owner ? [item, ...items] : items);
                void putItem(item).catch(() => setStorageError(true));
            }
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
        const owner = ownerRef.current;
        if (!owner || (id !== null && !batch.some((item) => item.id === id && item.ownerId === owner))) return;
        void dbSetOpenId(owner, id).catch(() => setStorageError(true));
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
            body: JSON.stringify({ ...record, lang, expectedUserId: item.ownerId }),
        }).catch(() => undefined);
    }

    function acceptItem(id: string) {
        const item = batch.find((i) => i.id === id);
        if (!item || item.ownerId !== ownerRef.current) return;
        logCorrection(item);
        patchItem(id, { status: "accepted" });
        const remaining = batch.filter(
            (i) => i.id !== id && i.ownerId === item.ownerId && i.status !== "accepted"
        );
        setOpen(remaining[0]?.id ?? null);
        // Accept writes the row straight away: one check, one sheet row.
        sendQueue.current = sendQueue.current
            .then(() => sendOne(item))
            .catch(() => undefined);
    }

    function removeItem(id: string) {
        const item = batch.find((candidate) => candidate.id === id);
        if (!item?.ownerId || item.ownerId !== ownerRef.current) return;
        setBatch((items) => items.filter((i) => i.id !== id || i.ownerId !== item.ownerId));
        void dbDeleteItem(item.ownerId, id).catch(() => setStorageError(true));
        if (openId === id) {
            const remaining = batch.filter((i) => i.id !== id && i.ownerId === item.ownerId);
            setOpen(remaining[0]?.id ?? null);
        }
    }

    function retryItem(id: string) {
        patchItem(id, { status: "queued", error: undefined });
    }

    function contributeItem(id: string) {
        const item = batch.find((candidate) => candidate.id === id);
        const owner = item?.ownerId;
        if (!item || !owner || owner !== ownerRef.current) return;
        void (async () => {
            try {
                const form = new FormData();
                form.append("image", item.blob, "receipt.jpg");
                form.append("consent", "true");
                form.append("expectedUserId", owner);
                form.append("reason", item.error ?? "");
                form.append("lang", lang);
                if (ownerRef.current !== owner) return;
                const res = await fetch("/api/contribute", {
                    method: "POST",
                    body: form,
                });
                const data = await res.json();
                if (data.ok && ownerRef.current === owner) patchItem(id, { contributed: true });
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
        const owner = item.ownerId;
        if (!owner || ownerRef.current !== owner) return;
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
                    payment: (item.draft?.payment ?? "").trim() || null,
                    purpose: (item.draft?.purpose ?? "").trim() || null,
                    customer: (item.draft?.customer ?? "").trim() || null,
                    expectedUserId: owner,
                    scanId: item.id,
                }),
            });
            if (res.status === 401) {
                if (ownerRef.current === owner) {
                    patchItem(item.id, { status: "ready" });
                    markAuthLost();
                }
                return;
            }
            if (res.status === 403) {
                const data = await res.json().catch(() => ({}));
                if (data.code === "OWNER_MISMATCH" && ownerRef.current === owner) {
                    clearDraftView();
                    setWorkspace(null);
                    setBalance(null);
                    setSessionCheckFailed(true);
                    window.location.reload();
                }
                return;
            }
            if (res.status === 402) {
                patchItem(item.id, { status: "ready", error: t("app.error.noCredits") });
                return;
            }
            const data = await res.json();
            if (data.ok) {
                await dbDeleteItem(owner, item.id).catch((error: unknown) => {
                    if (ownerRef.current === owner) setStorageError(true);
                    throw error;
                });
                if (ownerRef.current === owner) {
                    setBatch((items) => items.filter((i) => i.id !== item.id || i.ownerId !== owner));
                    setSavedTick((n) => n + 1);
                }
            } else {
                patchItem(item.id, { status: "ready", error: data.error });
            }
        } catch {
            if (ownerRef.current === owner) {
                patchItem(item.id, { status: "ready", error: t("app.error.network") });
            }
        } finally {
            if (ownerRef.current === owner) void refreshBalance();
        }
    }

    function markAuthLost() {
        clearDraftView();
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

    function beginNameSheet(templateId: SheetTemplateId) {
        setPendingTemplate(templateId);
        setSheetError(null);
        setSheetPhase("naming");
    }

    async function createSheet(
        templateId: SheetTemplateId,
        sheetName: string
    ) {
        if (!sheetName.trim()) {
            setSheetError(t("app.sheets.name.required"));
            setPendingTemplate(templateId);
            setSheetPhase("naming");
            return;
        }
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
                body: JSON.stringify({
                    mode: "create",
                    templateId,
                    sheetName,
                }),
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
                setPendingTemplate(null);
            } else if (data.duplicateName || res.status === 409) {
                setSheetError(t("app.sheets.name.duplicate"));
                setSheetPhase("naming");
            } else {
                setSheetError(data.error ?? null);
                setSheetPhase("error");
            }
        } catch {
            setSheetError(null);
            setSheetPhase("error");
            setPendingTemplate(null);
        } finally {
            setSheetBusy(false);
        }
    }

    function clearDraftView() {
        ownerRef.current = null;
        setLoadedOwner(null);
        setBatch([]);
        setOpenIdState(null);
        setDraftsReady(false);
        setLegacyDraftCount(0);
        setSessionChecking(false);
        setSessionCheckFailed(false);
    }

    async function claimLegacyDrafts() {
        const owner = ownerRef.current;
        if (!owner || !draftsReady || loadedOwner !== owner || claimingLegacy) return;
        setClaimingLegacy(true);
        try {
            await claimLegacyItems(owner);
            const [items, count] = await Promise.all([allItems(owner), countLegacyItems()]);
            if (ownerRef.current !== owner) return;
            setBatch((current) => {
                if (ownerRef.current !== owner) return current;
                const existing = new Set(current.map((item) => item.id));
                return [...current, ...items.filter((item) => !existing.has(item.id))]
                    .sort((a, b) => b.createdAt - a.createdAt);
            });
            setLegacyDraftCount(count);
        } catch {
            if (ownerRef.current === owner) setStorageError(true);
        } finally {
            if (ownerRef.current === owner) setClaimingLegacy(false);
        }
    }

    const activeOwner = auth?.signedIn ? auth.googleUserId : null;
    const visibleDraftsReady = Boolean(activeOwner && loadedOwner === activeOwner && draftsReady);
    const visibleBatch = visibleDraftsReady ? batch : EMPTY_BATCH;

    function login() {
        setAuthError(null);
        window.location.href = "/api/auth/login";
    }

    async function signOut() {
        clearDraftView();
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
        sessionChecking,
        sessionCheckFailed,
        storageError,
        draftsReady: visibleDraftsReady,
        legacyDraftCount: visibleDraftsReady ? legacyDraftCount : 0,
        claimingLegacy,
        claimLegacyDrafts,
        batch: visibleBatch,
        openId: visibleDraftsReady ? openId : null,
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
        beginNameSheet,
        createSheet,
    };

    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
