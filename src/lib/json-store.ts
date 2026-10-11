import { promises as fs } from "node:fs";
import path from "node:path";
import { remoteTextStore } from "@/lib/google/kv";

/**
 * Small JSON array store on the same backend as the session store (Vercel Blob
 * or Upstash Redis REST), falling back to the local `.data` filesystem. Used for
 * records that do not need atomicity, such as correction telemetry.
 */

const DATA_DIR = process.env.ZIPPP_DATA_DIR || path.join(process.cwd(), ".data");

export async function readJsonArray<T>(key: string): Promise<T[]> {
    const remote = remoteTextStore();
    try {
        const raw = remote
            ? await remote.readText(key)
            : await fs.readFile(path.join(DATA_DIR, key), "utf8").catch(() => null);
        if (!raw) return [];
        const parsed = JSON.parse(raw) as unknown;
        return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
        return [];
    }
}

export async function writeJsonArray<T>(key: string, value: T[]): Promise<void> {
    const raw = JSON.stringify(value);
    const remote = remoteTextStore();
    if (remote) {
        await remote.writeText(key, raw);
        return;
    }
    const file = path.join(DATA_DIR, key);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, raw, "utf8");
}
