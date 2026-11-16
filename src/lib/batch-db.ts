import type { Draft } from "@/components/app/draft";
import type { ExtractDebug, Receipt } from "@/types/receipt";
import {
    createDraftEncryptionKey,
    decryptBatchItem,
    encryptBatchItem,
    isEncryptedBatchItem,
    type EncryptedBatchBlob,
    type EncryptedBatchItem,
} from "./draft-crypto";

/** Status of one captured receipt in the batch. */
export type BatchStatus =
    | "queued"
    | "reading"
    | "ready"
    | "failed"
    | "accepted"
    | "sending";

export type CaptureSource = "auto" | "manual";

export type BatchItem = {
    id: string;
    /** Missing on drafts created before account-scoped storage. */
    ownerId?: string;
    createdAt: number;
    /** Capture bytes are immutable for an ID; a replacement photo needs a new ID. */
    blob: Blob;
    thumb: string;
    status: BatchStatus;
    /** How it was captured; auto captures that are not receipts are dropped. */
    source?: CaptureSource;
    receipt?: Receipt;
    draft?: Draft;
    debug?: ExtractDebug | null;
    error?: string;
    /** The user chose to donate this photo to the improvement set. */
    contributed?: boolean;
};

const DB_NAME = "zippp";
const DB_VERSION = 3;
const ITEMS = "items";
const META = "meta";
const KEYS = "keys";
const OWNER_INDEX = "ownerId";

type MetaRecord = { key: string; openId: string | null };

function hasOwnerId(value: unknown): value is string {
    return typeof value === "string" && value.trim().length > 0 && value === value.trim();
}

function open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        let blocked = false;
        req.onupgradeneeded = () => {
            const db = req.result;
            const items = db.objectStoreNames.contains(ITEMS)
                ? req.transaction!.objectStore(ITEMS)
                : db.createObjectStore(ITEMS, { keyPath: "id" });
            if (!items.indexNames.contains(OWNER_INDEX)) {
                items.createIndex(OWNER_INDEX, "ownerId", { unique: false });
            }
            if (!db.objectStoreNames.contains(META)) {
                db.createObjectStore(META, { keyPath: "key" });
            }
            if (!db.objectStoreNames.contains(KEYS)) {
                db.createObjectStore(KEYS, { keyPath: "ownerId" });
            }
        };
        req.onblocked = () => {
            blocked = true;
            reject(new Error("IndexedDB upgrade blocked"));
        };
        req.onsuccess = () => {
            if (blocked) {
                req.result.close();
                return;
            }
            req.result.onversionchange = () => req.result.close();
            resolve(req.result);
        };
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
            // Promise.withResolvers is unavailable in older supported browsers.
            new Promise<T>((resolve, reject) => {
                let tx: IDBTransaction;
                let req: IDBRequest;
                try {
                    tx = db.transaction(store, mode);
                    req = fn(tx.objectStore(store));
                } catch (error) {
                    db.close();
                    reject(error);
                    return;
                }
                tx.oncomplete = () => {
                    const result = req.result as T;
                    db.close();
                    resolve(result);
                };
                tx.onabort = () => {
                    const error = tx.error ?? req.error ?? new Error("IndexedDB transaction aborted");
                    db.close();
                    reject(error);
                };
            })
    );
}
type StoredBatchItem = BatchItem | EncryptedBatchItem;
type KeyRecord = { ownerId: string; key: CryptoKey };
const ownerKeys = new Map<string, CryptoKey>();
const encryptedBlobsByOwner = new Map<string, Map<string, EncryptedBatchBlob>>();

function encryptedBlob(ownerId: string, id: string): EncryptedBatchBlob | undefined {
    return encryptedBlobsByOwner.get(ownerId)?.get(id);
}

function rememberEncryptedBlob(record: EncryptedBatchBlob): void {
    let records = encryptedBlobsByOwner.get(record.ownerId);
    if (!records) {
        records = new Map();
        encryptedBlobsByOwner.set(record.ownerId, records);
    }
    records.set(record.id, record);
}

function forgetEncryptedBlob(ownerId: string, id: string): void {
    const records = encryptedBlobsByOwner.get(ownerId);
    if (!records) return;
    records.delete(id);
    if (records.size === 0) encryptedBlobsByOwner.delete(ownerId);
}

function usableEncryptionKey(record: KeyRecord | undefined): CryptoKey | null {
    const key = record?.key;
    return key?.type === "secret" && key.algorithm?.name === "AES-GCM" && !key.extractable
        ? key
        : null;
}

async function ownerKey(
    ownerId: string,
    ownedRecords?: StoredBatchItem[]
): Promise<CryptoKey> {
    if (!hasOwnerId(ownerId)) throw new Error("Missing draft owner");
    const cached = ownerKeys.get(ownerId);
    if (cached) return cached;

    const existing = await run<KeyRecord | undefined>(KEYS, "readonly", (store) =>
        store.get(ownerId)
    );
    if (existing) {
        const key = usableEncryptionKey(existing);
        if (key) {
            ownerKeys.set(ownerId, key);
            return key;
        }
        throw new Error("Stored draft encryption key is invalid");
    }

    const records =
        ownedRecords ??
        (await run<StoredBatchItem[]>(ITEMS, "readonly", (store) =>
            store.index(OWNER_INDEX).getAll(ownerId)
        ));
    const hasEncryptedRecord = records.some(
        (record) => isEncryptedBatchItem(record) || "encryptionVersion" in record
    );
    if (hasEncryptedRecord) {
        const concurrent = await run<KeyRecord | undefined>(KEYS, "readonly", (store) =>
            store.get(ownerId)
        );
        const key = usableEncryptionKey(concurrent);
        if (key) {
            ownerKeys.set(ownerId, key);
            return key;
        }
        throw new Error("Draft encryption key is missing");
    }

    const key = await createDraftEncryptionKey();
    try {
        await run(KEYS, "readwrite", (store) => store.add({ ownerId, key }));
        ownerKeys.set(ownerId, key);
        return key;
    } catch (error) {
        const winner = await run<KeyRecord | undefined>(KEYS, "readonly", (store) =>
            store.get(ownerId)
        );
        const winningKey = usableEncryptionKey(winner);
        if (winningKey) {
            ownerKeys.set(ownerId, winningKey);
            return winningKey;
        }
        throw error;
    }
}

async function migrateOwnedPlaintext(
    item: BatchItem,
    key: CryptoKey
): Promise<EncryptedBatchItem | null> {
    const encrypted = await encryptBatchItem(item, key);
    let committed: EncryptedBatchItem | null = null;
    await run(ITEMS, "readwrite", (store) => {
        const request = store.get(item.id);
        request.onsuccess = () => {
            const current = request.result as StoredBatchItem | undefined;
            if (!current || current.ownerId !== item.ownerId) return;
            if (isEncryptedBatchItem(current)) {
                committed = current;
                return;
            }
            if ("encryptionVersion" in current) return;
            store.put(encrypted);
            committed = encrypted;
        };
        return request;
    });
    if (committed) rememberEncryptedBlob(committed);
    return committed;
}

/** Resume extraction, but require another review after an interrupted send. */
export function recoverBatchItem(item: BatchItem): BatchItem {
    // Old drafts marked capture-time dates as assumed; never send them as receipt facts.
    const legacyDraft = item.draft as (Draft & { dateAssumed?: boolean }) | undefined;
    if (legacyDraft && "dateAssumed" in legacyDraft) {
        const { dateAssumed, ...draft } = legacyDraft;
        item = { ...item, draft: { ...draft, date: dateAssumed === true ? "" : draft.date } };
    }
    if (item.status === "reading") return { ...item, status: "queued" };
    if (item.status === "accepted" || item.status === "sending") {
        return { ...item, status: item.draft || item.receipt ? "ready" : "queued" };
    }
    return item;
}

export async function allItems(ownerId: string): Promise<BatchItem[]> {
    if (!hasOwnerId(ownerId)) throw new Error("Missing draft owner");
    const records = await run<StoredBatchItem[]>(ITEMS, "readonly", (store) =>
        store.index(OWNER_INDEX).getAll(ownerId)
    );
    const key = await ownerKey(ownerId, records);
    const items: BatchItem[] = [];
    for (const record of records) {
        if (record.ownerId !== ownerId) continue;
        if (isEncryptedBatchItem(record)) {
            const decrypted = await decryptBatchItem(record, key);
            rememberEncryptedBlob(record);
            items.push(recoverBatchItem(decrypted));
            continue;
        }
        if ("encryptionVersion" in record) {
            throw new Error("Unsupported encrypted draft record");
        }
        const recovered = recoverBatchItem(record as BatchItem);
        const committed = await migrateOwnedPlaintext(recovered, key);
        if (committed) {
            items.push(recoverBatchItem(await decryptBatchItem(committed, key)));
        }
    }
    return items.sort((a, b) => b.createdAt - a.createdAt);
}

export async function putItem(item: BatchItem): Promise<unknown> {
    if (!hasOwnerId(item.ownerId)) throw new Error("Missing draft owner");
    const key = await ownerKey(item.ownerId);
    const encrypted = await encryptBatchItem(
        item,
        key,
        encryptedBlob(item.ownerId, item.id)
    );
    const result = await run(ITEMS, "readwrite", (store) => {
        const request = store.get(item.id);
        request.onsuccess = () => {
            const existing = request.result as StoredBatchItem | undefined;
            if (existing && existing.ownerId !== item.ownerId) {
                store.transaction.abort();
                return;
            }
            store.put(encrypted);
        };
        return request;
    });
    rememberEncryptedBlob(encrypted);
    return result;
}

export async function deleteItem(ownerId: string, id: string): Promise<unknown> {
    if (!hasOwnerId(ownerId)) throw new Error("Missing draft owner");
    const result = await run(ITEMS, "readwrite", (store) => {
        const request = store.get(id);
        request.onsuccess = () => {
            const item = request.result as StoredBatchItem | undefined;
            if (hasOwnerId(item?.ownerId) && item.ownerId === ownerId) store.delete(id);
        };
        return request;
    });
    forgetEncryptedBlob(ownerId, id);
    return result;
}

export async function getMeta(ownerId: string): Promise<{ openId: string | null }> {
    if (!hasOwnerId(ownerId)) throw new Error("Missing draft owner");
    const rec = await run<MetaRecord | undefined>(META, "readonly", (s) =>
        s.get(`ui:${ownerId}`)
    );
    return { openId: rec?.openId ?? null };
}

export function setOpenId(ownerId: string, openId: string | null): Promise<unknown> {
    if (!hasOwnerId(ownerId)) return Promise.reject(new Error("Missing draft owner"));
    return run(META, "readwrite", (s) => s.put({ key: `ui:${ownerId}`, openId }));
}

/** Claim only unowned data; never reassign a draft that already belongs to someone. */
export function claimLegacyItem(item: BatchItem, ownerId: string): BatchItem | null {
    if (!hasOwnerId(ownerId)) throw new Error("Missing draft owner");
    if (!hasOwnerId(item.ownerId)) return { ...item, ownerId };
    return item.ownerId === ownerId ? item : null;
}

/** Count unowned legacy drafts or atomically assign them to the chosen account. */
function scanLegacyItems(ownerId?: string): Promise<number> {
    return open().then(
        (db) =>
            // Promise.withResolvers is unavailable in older supported browsers.
            new Promise<number>((resolve, reject) => {
                let tx: IDBTransaction;
                let req: IDBRequest<IDBCursorWithValue | null>;
                try {
                    tx = db.transaction(ITEMS, ownerId ? "readwrite" : "readonly");
                    req = tx.objectStore(ITEMS).openCursor();
                } catch (error) {
                    db.close();
                    reject(error);
                    return;
                }
                let count = 0;
                req.onsuccess = () => {
                    const cursor = req.result;
                    if (!cursor) return;
                    const item = cursor.value as BatchItem;
                    if (!hasOwnerId(item.ownerId)) count++;
                    if (ownerId) {
                        const claimed = claimLegacyItem(item, ownerId);
                        if (claimed && claimed !== item) cursor.update(claimed);
                    }
                    cursor.continue();
                };
                tx.oncomplete = () => {
                    db.close();
                    resolve(count);
                };
                tx.onabort = () => {
                    const error = tx.error ?? req.error ?? new Error("IndexedDB transaction aborted");
                    db.close();
                    reject(error);
                };
            })
    );
}

export function countLegacyItems(): Promise<number> {
    return scanLegacyItems();
}

export function claimLegacyItems(ownerId: string): Promise<number> {
    if (!hasOwnerId(ownerId)) return Promise.reject(new Error("Missing draft owner"));
    return scanLegacyItems(ownerId);
}
