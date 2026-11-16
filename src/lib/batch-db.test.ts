import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { allItems, claimLegacyItem, deleteItem, putItem, recoverBatchItem, type BatchItem } from "./batch-db";
import {
    createDraftEncryptionKey,
    encryptBatchItem,
    isEncryptedBatchItem,
} from "./draft-crypto";
import { fromDraft, toDraft } from "../components/app/draft";

const item: BatchItem = {
    id: "synthetic-receipt",
    ownerId: "synthetic-user",
    createdAt: 1,
    blob: new Blob(["synthetic"]),
    thumb: "",
    status: "reading",
};
const receipt: NonNullable<BatchItem["receipt"]> = {
    merchant: "Example",
    date: "2026-01-02",
    currency: "IDR",
    category: null,
    line_items: [],
    subtotal: null,
    tax: null,
    total: 100,
};

test("interrupted extraction resumes instead of opening an empty review", () => {
    assert.equal(recoverBatchItem(item).status, "queued");
    assert.equal(recoverBatchItem({ ...item, status: "accepted" }).status, "queued");
});

test("interrupted sends return to review and do not resume sending", () => {
    for (const status of ["accepted", "sending"] as const) {
        const restored = recoverBatchItem({ ...item, status, receipt });
        assert.equal(restored.status, "ready");
        assert.equal(restored.receipt, receipt);
    }
    assert.equal(recoverBatchItem({ ...item, status: "failed" }).status, "failed");
});

test("missing receipt dates remain empty through review and submission", () => {
    const original = { ...receipt, date: null };
    const draft = toDraft(original);
    assert.equal(draft.date, "");
    assert.equal(fromDraft(draft).date, null);
    assert.equal(fromDraft({ ...draft, date: "2026-01-03" }).date, "2026-01-03");
});

test("legacy assumed dates are cleared while user-edited dates are preserved", () => {
    const base = toDraft({ ...receipt, date: null });
    const assumed = { ...base, date: "2026-01-02", dateAssumed: true };
    const edited = { ...base, date: "2026-01-03", dateAssumed: false };
    const recoveredAssumed = recoverBatchItem({ ...item, status: "ready", draft: assumed });
    const recoveredEdited = recoverBatchItem({ ...item, status: "ready", draft: edited });
    assert.equal(recoveredAssumed.draft?.date, "");
    assert.equal(fromDraft(recoveredAssumed.draft!).date, null);
    assert.equal(recoveredEdited.draft?.date, "2026-01-03");
    assert.equal(fromDraft(recoveredEdited.draft!).date, "2026-01-03");
});

function installFakeIndexedDb(t: TestContext) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, "indexedDB");
    type FakeRequest = {
        result: unknown;
        error: DOMException | null;
        onsuccess: (() => void) | null;
        onerror: (() => void) | null;
    };
    type FakeTransaction = {
        error: DOMException | null;
        oncomplete: (() => void) | null;
        onabort: (() => void) | null;
        abort: () => void;
        objectStore: () => FakeStore;
    };
    type FakeStore = {
        transaction: FakeTransaction;
        get: (key?: string) => FakeRequest;
        add: (value: unknown) => FakeRequest;
        put: (value: unknown) => FakeRequest;
        delete: (key?: string) => FakeRequest;
        index: (name: string) => { getAll: (ownerId?: string) => FakeRequest };
    };
    type ItemControl = {
        request: FakeRequest;
        transaction: FakeTransaction;
        staged: () => unknown;
        commit: () => void;
    };

    const keyRecords = new Map<string, unknown>();
    const itemRecords = new Map<string, unknown>();
    let saved: unknown;
    let deleted = false;
    let closed = false;
    const queuedItemTransactions: ItemControl[] = [];
    const itemTransactionWaiters: ((control: ItemControl) => void)[] = [];

    function makeRequest(): FakeRequest {
        return { result: undefined, error: null, onsuccess: null, onerror: null };
    }

    function hasStringId(value: unknown): value is { id: string } {
        return (
            typeof value === "object" &&
            value !== null &&
            "id" in value &&
            typeof value.id === "string"
        );
    }

    function publishItemTransaction(control: ItemControl) {
        const resolve = itemTransactionWaiters.shift();
        if (resolve) resolve(control);
        else queuedItemTransactions.push(control);
    }

    function makeKeyTransaction(): FakeTransaction {
        let store: FakeStore;
        const transaction: FakeTransaction = {
            error: null,
            oncomplete: null,
            onabort: null,
            abort: () => {
                transaction.error = new DOMException("Aborted", "AbortError");
                queueMicrotask(() => transaction.onabort?.());
            },
            objectStore: () => store,
        };
        store = {
            transaction,
            get: (key) => {
                const request = makeRequest();
                queueMicrotask(() => {
                    request.result = keyRecords.get(String(key));
                    request.onsuccess?.();
                    transaction.oncomplete?.();
                });
                return request;
            },
            add: (value) => {
                const request = makeRequest();
                queueMicrotask(() => {
                    if (
                        typeof value !== "object" ||
                        value === null ||
                        !("ownerId" in value) ||
                        typeof value.ownerId !== "string"
                    ) {
                        transaction.error = new DOMException("Invalid key record", "DataError");
                        transaction.onabort?.();
                        return;
                    }
                    if (keyRecords.has(value.ownerId)) {
                        transaction.error = new DOMException("Key exists", "ConstraintError");
                        transaction.onabort?.();
                        return;
                    }
                    keyRecords.set(value.ownerId, value);
                    request.result = value.ownerId;
                    request.onsuccess?.();
                    transaction.oncomplete?.();
                });
                return request;
            },
            put: () => makeRequest(),
            delete: () => makeRequest(),
            index: () => ({ getAll: () => makeRequest() }),
        };
        return transaction;
    }

    function makeItemTransaction(autoComplete: boolean): FakeTransaction {
        let store: FakeStore;
        let pendingPut: unknown;
        let hasPendingPut = false;
        let pendingDelete: string | undefined;
        const request = makeRequest();
        const transaction: FakeTransaction = {
            error: null,
            oncomplete: null,
            onabort: null,
            abort: () => {
                transaction.error = new DOMException("Aborted", "AbortError");
                transaction.onabort?.();
            },
            objectStore: () => store,
        };
        store = {
            transaction,
            get: (key) => {
                request.result = itemRecords.get(String(key));
                return request;
            },
            add: (value) => {
                pendingPut = value;
                hasPendingPut = true;
                return makeRequest();
            },
            put: (value) => {
                pendingPut = value;
                hasPendingPut = true;
                return makeRequest();
            },
            delete: (key) => {
                pendingDelete = String(key);
                return makeRequest();
            },
            index: () => ({
                getAll: (ownerId) => {
                    request.result = [...itemRecords.values()].filter(
                        (value) =>
                            typeof value === "object" &&
                            value !== null &&
                            "ownerId" in value &&
                            value.ownerId === ownerId
                    );
                    return request;
                },
            }),
        };
        const control: ItemControl = {
            request,
            transaction,
            staged: () => pendingPut,
            commit: () => {
                if (pendingDelete !== undefined) {
                    itemRecords.delete(pendingDelete);
                    deleted = true;
                }
                if (hasPendingPut && hasStringId(pendingPut)) {
                    itemRecords.set(pendingPut.id, pendingPut);
                    saved = pendingPut;
                }
                transaction.oncomplete?.();
            },
        };
        if (autoComplete) queueMicrotask(() => transaction.oncomplete?.());
        else publishItemTransaction(control);
        return transaction;
    }

    const database = {
        transaction: (name: string, mode: IDBTransactionMode) =>
            name === "keys" ? makeKeyTransaction() : makeItemTransaction(mode === "readonly"),
        close: () => {
            closed = true;
        },
    };
    Object.defineProperty(globalThis, "indexedDB", {
        configurable: true,
        value: {
            open: () => {
                const request = {
                    result: database,
                    onsuccess: null as (() => void) | null,
                    onupgradeneeded: null as (() => void) | null,
                    onerror: null as (() => void) | null,
                };
                queueMicrotask(() => request.onsuccess?.());
                return request;
            },
        },
    });
    t.after(() => {
        if (previous) Object.defineProperty(globalThis, "indexedDB", previous);
        else Reflect.deleteProperty(globalThis, "indexedDB");
    });
    return {
        waitForItemTransaction: () => {
            const control = queuedItemTransactions.shift();
            return control
                ? Promise.resolve(control)
                : new Promise<ItemControl>((resolve) => itemTransactionWaiters.push(resolve));
        },
        isClosed: () => closed,
        saved: () => saved,
        wasDeleted: () => deleted,
        seed: (record: { id: string }) => itemRecords.set(record.id, record),
        stored: (id: string) => itemRecords.get(id),
        hasKey: (ownerId: string) => keyRecords.has(ownerId),
    };
}

test("a successful encrypted write resolves only after its transaction commits", async (t) => {
    const db = installFakeIndexedDb(t);
    const result = putItem(item);
    let settled = false;
    void result.then(() => { settled = true; }, () => { settled = true; });
    const control = await db.waitForItemTransaction();
    control.request.onsuccess?.();
    await Promise.resolve();
    assert.equal(settled, false);
    control.commit();
    assert.equal(await result, undefined);
    const saved = db.saved();
    if (!isEncryptedBatchItem(saved)) throw new Error("Expected an encrypted record");
    assert.equal(saved.ownerId, "synthetic-user");
    assert.equal("blob" in saved, false);
    assert.equal("receipt" in saved, false);
    assert.equal("status" in saved, false);
    assert.equal(db.isClosed(), true);
});

test("an aborted transaction rejects even after its request succeeded", async (t) => {
    const db = installFakeIndexedDb(t);
    const result = putItem(item);
    const rejected = assert.rejects(result, { name: "QuotaExceededError" });
    const control = await db.waitForItemTransaction();
    control.request.onsuccess?.();
    control.transaction.error = new DOMException("Storage full", "QuotaExceededError");
    control.transaction.onabort?.();
    await rejected;
    assert.equal(db.isClosed(), true);
});

test("storage works when Promise.withResolvers is unavailable", async (t) => {
    const db = installFakeIndexedDb(t);
    const descriptor = Object.getOwnPropertyDescriptor(Promise, "withResolvers");
    Reflect.deleteProperty(Promise, "withResolvers");
    try {
        const result = putItem(item);
        const control = await db.waitForItemTransaction();
        control.request.onsuccess?.();
        control.commit();
        assert.equal(await result, undefined);
    } finally {
        if (descriptor) Object.defineProperty(Promise, "withResolvers", descriptor);
    }
});

test("a draft cannot overwrite another account's item", async (t) => {
    const db = installFakeIndexedDb(t);
    const result = putItem(item);
    const rejected = assert.rejects(result, { name: "AbortError" });
    const control = await db.waitForItemTransaction();
    control.request.result = { ...item, ownerId: "another-user" };
    control.request.onsuccess?.();
    await rejected;
    assert.equal(db.saved(), undefined);
    assert.equal(db.isClosed(), true);
});

test("deleting a draft cannot remove another account's item", async (t) => {
    const db = installFakeIndexedDb(t);
    const result = deleteItem("synthetic-user", item.id);
    const control = await db.waitForItemTransaction();
    control.request.result = { ...item, ownerId: "another-user" };
    control.request.onsuccess?.();
    control.commit();
    await result;
    assert.equal(db.wasDeleted(), false);
});

test("owned plaintext drafts migrate only after encrypted replacement commits", async (t) => {
    const db = installFakeIndexedDb(t);
    const ownerId = "synthetic-migration-success-account";
    const owned = {
        ...item,
        id: "synthetic-owned-plaintext",
        ownerId,
        status: "ready" as const,
        receipt,
        draft: toDraft(receipt),
    };
    const unowned = { ...item, id: "synthetic-unowned-legacy", ownerId: undefined };
    db.seed(owned);
    db.seed(unowned);

    const loading = allItems(ownerId);
    const migration = await db.waitForItemTransaction();
    migration.request.onsuccess?.();
    assert.equal(isEncryptedBatchItem(migration.staged()), true);
    migration.commit();

    const loaded = await loading;
    assert.equal(loaded.length, 1);
    assert.equal(loaded[0]?.receipt?.merchant, receipt.merchant);
    assert.equal(isEncryptedBatchItem(db.stored(owned.id)), true);
    assert.equal(db.stored(unowned.id), unowned);
});

test("an interrupted plaintext migration leaves the original record intact", async (t) => {
    const db = installFakeIndexedDb(t);
    const ownerId = "synthetic-migration-abort-account";
    const owned = {
        ...item,
        id: "synthetic-owned-plaintext-abort",
        ownerId,
        status: "ready" as const,
        receipt,
    };
    db.seed(owned);

    const loading = allItems(ownerId);
    const rejected = assert.rejects(loading, { name: "QuotaExceededError" });
    const migration = await db.waitForItemTransaction();
    migration.request.onsuccess?.();
    assert.equal(isEncryptedBatchItem(migration.staged()), true);
    migration.transaction.error = new DOMException("Storage full", "QuotaExceededError");
    migration.transaction.onabort?.();

    await rejected;
    assert.equal(db.stored(owned.id), owned);
});

test("missing keys do not replace encrypted drafts with a new key", async (t) => {
    const db = installFakeIndexedDb(t);
    const ownerId = "synthetic-missing-key-account";
    const lostKey = await createDraftEncryptionKey();
    const encrypted = await encryptBatchItem(
        { ...item, id: "synthetic-missing-key-draft", ownerId },
        lostKey
    );
    db.seed(encrypted);

    await assert.rejects(allItems(ownerId), /Draft encryption key is missing/);
    assert.equal(db.hasKey(ownerId), false);
    assert.equal(db.stored(encrypted.id), encrypted);
});

test("new writes and deletes require an account", async () => {
    await assert.rejects(putItem({ ...item, ownerId: undefined }), /Missing draft owner/);
    await assert.rejects(deleteItem("", item.id), /Missing draft owner/);
});

test("legacy draft claim assigns only records that have no owner", () => {
    assert.equal(claimLegacyItem({ ...item, ownerId: undefined }, "account-a")?.ownerId, "account-a");
    assert.equal(claimLegacyItem({ ...item, ownerId: "account-a" }, "account-a")?.ownerId, "account-a");
    assert.equal(claimLegacyItem({ ...item, ownerId: "account-b" }, "account-a"), null);
    assert.equal(claimLegacyItem({ ...item, ownerId: " " }, "account-a")?.ownerId, "account-a");
    assert.throws(() => claimLegacyItem(item, ""), /Missing draft owner/);
});
