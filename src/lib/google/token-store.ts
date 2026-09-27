import { promises as fs } from "fs";
import path from "path";
import { decryptSecret, encryptSecret } from "./crypto";

export type StoredGoogleTokens = {
  google_user_id: string;
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
  return (
    process.env.ZIPPP_DATA_DIR ||
    path.join(process.cwd(), ".data")
  );
}

function tokensPath(): string {
  return path.join(dataDir(), "google-tokens.json");
}

async function ensureDir(): Promise<void> {
  await fs.mkdir(dataDir(), { recursive: true });
}

async function readFile(): Promise<FileShape> {
  try {
    const raw = await fs.readFile(tokensPath(), "utf8");
    const parsed = JSON.parse(raw) as FileShape;
    if (parsed?.version !== 1) {
      return { version: 1, tokens: null };
    }
    return parsed;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return { version: 1, tokens: null };
    throw err;
  }
}

async function writeFile(data: FileShape): Promise<void> {
  await ensureDir();
  const tmp = `${tokensPath()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), {
    encoding: "utf8",
    mode: 0o600,
  });
  await fs.rename(tmp, tokensPath());
}

/** Persist tokens. Refresh token is encrypted at rest when TOKEN_ENCRYPTION_KEY is set. */
export async function saveTokens(input: {
  google_user_id: string;
  refresh_token: string;
  access_token?: string | null;
  expiry_date?: number | null;
}): Promise<void> {
  const record: StoredGoogleTokens = {
    google_user_id: input.google_user_id,
    refresh_token: encryptSecret(input.refresh_token),
    access_token: input.access_token ?? null,
    expiry_date: input.expiry_date ?? null,
    updated_at: new Date().toISOString(),
  };
  await writeFile({ version: 1, tokens: record });
}

/** Load tokens with refresh_token decrypted. Returns null if none stored. */
export async function loadTokens(): Promise<StoredGoogleTokens | null> {
  const file = await readFile();
  if (!file.tokens) return null;
  return {
    ...file.tokens,
    refresh_token: decryptSecret(file.tokens.refresh_token),
  };
}

/** Whether a Google connection exists (no secrets exposed). */
export async function hasTokens(): Promise<boolean> {
  const file = await readFile();
  return file.tokens != null;
}

export async function peekGoogleUserId(): Promise<string | null> {
  const file = await readFile();
  return file.tokens?.google_user_id ?? null;
}

export async function deleteTokens(): Promise<void> {
  await writeFile({ version: 1, tokens: null });
}
