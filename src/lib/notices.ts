import { remoteTextStore } from "@/lib/google/kv";

/**
 * One-off notice shown in the app after a manual credit grant. The admin's
 * reason is delivered once and then cleared. Stored beside the session data so
 * it works on the same durable backend (Upstash).
 */

export type Notice = {
    message: string;
    credits: number;
    at: number;
};

const key = (userId: string) => `notice/${userId}.json`;

// Local dev without a remote store.
const memory = new Map<string, string>();

async function readRaw(userId: string): Promise<string | null> {
    const remote = remoteTextStore();
    if (!remote) return memory.get(userId) ?? null;
    return remote.readText(key(userId));
}

async function writeRaw(userId: string, value: string): Promise<void> {
    const remote = remoteTextStore();
    if (!remote) {
        memory.set(userId, value);
        return;
    }
    await remote.writeText(key(userId), value);
}

export async function setNotice(userId: string, notice: Notice): Promise<void> {
    await writeRaw(userId, JSON.stringify(notice));
}

export async function getNotice(userId: string): Promise<Notice | null> {
    try {
        const raw = await readRaw(userId);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as Partial<Notice> & { cleared?: boolean };
        if (parsed.cleared || typeof parsed.message !== "string") return null;
        return {
            message: parsed.message,
            credits: Number(parsed.credits) || 0,
            at: Number(parsed.at) || 0,
        };
    } catch {
        return null;
    }
}

export async function clearNotice(userId: string): Promise<void> {
    await writeRaw(userId, JSON.stringify({ cleared: true }));
}
