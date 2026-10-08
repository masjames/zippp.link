/** IndexedDB persistence for the admin eval page, so a phone session survives a refresh. */

export type EvalLabelDraft = {
    merchant: string;
    date: string;
    total: string;
    itemsJson: string;
};

export type EvalImageRecord = {
    id: string;
    name: string;
    blob: Blob;
    thumb: string;
    label: EvalLabelDraft;
};

const DB_NAME = "zippp-eval";
const DB_VERSION = 1;
const ITEMS = "items";

function open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(ITEMS)) {
                db.createObjectStore(ITEMS, { keyPath: "id" });
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

function run<T>(
    mode: IDBTransactionMode,
    fn: (store: IDBObjectStore) => IDBRequest
): Promise<T> {
    return open().then(
        (db) =>
            new Promise<T>((resolve, reject) => {
                const tx = db.transaction(ITEMS, mode);
                const req = fn(tx.objectStore(ITEMS));
                req.onsuccess = () => resolve(req.result as T);
                req.onerror = () => reject(req.error);
            })
    );
}

export function allEvalImages(): Promise<EvalImageRecord[]> {
    return run<EvalImageRecord[]>("readonly", (store) => store.getAll());
}

export function putEvalImage(record: EvalImageRecord): Promise<unknown> {
    return run("readwrite", (store) => store.put(record));
}

export function deleteEvalImage(id: string): Promise<unknown> {
    return run("readwrite", (store) => store.delete(id));
}

export function clearEvalImages(): Promise<unknown> {
    return run("readwrite", (store) => store.clear());
}
