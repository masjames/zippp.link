import test from "node:test";
import assert from "node:assert/strict";
import type { BatchItem } from "./batch-db";
import {
    createDraftEncryptionKey,
    decryptBatchItem,
    encryptBatchItem,
    isEncryptedBatchItem,
} from "./draft-crypto";

const item: BatchItem = {
    id: "synthetic-receipt-id",
    scanId: "server-issued-scan-id",
    ownerId: "synthetic-account-a",
    createdAt: 1_765_000_000_000,
    blob: new Blob(["synthetic image bytes"], { type: "image/jpeg" }),
    thumb: "synthetic-thumbnail-data",
    status: "ready",
    source: "manual",
    receipt: {
        merchant: "Private Synthetic Merchant",
        date: "2026-01-02",
        currency: "IDR",
        category: "Meals",
        line_items: [],
        subtotal: null,
        tax: null,
        total: 1234,
    },
    draft: {
        merchant: "Edited Synthetic Merchant",
        date: "2026-01-02",
        currency: "IDR",
        category: "Meals",
        staff: "Synthetic Staff",
        outlet: "Synthetic Outlet",
        subtotal: "",
        tax: "",
        total: "1234",
        lines: [],
        payment: "card",
        customer: "Synthetic Customer",
        purpose: "Synthetic Purpose",
        acknowledged: true,
    },
    debug: null,
    error: "Synthetic extraction detail",
    contributed: true,
};

test("encrypted drafts keep payload fields opaque and roundtrip through AES-GCM", async () => {
    const key = await createDraftEncryptionKey();
    const encrypted = await encryptBatchItem(item, key);

    assert.equal(key.extractable, false);
    assert.equal(isEncryptedBatchItem(encrypted), true);
    assert.equal(encrypted.ownerId, item.ownerId);
    assert.equal(encrypted.id, item.id);
    assert.equal("blob" in encrypted, false);
    assert.equal("thumb" in encrypted, false);
    assert.equal("receipt" in encrypted, false);
    assert.equal("draft" in encrypted, false);
    assert.equal("status" in encrypted, false);
    assert.equal("error" in encrypted, false);
    assert.equal(encrypted.metadataCiphertext.byteLength > 0, true);
    assert.equal(encrypted.blobCiphertext.byteLength > 0, true);
    assert.equal(
        new TextDecoder().decode(encrypted.metadataCiphertext).includes("Private Synthetic Merchant"),
        false
    );
    assert.equal(
        new TextDecoder().decode(encrypted.blobCiphertext).includes("synthetic image bytes"),
        false
    );

    const restored = await decryptBatchItem(encrypted, key);
    assert.equal(restored.id, item.id);
    assert.equal(restored.ownerId, item.ownerId);
    assert.equal(restored.createdAt, item.createdAt);
    assert.equal(await restored.blob.text(), await item.blob.text());
    assert.equal(restored.blob.type, item.blob.type);
    assert.equal(restored.thumb, item.thumb);
    assert.equal(restored.status, item.status);
    assert.equal(restored.scanId, item.scanId);
    assert.deepEqual(restored.receipt, item.receipt);
    assert.deepEqual(restored.draft, item.draft);
    assert.equal(restored.error, item.error);
    assert.equal(restored.contributed, item.contributed);
});

test("tampering or changing account identity rejects encrypted drafts", async () => {
    const keyA = await createDraftEncryptionKey();
    const keyB = await createDraftEncryptionKey();
    const encrypted = await encryptBatchItem(item, keyA);
    const changedCiphertext = encrypted.metadataCiphertext.slice(0);
    new Uint8Array(changedCiphertext)[0] ^= 1;

    await assert.rejects(
        decryptBatchItem({ ...encrypted, metadataCiphertext: changedCiphertext }, keyA)
    );
    await assert.rejects(decryptBatchItem(encrypted, keyB));
    await assert.rejects(
        decryptBatchItem({ ...encrypted, ownerId: "synthetic-account-b" }, keyA)
    );
    await assert.rejects(decryptBatchItem({ ...encrypted, id: "different-id" }, keyA));
});

test("metadata changes reuse the encrypted image for an unchanged receipt ID", async () => {
    const key = await createDraftEncryptionKey();
    const first = await encryptBatchItem(item, key);
    const originalDraft = item.draft;
    if (!originalDraft) throw new Error("Missing synthetic draft fixture");
    const updated = await encryptBatchItem(
        { ...item, draft: { ...originalDraft, merchant: "Updated Synthetic Merchant" } },
        key,
        first
    );

    assert.equal(updated.blobCiphertext, first.blobCiphertext);
    assert.notEqual(updated.metadataCiphertext, first.metadataCiphertext);
    const restored = await decryptBatchItem(updated, key);
    assert.equal(restored.draft?.merchant, "Updated Synthetic Merchant");
    assert.equal(await restored.blob.text(), await item.blob.text());
});
