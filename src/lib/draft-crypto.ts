import type { BatchItem } from "@/lib/batch-db";

/** Clear routing fields; receipt contents and image bytes are encrypted. */
export type EncryptedBatchItem = {
    id: string;
    ownerId: string;
    createdAt: number;
    encryptionVersion: 1;
    metadataIv: number[];
    metadataCiphertext: ArrayBuffer;
    blobIv: number[];
    blobCiphertext: ArrayBuffer;
};
export type EncryptedBatchBlob = Pick<
    EncryptedBatchItem,
    "id" | "ownerId" | "createdAt" | "blobIv" | "blobCiphertext"
>;

type EncryptedMetadata = Omit<BatchItem, "id" | "ownerId" | "createdAt" | "blob"> & {
    blobType: string;
};

function webCrypto(): Crypto {
    const value = globalThis.crypto;
    if (!value?.subtle) throw new Error("Web Crypto is unavailable");
    return value;
}

function assertDraftKey(key: CryptoKey): void {
    if (key.type !== "secret" || key.algorithm.name !== "AES-GCM" || key.extractable) {
        throw new Error("Invalid draft encryption key");
    }
}

function associatedData(
    item: Pick<BatchItem, "id" | "ownerId" | "createdAt">
): ArrayBuffer {
    const bytes = new TextEncoder().encode(JSON.stringify([item.ownerId, item.id, item.createdAt]));
    const buffer = bytes.buffer;
    if (
        buffer instanceof ArrayBuffer &&
        bytes.byteOffset === 0 &&
        bytes.byteLength === buffer.byteLength
    ) {
        return buffer;
    }
    const copy = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(copy).set(bytes);
    return copy;
}

function iv(): number[] {
    return Array.from(webCrypto().getRandomValues(new Uint8Array(12)));
}

export function isEncryptedBatchItem(value: unknown): value is EncryptedBatchItem {
    if (typeof value !== "object" || value === null) return false;
    const record = value as Partial<EncryptedBatchItem>;
    return (
        record.encryptionVersion === 1 &&
        typeof record.id === "string" &&
        typeof record.ownerId === "string" &&
        typeof record.createdAt === "number" &&
        Array.isArray(record.metadataIv) &&
        record.metadataIv.length === 12 &&
        Array.isArray(record.blobIv) &&
        record.blobIv.length === 12 &&
        record.metadataCiphertext instanceof ArrayBuffer &&
        record.blobCiphertext instanceof ArrayBuffer
    );
}

export async function createDraftEncryptionKey(): Promise<CryptoKey> {
    return (await webCrypto().subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    )) as CryptoKey;
}

export async function encryptBatchItem(
    item: BatchItem,
    key: CryptoKey,
    previousBlob?: EncryptedBatchBlob
): Promise<EncryptedBatchItem> {
    assertDraftKey(key);
    if (typeof item.ownerId !== "string" || item.ownerId.trim() === "") {
        throw new Error("Missing draft owner");
    }

    const { id, ownerId, createdAt, blob, ...metadata } = item;
    const metadataIv = iv();
    const reusableBlob =
        previousBlob?.id === id &&
        previousBlob.ownerId === ownerId &&
        previousBlob.createdAt === createdAt
            ? previousBlob
            : undefined;
    const blobIv = reusableBlob ? reusableBlob.blobIv : iv();
    const aad = associatedData({ id, ownerId, createdAt });
    const [encryptedMetadata, encryptedBlob] = await Promise.all([
        webCrypto().subtle.encrypt(
            { name: "AES-GCM", iv: new Uint8Array(metadataIv), additionalData: aad },
            key,
            new TextEncoder().encode(
                JSON.stringify({ ...metadata, blobType: blob.type } satisfies EncryptedMetadata)
            )
        ),
        reusableBlob
            ? Promise.resolve(reusableBlob.blobCiphertext)
            : webCrypto().subtle.encrypt(
                  { name: "AES-GCM", iv: new Uint8Array(blobIv), additionalData: aad },
                  key,
                  await blob.arrayBuffer()
              ),
    ]);

    return {
        id,
        ownerId,
        createdAt,
        encryptionVersion: 1,
        metadataIv,
        metadataCiphertext: encryptedMetadata,
        blobIv,
        blobCiphertext: encryptedBlob,
    };
}

export async function decryptBatchItem(
    record: EncryptedBatchItem,
    key: CryptoKey
): Promise<BatchItem> {
    assertDraftKey(key);
    if (!isEncryptedBatchItem(record)) throw new Error("Invalid encrypted draft record");
    const aad = associatedData(record);
    const [metadataPlaintext, blobPlaintext] = await Promise.all([
        webCrypto().subtle.decrypt(
            { name: "AES-GCM", iv: new Uint8Array(record.metadataIv), additionalData: aad },
            key,
            record.metadataCiphertext
        ),
        webCrypto().subtle.decrypt(
            { name: "AES-GCM", iv: new Uint8Array(record.blobIv), additionalData: aad },
            key,
            record.blobCiphertext
        ),
    ]);
    const decoded = JSON.parse(new TextDecoder().decode(metadataPlaintext)) as
        | (Record<string, unknown> & { blobType?: unknown })
        | null;
    if (!decoded || typeof decoded !== "object" || typeof decoded.blobType !== "string") {
        throw new Error("Invalid encrypted draft metadata");
    }
    const { blobType, ...metadata } = decoded;
    return {
        ...metadata,
        id: record.id,
        ownerId: record.ownerId,
        createdAt: record.createdAt,
        blob: new Blob([blobPlaintext], { type: blobType }),
    } as BatchItem;
}
