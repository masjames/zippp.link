import type { Draft } from "@/components/app/draft";
import type { ExtractDebug, Receipt } from "@/types/receipt";

/** Status of one captured receipt in the batch. */
export type BatchStatus =
    | "queued"
    | "reading"
    | "ready"
    | "failed"
    | "accepted"
    | "sending";

export type BatchItem = {
    id: string;
    createdAt: number;
    blob: Blob;
    thumb: string;
    status: BatchStatus;
    receipt?: Receipt;
    draft?: Draft;
    debug?: ExtractDebug | null;
    error?: string;
};

const DB_NAME = "zippp";
const DB_VERSION = 1;
const ITEMS = "items";
const META = "meta";

type MetaRecord = { key: "ui"; openId: string | null };

function open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(ITEMS)) {
                db.createObjectStore(ITEMS, { keyPath: "id" });
            }
            if (!db.objectStoreNames.contains(META)) {
                db.createObjectStore(META, { keyPath: "key" });
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

function run<T>(
    store: string,
    mode: IDBTransactionMode,
    fn: (s: IDBObjectStore) => IDBRequest
): Promise<T> {
    return open().then(
        (db) =>
            new Promise<T>((resolve, reject) => {
                const tx = db.transaction(store, mode);
                const req = fn(tx.objectStore(store));
                req.onsuccess = () => resolve(req.result as T);
                req.onerror = () => reject(req.error);
            })
    );
}

export async function allItems(): Promise<BatchItem[]> {
    const items = await run<BatchItem[]>(ITEMS, "readonly", (s) => s.getAll());
    return items.sort((a, b) => b.createdAt - a.createdAt);
}

export function putItem(item: BatchItem): Promise<unknown> {
    return run(ITEMS, "readwrite", (s) => s.put(item));
}

export function deleteItem(id: string): Promise<unknown> {
    return run(ITEMS, "readwrite", (s) => s.delete(id));
}

export function clearItems(): Promise<unknown> {
    return run(ITEMS, "readwrite", (s) => s.clear());
}

export async function getMeta(): Promise<{ openId: string | null }> {
    const rec = await run<MetaRecord | undefined>(META, "readonly", (s) =>
        s.get("ui")
    );
    return { openId: rec?.openId ?? null };
}

export function setOpenId(openId: string | null): Promise<unknown> {
    return run(META, "readwrite", (s) => s.put({ key: "ui", openId }));
}
