import { promises as fs } from "fs";
import path from "path";
import { decryptSecret, encryptSecret } from "./crypto";
import { remoteTextStore } from "./kv";
import { sessionUserId } from "./session";

export type StoredGoogleTokens = {
    google_user_id: string;
    email: string | null;
    refresh_token: string;
    access_token: string | null;
    expiry_date: number | null;
    updated_at: string;
};

type FileShape = {
    version: 1;
    tokens: StoredGoogleTokens | null;
};

function dataDir(): string {
    return process.env.ZIPPP_DATA_DIR || path.join(process.cwd(), ".data");
}

function safeId(userId: string): string {
    return userId.replace(/[^A-Za-z0-9._-]/g, "_");
}

function tokensKey(userId: string): string {
    return `google-tokens/${safeId(userId)}.json`;
}

function tokensPath(userId: string): string {
    return path.join(dataDir(), `google-tokens-${safeId(userId)}.json`);
}

async function ensureDir(): Promise<void> {
    await fs.mkdir(dataDir(), { recursive: true });
}

/**
 * Access tokens written before the encryption change have no `v1:`/`plain:`
 * prefix. They are short-lived and get rewritten encrypted on the next
 * refresh, so legacy values are returned as they are.
 */
function decryptMaybe(value: string | null): string | null {
    if (value == null) return null;
    if (value.startsWith("v1:") || value.startsWith("plain:")) {
        return decryptSecret(value);
    }
    return value;
}

function parseShape(raw: string | null): FileShape {
    if (raw == null) return { version: 1, tokens: null };
    const parsed = JSON.parse(raw) as FileShape;
    if (parsed?.version !== 1) return { version: 1, tokens: null };
    return parsed;
}

function storeError(event: string, err: unknown, backend: string, key: string): void {
    console.error(
        JSON.stringify({
            event,
            backend,
            key,
            error: err instanceof Error ? err.message : String(err),
        })
    );
}

async function readFile(userId: string): Promise<FileShape> {
    const key = tokensKey(userId);
    const remote = remoteTextStore();
    if (remote) {
        try {
            return parseShape(await remote.readText(key));
        } catch (err) {
            // Never fall back to the per-invocation filesystem when a remote
            // store is configured: that turns an outage into a silent logout.
            storeError("store.read.failed", err, remote.backend, key);
            throw err;
        }
    }
    try {
        const raw = await fs.readFile(tokensPath(userId), "utf8");
        return parseShape(raw);
    } catch (err) {
        const code = (err as NodeJS.ErrnoException).code;
        if (code === "ENOENT") return { version: 1, tokens: null };
        throw err;
    }
}

async function writeFile(userId: string, data: FileShape): Promise<void> {
    const key = tokensKey(userId);
    const remote = remoteTextStore();
    if (remote) {
        try {
            await remote.writeText(key, JSON.stringify(data, null, 2));
            return;
        } catch (err) {
            storeError("store.write.failed", err, remote.backend, key);
            throw err;
        }
    }
    await ensureDir();
    const file = tokensPath(userId);
    const tmp = `${file}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(data, null, 2), {
        encoding: "utf8",
        mode: 0o600,
    });
    await fs.rename(tmp, file);
}

/** Persist tokens for the signed-in user. */
export async function saveTokens(input: {
    google_user_id: string;
    email?: string | null;
    refresh_token: string;
    access_token?: string | null;
    expiry_date?: number | null;
}): Promise<void> {
    const record: StoredGoogleTokens = {
        google_user_id: input.google_user_id,
        email: input.email ?? null,
        refresh_token: encryptSecret(input.refresh_token),
        access_token: input.access_token ? encryptSecret(input.access_token) : null,
        expiry_date: input.expiry_date ?? null,
        updated_at: new Date().toISOString(),
    };
    await writeFile(input.google_user_id, { version: 1, tokens: record });
}

function decryptRecord(tokens: StoredGoogleTokens): StoredGoogleTokens {
    return {
        ...tokens,
        refresh_token: decryptSecret(tokens.refresh_token),
        access_token: decryptMaybe(tokens.access_token),
    };
}

export async function loadTokens(): Promise<StoredGoogleTokens | null> {
    const userId = await sessionUserId();
    if (!userId) return null;
    return loadTokensForUser(userId);
}

/** Load tokens for a known Google user id (WhatsApp channel, scripts). */
export async function loadTokensForUser(
    userId: string
): Promise<StoredGoogleTokens | null> {
    const file = await readFile(userId);
    if (!file.tokens) return null;
    return decryptRecord(file.tokens);
}

export async function hasTokens(): Promise<boolean> {
    const userId = await sessionUserId();
    if (!userId) return false;
    const file = await readFile(userId);
    return file.tokens != null;
}

export async function peekGoogleUserId(): Promise<string | null> {
    const userId = await sessionUserId();
    if (!userId) return null;
    const file = await readFile(userId);
    return file.tokens?.google_user_id ?? null;
}

export async function peekGoogleEmail(): Promise<string | null> {
    const userId = await sessionUserId();
    if (!userId) return null;
    const file = await readFile(userId);
    return file.tokens?.email ?? null;
}

export async function deleteTokens(): Promise<void> {
    const userId = await sessionUserId();
    if (!userId) return;
    await writeFile(userId, { version: 1, tokens: null });
}
