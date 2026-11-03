// @implements FEAT-116
import { randomUUID } from "node:crypto";
import { billingConfigured, command } from "@/lib/billing/redis";

/**
 * Assets and goals live inside a Space. Assets carry a value; goals carry a
 * target and a progress amount. Archived rows stay stored but leave the list.
 */

export type LedgerKind = "asset" | "goal";

export type SpaceLedgerItem = {
    id: string;
    space_id: string;
    kind: LedgerKind;
    name: string;
    amount: number;
    progress: number | null;
    note: string | null;
    archived: boolean;
    created_by: string;
    created_at: number;
    updated_at: number;
};

const ledgerKey = (spaceId: string) => `space:ledger:${spaceId}`;
const memLedger = new Map<string, Map<string, SpaceLedgerItem>>();

function useRedis(): boolean {
    if (billingConfigured()) return true;
    if (process.env.NODE_ENV === "production") {
        throw new Error("LEDGER_STORE_UNAVAILABLE");
    }
    return false;
}

export function normalizeItemName(name: string): string {
    return name
        .replace(/[\u0000-\u001f\u007f]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 80);
}

function normalizeNote(note: string | null | undefined): string | null {
    if (typeof note !== "string") return null;
    const value = note
        .replace(/[\u0000-\u001f\u007f]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 280);
    return value === "" ? null : value;
}

function normalizeAmount(amount: unknown): number | null {
    if (typeof amount !== "number" || !Number.isFinite(amount)) return null;
    if (amount < 0 || amount > 1e15) return null;
    return Math.round(amount * 100) / 100;
}

function isKind(value: unknown): value is LedgerKind {
    return value === "asset" || value === "goal";
}

async function saveItem(item: SpaceLedgerItem): Promise<void> {
    if (!useRedis()) {
        let bucket = memLedger.get(item.space_id);
        if (!bucket) {
            bucket = new Map();
            memLedger.set(item.space_id, bucket);
        }
        bucket.set(item.id, item);
        return;
    }
    await command([
        "HSET",
        ledgerKey(item.space_id),
        item.id,
        JSON.stringify(item),
    ]);
}

export async function listLedger(spaceId: string): Promise<SpaceLedgerItem[]> {
    if (!useRedis()) {
        const bucket = memLedger.get(spaceId);
        if (!bucket) return [];
        return [...bucket.values()]
            .filter((item) => !item.archived)
            .sort((a, b) => a.created_at - b.created_at);
    }
    try {
        const raw = (await command(["HGETALL", ledgerKey(spaceId)])) as
            | string[]
            | null;
        const out: SpaceLedgerItem[] = [];
        if (Array.isArray(raw)) {
            for (let i = 0; i + 1 < raw.length; i += 2) {
                try {
                    const item = JSON.parse(raw[i + 1]) as SpaceLedgerItem;
                    if (!item.archived) out.push(item);
                } catch {
                    /* skip unreadable rows */
                }
            }
        }
        return out.sort((a, b) => a.created_at - b.created_at);
    } catch {
        return [];
    }
}

export async function createLedgerItem(params: {
    spaceId: string;
    userId: string;
    kind: LedgerKind;
    name: string;
    amount: unknown;
    progress?: unknown;
    note?: string | null;
}): Promise<SpaceLedgerItem> {
    if (!isKind(params.kind)) throw new Error("INVALID_KIND");
    const name = normalizeItemName(params.name);
    if (!name) throw new Error("INVALID_NAME");
    const amount = normalizeAmount(params.amount);
    if (amount === null) throw new Error("INVALID_AMOUNT");

    let progress: number | null = null;
    if (params.kind === "goal") {
        progress = normalizeAmount(params.progress ?? 0);
        if (progress === null) throw new Error("INVALID_AMOUNT");
    }

    const now = Date.now();
    const item: SpaceLedgerItem = {
        id: randomUUID(),
        space_id: params.spaceId,
        kind: params.kind,
        name,
        amount,
        progress,
        note: normalizeNote(params.note),
        archived: false,
        created_by: params.userId,
        created_at: now,
        updated_at: now,
    };
    await saveItem(item);
    return item;
}

async function readItem(
    spaceId: string,
    id: string
): Promise<SpaceLedgerItem | null> {
    if (!useRedis()) {
        return memLedger.get(spaceId)?.get(id) ?? null;
    }
    const raw = (await command(["HGET", ledgerKey(spaceId), id])) as
        | string
        | null;
    if (!raw) return null;
    try {
        return JSON.parse(raw) as SpaceLedgerItem;
    } catch {
        return null;
    }
}

export async function updateLedgerItem(params: {
    spaceId: string;
    id: string;
    name?: unknown;
    amount?: unknown;
    progress?: unknown;
    note?: unknown;
}): Promise<SpaceLedgerItem | null> {
    const item = await readItem(params.spaceId, params.id);
    if (!item || item.archived) return null;

    if (params.name !== undefined) {
        const name = normalizeItemName(String(params.name));
        if (!name) throw new Error("INVALID_NAME");
        item.name = name;
    }
    if (params.amount !== undefined) {
        const amount = normalizeAmount(params.amount);
        if (amount === null) throw new Error("INVALID_AMOUNT");
        item.amount = amount;
    }
    if (item.kind === "goal" && params.progress !== undefined) {
        const progress = normalizeAmount(params.progress);
        if (progress === null) throw new Error("INVALID_AMOUNT");
        item.progress = progress;
    }
    if (params.note !== undefined) {
        item.note = normalizeNote(
            params.note === null ? null : String(params.note)
        );
    }
    item.updated_at = Date.now();
    await saveItem(item);
    return item;
}

export async function archiveLedgerItem(
    spaceId: string,
    id: string
): Promise<boolean> {
    const item = await readItem(spaceId, id);
    if (!item || item.archived) return false;
    item.archived = true;
    item.updated_at = Date.now();
    await saveItem(item);
    return true;
}

/** Test helper */
export function __resetLedgerStoreForTests(): void {
    memLedger.clear();
}
