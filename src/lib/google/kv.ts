import { get as blobGet, put as blobPut } from "@vercel/blob";

/**
 * Durable remote text storage for small JSON records (Google tokens,
 * workspace config). Selected from env, in priority order:
 *
 *   1. Vercel Blob        — BLOB_READ_WRITE_TOKEN set
 *   2. Upstash Redis REST — UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
 *
 * remoteTextStore() returns null when neither is configured; callers then
 * keep their existing filesystem store (ZIPPP_DATA_DIR / <repo>/.data).
 * Local dev is unaffected, and on Vercel the /tmp wipe problem disappears
 * once a remote backend is configured.
 *
 * Values are stored verbatim, so records keep whatever encryption crypto.ts
 * applied — only the storage location changes.
 */

export type TextStore = {
  readonly backend: "blob" | "upstash";
  readText(key: string): Promise<string | null>;
  writeText(key: string, value: string): Promise<void>;
};

const BLOB_PREFIX = "zippp-data";
const UPSTASH_PREFIX = "zippp-data:";

function envSet(name: string): boolean {
  const value = process.env[name];
  return typeof value === "string" && value.trim() !== "";
}

/* ------------------------------ Vercel Blob ---------------------------- */

const blobStore: TextStore = {
  backend: "blob",
  async readText(key) {
    const result = await blobGet(`${BLOB_PREFIX}/${key}`, {
      access: "private",
      useCache: false,
    });
    if (!result || result.statusCode !== 200 || !result.stream) return null;
    return await new Response(result.stream).text();
  },
  async writeText(key, value) {
    await blobPut(`${BLOB_PREFIX}/${key}`, value, {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
    });
  },
};

/* --------------------------- Upstash Redis REST ------------------------ */

function upstashStore(restUrl: string, restToken: string): TextStore {
  const baseUrl = restUrl.replace(/\/+$/, "");
  async function command(args: unknown[]): Promise<unknown> {
    const res = await fetch(baseUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${restToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      throw new Error(`Upstash Redis REST ${res.status} ${res.statusText}`);
    }
    const json = (await res.json()) as { result?: unknown; error?: string };
    if (typeof json.error === "string") {
      throw new Error(`Upstash Redis REST: ${json.error}`);
    }
    return json.result;
  }
  return {
    backend: "upstash",
    async readText(key) {
      const result = await command(["GET", `${UPSTASH_PREFIX}${key}`]);
      return typeof result === "string" ? result : null;
    },
    async writeText(key, value) {
      await command(["SET", `${UPSTASH_PREFIX}${key}`, value]);
    },
  };
}

/* ------------------------------ selection ------------------------------ */

let cached: TextStore | null | undefined;

/**
 * Durable backend selected from env (Vercel Blob > Upstash Redis REST),
 * or null when neither is configured — callers then use the filesystem.
 */
export function remoteTextStore(): TextStore | null {
  if (cached !== undefined) return cached;
  if (envSet("BLOB_READ_WRITE_TOKEN")) {
    cached = blobStore;
    return cached;
  }
  const restUrl = process.env.UPSTASH_REDIS_REST_URL;
  const restToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (envSet("UPSTASH_REDIS_REST_URL") && envSet("UPSTASH_REDIS_REST_TOKEN")) {
    cached = upstashStore(restUrl as string, restToken as string);
    return cached;
  }
  cached = null;
  return cached;
}
