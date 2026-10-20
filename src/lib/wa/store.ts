import { randomBytes, randomUUID } from "node:crypto";
import { billingConfigured, command } from "@/lib/billing/redis";
import type { Receipt } from "@/types/receipt";

export type WaLink = {
    googleUserId: string;
    phone: string;
    linkedAt: number;
};

export type WaDraft = {
    scanId: string;
    googleUserId: string;
    waId: string;
    receipt: Receipt;
    createdAt: number;
};

export type WaPending = {
    googleUserId: string;
    exp: number;
};

const mem = new Map<string, string>();

function linkKey(waId: string) {
    return `wa:link:${waId}`;
}
function userLinkKey(userId: string) {
    return `wa:userlink:${userId}`;
}
function pendingKey(token: string) {
    return `wa:pending:${token}`;
}
function draftKey(scanId: string) {
    return `wa:draft:${scanId}`;
}
function outKey(ym: string) {
    return `wa:out:${ym}`;
}

async function getRaw(key: string): Promise<string | null> {
    if (!billingConfigured()) return mem.get(key) ?? null;
    return (await command(["GET", key])) as string | null;
}

async function setRaw(key: string, value: string, ttlSec?: number): Promise<void> {
    if (!billingConfigured()) {
        mem.set(key, value);
        return;
    }
    if (ttlSec != null) {
        await command(["SET", key, value, "EX", ttlSec]);
        return;
    }
    await command(["SET", key, value]);
}

async function delRaw(key: string): Promise<void> {
    if (!billingConfigured()) {
        mem.delete(key);
        return;
    }
    await command(["DEL", key]);
}

export async function getLinkByWaId(waId: string): Promise<WaLink | null> {
    const raw = await getRaw(linkKey(waId));
    if (!raw) return null;
    try {
        return JSON.parse(raw) as WaLink;
    } catch {
        return null;
    }
}

export async function getLinkByUserId(userId: string): Promise<WaLink | null> {
    const waId = await getRaw(userLinkKey(userId));
    if (!waId) return null;
    return getLinkByWaId(waId);
}

export async function saveLink(link: WaLink, waId: string): Promise<void> {
    const prev = await getLinkByUserId(link.googleUserId);
    if (prev && prev.phone !== waId) {
        await delRaw(linkKey(prev.phone));
    }
    await setRaw(linkKey(waId), JSON.stringify(link));
    await setRaw(userLinkKey(link.googleUserId), waId);
}

export async function unlinkUser(userId: string): Promise<void> {
    const waId = await getRaw(userLinkKey(userId));
    if (waId) await delRaw(linkKey(waId));
    await delRaw(userLinkKey(userId));
}

/** Mint a short-lived token for Settings → WA claim. */
export async function mintLinkToken(googleUserId: string): Promise<string> {
    const token = randomBytes(16).toString("hex");
    const pending: WaPending = {
        googleUserId,
        exp: Date.now() + 15 * 60 * 1000,
    };
    await setRaw(pendingKey(token), JSON.stringify(pending), 15 * 60);
    return token;
}

export async function consumeLinkToken(
    token: string
): Promise<WaPending | null> {
    const raw = await getRaw(pendingKey(token));
    if (!raw) return null;
    await delRaw(pendingKey(token));
    try {
        const p = JSON.parse(raw) as WaPending;
        if (p.exp < Date.now()) return null;
        return p;
    } catch {
        return null;
    }
}

export async function saveDraft(draft: WaDraft): Promise<void> {
    await setRaw(draftKey(draft.scanId), JSON.stringify(draft), 60 * 60);
}

export async function loadDraft(scanId: string): Promise<WaDraft | null> {
    const raw = await getRaw(draftKey(scanId));
    if (!raw) return null;
    try {
        return JSON.parse(raw) as WaDraft;
    } catch {
        return null;
    }
}

export async function deleteDraft(scanId: string): Promise<void> {
    await delRaw(draftKey(scanId));
}

function monthKey(d = new Date()): string {
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function outboundCount(): Promise<number> {
    const raw = await getRaw(outKey(monthKey()));
    const n = Number(raw ?? "0");
    return Number.isFinite(n) ? n : 0;
}

export async function bumpOutbound(by = 1): Promise<number> {
    const key = outKey(monthKey());
    if (!billingConfigured()) {
        const next = (Number(mem.get(key) ?? "0") || 0) + by;
        mem.set(key, String(next));
        return next;
    }
    const n = await command(["INCRBY", key, by]);
    await command(["EXPIRE", key, 40 * 24 * 60 * 60]);
    return typeof n === "number" ? n : Number(n);
}

export function newScanId(): string {
    return randomUUID();
}
