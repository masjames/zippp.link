import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import * as SQLite from "expo-sqlite";
import type { BatchStatus } from "../../../src/lib/batch-db";
import type { DraftContents, DraftPatch, DraftSummary, NewDraft } from "./draft-types";
import { storageOwnerId } from "./draft-types";

export type { DraftContents, DraftSummary, NewDraft } from "./draft-types";

const KEY_PREFIX = "zippp.expo.draft-key.";

type DraftRow = {
  id: string;
  created_at: number;
  mime_type: string;
  image_bytes: Uint8Array;
  status: string;
  metadata_json: string | null;
  error: string | null;
};

type SummaryRow = Omit<DraftRow, "image_bytes">;

const DRAFT_STATUSES: readonly BatchStatus[] = ["queued", "reading", "ready", "failed", "accepted", "sending"];

function parseStatus(value: string): BatchStatus {
  if (!DRAFT_STATUSES.includes(value as BatchStatus)) throw new Error("Invalid native draft status");
  return value as BatchStatus;
}

function parseMetadata(value: string | null): Pick<DraftSummary, "receipt" | "draft" | "scanId"> {
  const parsed: unknown = JSON.parse(value ?? "{}");
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Invalid native draft metadata");
  }
  const metadata = parsed as Record<string, unknown>;
  return {
    receipt: metadata.receipt as DraftSummary["receipt"],
    draft: metadata.draft as DraftSummary["draft"],
    scanId: metadata.scanId as string | undefined,
  };
}

function toSummary(row: SummaryRow): DraftSummary {
  return {
    id: row.id,
    createdAt: row.created_at,
    mimeType: row.mime_type || "image/jpeg",
    status: parseStatus(row.status),
    ...parseMetadata(row.metadata_json),
    error: row.error ?? undefined,
  };
}

async function openEncryptedDatabase(ownerId: string): Promise<SQLite.SQLiteDatabase> {
  const ownerHash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    storageOwnerId(ownerId),
  );
  const database = await SQLite.openDatabaseAsync(`zippp-expo-${ownerHash}.db`);
  const keyName = `${KEY_PREFIX}${ownerHash}`;
  let generatedKey = false;

  try {
    const cipher = await database.getFirstAsync<{ cipher_version: string }>("PRAGMA cipher_version");
    if (!cipher?.cipher_version) {
      throw new Error("SQLCipher is unavailable; refusing to store unencrypted drafts.");
    }

    let key = await SecureStore.getItemAsync(keyName);
    if (!key) {
      const randomBytes = await Crypto.getRandomBytesAsync(32);
      key = Array.from(randomBytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
      await SecureStore.setItemAsync(keyName, key);
      generatedKey = true;
    }

    await database.execAsync(`PRAGMA key = '${key}'`);
    try {
      await database.getFirstAsync("SELECT name FROM sqlite_master LIMIT 1");
    } catch {
      if (generatedKey) await SecureStore.deleteItemAsync(keyName);
      throw new Error("The encrypted draft database cannot be opened with its stored key.");
    }

    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS drafts (
        id TEXT PRIMARY KEY NOT NULL,
        created_at INTEGER NOT NULL,
        mime_type TEXT NOT NULL,
        image_bytes BLOB NOT NULL,
        status TEXT NOT NULL DEFAULT 'queued',
        metadata_json TEXT NOT NULL DEFAULT '{}',
        error TEXT
      )
    `);
    const columns = await database.getAllAsync<{ name: string }>("PRAGMA table_info(drafts)");
    const existing = new Set(columns.map((column) => column.name));
    if (!existing.has("status")) {
      await database.execAsync("ALTER TABLE drafts ADD COLUMN status TEXT NOT NULL DEFAULT 'queued'");
    }
    if (!existing.has("metadata_json")) {
      await database.execAsync("ALTER TABLE drafts ADD COLUMN metadata_json TEXT NOT NULL DEFAULT '{}'");
    }
    if (!existing.has("error")) {
      await database.execAsync("ALTER TABLE drafts ADD COLUMN error TEXT");
    }
    return database;
  } catch (error) {
    await database.closeAsync().catch(() => {});
    throw error;
  }
}

export async function saveDraft(draft: NewDraft): Promise<DraftSummary> {
  const database = await openEncryptedDatabase(draft.ownerId);
  const status = draft.status ?? "queued";
  try {
    await database.runAsync(
      `INSERT OR REPLACE INTO drafts
        (id, created_at, mime_type, image_bytes, status, metadata_json, error)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
      draft.id,
      draft.createdAt,
      draft.mimeType,
      draft.imageBytes,
      status,
      JSON.stringify({ scanId: draft.scanId, receipt: draft.receipt, draft: draft.draft }),
      draft.error ?? null,
    );
    return {
      id: draft.id,
      createdAt: draft.createdAt,
      mimeType: draft.mimeType,
      status,
      scanId: draft.scanId,
      receipt: draft.receipt,
      draft: draft.draft,
      error: draft.error,
    };
  } finally {
    await database.closeAsync();
  }
}

export async function listDrafts(ownerId: string): Promise<DraftSummary[]> {
  const database = await openEncryptedDatabase(ownerId);
  try {
    const rows = await database.getAllAsync<SummaryRow>(
      "SELECT id, created_at, mime_type, status, metadata_json, error FROM drafts ORDER BY created_at DESC",
    );
    return rows.map(toSummary);
  } finally {
    await database.closeAsync();
  }
}

export async function loadDraft(ownerId: string, id: string): Promise<DraftContents | null> {
  const database = await openEncryptedDatabase(ownerId);
  try {
    const row = await database.getFirstAsync<DraftRow>(
      "SELECT id, created_at, mime_type, image_bytes, status, metadata_json, error FROM drafts WHERE id = ?",
      id,
    );
    if (!row) return null;
    return {
      ...toSummary(row),
      imageBytes: new Uint8Array(row.image_bytes),
    };
  } finally {
    await database.closeAsync();
  }
}

export async function updateDraft(ownerId: string, id: string, patch: DraftPatch): Promise<DraftSummary | null> {
  const database = await openEncryptedDatabase(ownerId);
  try {
    const row = await database.getFirstAsync<DraftRow>(
      "SELECT id, created_at, mime_type, image_bytes, status, metadata_json, error FROM drafts WHERE id = ?",
      id,
    );
    if (!row) return null;
    const updated = { ...toSummary(row), ...patch };
    await database.runAsync(
      "UPDATE drafts SET status = ?, metadata_json = ?, error = ? WHERE id = ?",
      updated.status,
      JSON.stringify({ scanId: updated.scanId, receipt: updated.receipt, draft: updated.draft }),
      updated.error ?? null,
      id,
    );
    return updated;
  } finally {
    await database.closeAsync();
  }
}
export async function removeDraft(ownerId: string, id: string): Promise<void> {
  const database = await openEncryptedDatabase(ownerId);
  try {
    await database.runAsync("DELETE FROM drafts WHERE id = ?", id);
  } finally {
    await database.closeAsync();
  }
}
