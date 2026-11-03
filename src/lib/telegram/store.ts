import { createHash, randomBytes } from "node:crypto";
import { billingConfigured, command } from "@/lib/billing/redis";

const LINK_TOKEN_TTL_SECONDS = 10 * 60;
const LINK_TOKEN_BYTES = 16; // 32-char hex, fits Telegram's 64-char start payload

const memLinkTokens = new Map<string, { userId: string; expiresAt: number }>();
const memUserChats = new Map<string, string>();
const memChatUsers = new Map<string, string>();
const memSeenUpdates = new Set<number>();
const memLowCredit = new Set<string>();

const tokenKey = (hash: string) => `telegram:link:${hash}`;
const userChatKey = (userId: string) => `telegram:user:${userId}`;
const chatUserKey = (chatId: string) => `telegram:chat:${chatId}`;
const updateDedupeKey = (updateId: number) => `telegram:update:${updateId}`;
const lowCreditKey = (userId: string) => `telegram:low_credit:${userId}`;

function isProduction(): boolean {
    return process.env.NODE_ENV === "production";
}

function requireStore(): boolean {
    if (billingConfigured()) return true;
    if (isProduction()) throw new Error("TELEGRAM_STORE_UNAVAILABLE");
    return false;
}

function hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
}

export function generateLinkToken(): string {
    return randomBytes(LINK_TOKEN_BYTES).toString("hex");
}

export async function createLinkToken(userId: string): Promise<string> {
    const token = generateLinkToken();

    if (!requireStore()) {
        memLinkTokens.set(token, {
            userId,
            expiresAt: Date.now() + LINK_TOKEN_TTL_SECONDS * 1000,
        });
        return token;
    }

    await command([
        "SET",
        tokenKey(hashToken(token)),
        userId,
        "EX",
        LINK_TOKEN_TTL_SECONDS,
    ]);
    return token;
}

export async function consumeLinkToken(token: string): Promise<string | null> {
    if (!token) return null;

    if (!billingConfigured()) {
        if (isProduction()) return null;
        const record = memLinkTokens.get(token);
        if (!record || record.expiresAt <= Date.now()) {
            memLinkTokens.delete(token);
            return null;
        }
        memLinkTokens.delete(token);
        return record.userId;
    }

    try {
        const userId = (await command([
            "GETDEL",
            tokenKey(hashToken(token)),
        ])) as string | null;
        return typeof userId === "string" ? userId : null;
    } catch {
        return null;
    }
}

export type LinkResult =
    | { ok: true }
    | { ok: false; error: "CHAT_ALREADY_LINKED" | "STORE_UNAVAILABLE" };

export async function linkUserToChat(userId: string, chatId: string): Promise<LinkResult> {
    if (!requireStore()) {
        const existingUser = memUserChats.get(userId);
        if (existingUser && existingUser !== chatId) {
            memChatUsers.delete(existingUser);
        }
        const existingChatUser = memChatUsers.get(chatId);
        if (existingChatUser && existingChatUser !== userId) {
            return { ok: false, error: "CHAT_ALREADY_LINKED" };
        }
        memUserChats.set(userId, chatId);
        memChatUsers.set(chatId, userId);
        return { ok: true };
    }

    try {
        const existingChatUser = (await command([
            "GET",
            chatUserKey(chatId),
        ])) as string | null;
        if (existingChatUser && existingChatUser !== userId) {
            return { ok: false, error: "CHAT_ALREADY_LINKED" };
        }

        const existingUserChat = (await command([
            "GET",
            userChatKey(userId),
        ])) as string | null;
        if (existingUserChat && existingUserChat !== chatId) {
            await command(["DEL", chatUserKey(existingUserChat)]);
        }

        await Promise.all([
            command(["SET", userChatKey(userId), chatId]),
            command(["SET", chatUserKey(chatId), userId]),
        ]);
        return { ok: true };
    } catch {
        return { ok: false, error: "STORE_UNAVAILABLE" };
    }
}

export async function unlinkUser(userId: string): Promise<void> {
    if (!requireStore()) {
        const chatId = memUserChats.get(userId);
        if (chatId) memChatUsers.delete(chatId);
        memUserChats.delete(userId);
        return;
    }

    try {
        const chatId = (await command(["GET", userChatKey(userId)])) as string | null;
        if (chatId) await command(["DEL", chatUserKey(chatId)]);
        await command(["DEL", userChatKey(userId)]);
    } catch {
        /* unlink is best effort */
    }
}

export async function getChatIdForUser(userId: string): Promise<string | null> {
    if (!billingConfigured()) {
        if (isProduction()) return null;
        return memUserChats.get(userId) ?? null;
    }

    try {
        const chatId = (await command(["GET", userChatKey(userId)])) as string | null;
        return typeof chatId === "string" ? chatId : null;
    } catch {
        return null;
    }
}

export async function getUserIdForChat(chatId: string): Promise<string | null> {
    if (!billingConfigured()) {
        if (isProduction()) return null;
        return memChatUsers.get(chatId) ?? null;
    }

    try {
        const userId = (await command(["GET", chatUserKey(chatId)])) as string | null;
        return typeof userId === "string" ? userId : null;
    } catch {
        return null;
    }
}

/**
 * Deduplicate incoming Telegram updates. True means this update is new.
 * In production, a store outage throws so the webhook can return 503 and let
 * Telegram retry instead of processing the same update twice.
 */
export async function deduplicateUpdate(updateId: number): Promise<boolean> {
    if (!billingConfigured()) {
        if (isProduction()) throw new Error("TELEGRAM_STORE_UNAVAILABLE");
        if (memSeenUpdates.has(updateId)) return false;
        memSeenUpdates.add(updateId);
        return true;
    }

    const result = await command([
        "SET",
        updateDedupeKey(updateId),
        "1",
        "EX",
        86400,
        "NX",
    ]);
    return result === "OK";
}

export async function claimLowCreditAlert(userId: string): Promise<boolean> {
    if (!billingConfigured()) {
        if (isProduction()) return false;
        if (memLowCredit.has(userId)) return false;
        memLowCredit.add(userId);
        return true;
    }

    try {
        const result = await command([
            "SET",
            lowCreditKey(userId),
            "1",
            "EX",
            86400,
            "NX",
        ]);
        return result === "OK";
    } catch {
        return false;
    }
}

export async function clearLowCreditAlert(userId: string): Promise<void> {
    if (!billingConfigured()) {
        memLowCredit.delete(userId);
        return;
    }
    try {
        await command(["DEL", lowCreditKey(userId)]);
    } catch {
        /* best effort */
    }
}
