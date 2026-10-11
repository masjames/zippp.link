import { promises as fs } from "node:fs";
import path from "node:path";
import { remoteTextStore } from "@/lib/google/kv";

/**
 * Small JSON array store on the same backend as the session store (Vercel Blob
 * or Upstash Redis REST), falling back to the local `.data` filesystem. Used for
 * records that do not need atomicity, such as correction telemetry.
 */

/** Built lazily so the bundler does not trace a dynamic path from a constant. */
function dataDir(): string {
    return process.env.ZIPPP_DATA_DIR || path.join(process.cwd(), ".data");
}

function fileFor(key: string): string {
    // Keep this opaque so the bundler does not treat it as a dynamic path and
    // trace the whole project. The filesystem is only the local dev fallback.
    const name = key.split(/[^a-zA-Z0-9_.-]+/).filter(Boolean).join("_");
    return [dataDir(), name].join(path.sep);
}

export async function readJsonArray<T>(key: string): Promise<T[]> {
    const remote = remoteTextStore();
    try {
        const raw = remote
            ? await remote.readText(key)
            : await fs.readFile(fileFor(key), "utf8").catch(() => null);
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
    const file = fileFor(key);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, raw, "utf8");
}
