import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import * as SQLite from "expo-sqlite";
import type { DraftContents, DraftSummary, NewDraft } from "./draft-types";
import { storageOwnerId } from "./draft-types";

export type { DraftContents, DraftSummary, NewDraft } from "./draft-types";

const KEY_PREFIX = "zippp.expo.draft-key.";

type DraftRow = {
  id: string;
  created_at: number;
  mime_type: string;
  image_bytes: Uint8Array;
};

type SummaryRow = Omit<DraftRow, "image_bytes">;

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
        image_bytes BLOB NOT NULL
      )
    `);
    return database;
  } catch (error) {
    await database.closeAsync().catch(() => {});
    throw error;
  }
}

export async function saveDraft(draft: NewDraft): Promise<DraftSummary> {
  const database = await openEncryptedDatabase(draft.ownerId);
  try {
    await database.runAsync(
      "INSERT OR REPLACE INTO drafts (id, created_at, mime_type, image_bytes) VALUES (?, ?, ?, ?)",
      draft.id,
      draft.createdAt,
      draft.mimeType,
      draft.imageBytes,
    );
    return { id: draft.id, createdAt: draft.createdAt, mimeType: draft.mimeType };
  } finally {
    await database.closeAsync();
  }
}

export async function listDrafts(ownerId: string): Promise<DraftSummary[]> {
  const database = await openEncryptedDatabase(ownerId);
  try {
    const rows = await database.getAllAsync<SummaryRow>(
      "SELECT id, created_at, mime_type FROM drafts ORDER BY created_at DESC",
    );
    return rows.map((row) => ({ id: row.id, createdAt: row.created_at, mimeType: row.mime_type }));
  } finally {
    await database.closeAsync();
  }
}

export async function loadDraft(ownerId: string, id: string): Promise<DraftContents | null> {
  const database = await openEncryptedDatabase(ownerId);
  try {
    const row = await database.getFirstAsync<DraftRow>(
      "SELECT id, created_at, mime_type, image_bytes FROM drafts WHERE id = ?",
      id,
    );
    if (!row) return null;
    return {
      id: row.id,
      createdAt: row.created_at,
      mimeType: row.mime_type,
      imageBytes: new Uint8Array(row.image_bytes),
    };
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
