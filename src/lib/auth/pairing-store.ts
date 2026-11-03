import { createHash, randomBytes } from "node:crypto";
import { billingConfigured, command } from "@/lib/billing/redis";

// Crockford Base32 alphabet: 0-9 and A-Z excluding I, L, O, U.
export const CROCKFORD_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const CROCKFORD_PATTERN = /^[0-9A-HJKMNP-TV-Z]{8}$/;

const PAIRING_TTL_SECONDS = 10 * 60;
const MAX_ATTEMPTS_PER_IP = 10;
const IP_WINDOW_SECONDS = 10 * 60;
const MAX_GENERATIONS_PER_USER_HOUR = 5;

export type PairingData = {
    userId: string;
    email: string | null;
    createdAt: number;
    expiresAt: number;
};

const pairKey = (hash: string) => `auth:pair:${hash}`;
const userActivePairKey = (userId: string) => `auth:user_pair:${userId}`;
const ipRateKey = (ip: string) => `auth:pair_ip:${ip}`;
const generationKey = (userId: string, hour: number) =>
    `auth:pair_gen:${userId}:${hour}`;

const memPairs = new Map<string, PairingData>();
const memUserPairs = new Map<string, string>();
const memIpAttempts = new Map<string, { count: number; resetAt: number }>();
const memGenerations = new Map<string, { count: number; resetAt: number }>();

function isProduction(): boolean {
    return process.env.NODE_ENV === "production";
}

function requireStore(): boolean {
    if (billingConfigured()) return true;
    if (isProduction()) {
        throw new Error("AUTH_STORE_UNAVAILABLE");
    }
    return false;
}

export function normalizePairingCode(input: string): string {
    return (input || "")
        .trim()
        .toUpperCase()
        .replace(/[\s-]/g, "")
        .replace(/O/g, "0")
        .replace(/[IL]/g, "1")
        .replace(/U/g, "V");
}

export function formatPairingCode(code: string): string {
    const clean = normalizePairingCode(code);
    return clean.length === 8 ? `${clean.slice(0, 4)}-${clean.slice(4)}` : clean;
}

export function generatePairingCode(): string {
    // 5 random bytes = 40 bits, mapped to 8 Crockford characters.
    const bytes = randomBytes(5);
    let n = BigInt(0);
    for (let i = 0; i < bytes.length; i++) {
        n = (n << BigInt(8)) | BigInt(bytes[i]);
    }

    let code = "";
    for (let i = 0; i < 8; i++) {
        code = CROCKFORD_ALPHABET[Number(n & BigInt(0x1f))] + code;
        n >>= BigInt(5);
    }
    return code;
}

export function hashPairingCode(code: string): string {
    return createHash("sha256").update(normalizePairingCode(code)).digest("hex");
}

export async function checkIpRateLimit(ip: string): Promise<boolean> {
    const cleanIp = (ip || "unknown").trim() || "unknown";
    const now = Date.now();

    if (!billingConfigured()) {
        if (isProduction()) return false;
        const record = memIpAttempts.get(cleanIp);
        if (!record || record.resetAt <= now) {
            memIpAttempts.set(cleanIp, {
                count: 1,
                resetAt: now + IP_WINDOW_SECONDS * 1000,
            });
            return true;
        }
        if (record.count >= MAX_ATTEMPTS_PER_IP) return false;
        record.count++;
        return true;
    }

    try {
        const count = (await command(["INCR", ipRateKey(cleanIp)])) as number;
        if (count === 1) {
            await command(["EXPIRE", ipRateKey(cleanIp), IP_WINDOW_SECONDS]);
        }
        return count <= MAX_ATTEMPTS_PER_IP;
    } catch {
        // Fail closed. Never let a Redis outage disable the limiter.
        return false;
    }
}

async function checkGenerationLimit(userId: string): Promise<void> {
    const hour = Math.floor(Date.now() / 3_600_000);
    if (!billingConfigured()) {
        if (isProduction()) throw new Error("AUTH_STORE_UNAVAILABLE");
        const record = memGenerations.get(userId);
        if (!record || record.resetAt <= Date.now()) {
            memGenerations.set(userId, { count: 1, resetAt: Date.now() + 3_600_000 });
            return;
        }
        if (record.count >= MAX_GENERATIONS_PER_USER_HOUR) {
            throw new Error("RATE_LIMITED");
        }
        record.count++;
        return;
    }

    const count = (await command(["INCR", generationKey(userId, hour)])) as number;
    if (count === 1) {
        await command(["EXPIRE", generationKey(userId, hour), 3_600]);
    }
    if (count > MAX_GENERATIONS_PER_USER_HOUR) {
        throw new Error("RATE_LIMITED");
    }
}

export async function createPairingSession(params: {
    userId: string;
    email: string | null;
}): Promise<{
    code: string;
    formatted: string;
    expiresAt: number;
    qrPayload: string;
}> {
    await checkGenerationLimit(params.userId);

    const now = Date.now();
    const expiresAt = now + PAIRING_TTL_SECONDS * 1000;
    const data: PairingData = {
        userId: params.userId,
        email: params.email ?? null,
        createdAt: now,
        expiresAt,
    };

    if (!requireStore()) {
        const oldHash = memUserPairs.get(params.userId);
        if (oldHash) memPairs.delete(oldHash);
        const code = generatePairingCode();
        const hash = hashPairingCode(code);
        memPairs.set(hash, data);
        memUserPairs.set(params.userId, hash);
        return {
            code,
            formatted: formatPairingCode(code),
            expiresAt: Math.floor(expiresAt / 1000),
            qrPayload: `zippp://pair?code=${code}`,
        };
    }

    // Invalidate any prior active code for this user.
    try {
        const oldHash = (await command(["GET", userActivePairKey(params.userId)])) as string | null;
        if (oldHash) await command(["DEL", pairKey(oldHash)]);
    } catch {
        /* cleanup is best effort */
    }

    for (let attempt = 0; attempt < 5; attempt++) {
        const code = generatePairingCode();
        const hash = hashPairingCode(code);
        const set = await command([
            "SET",
            pairKey(hash),
            JSON.stringify(data),
            "EX",
            PAIRING_TTL_SECONDS,
            "NX",
        ]);
        if (set === "OK") {
            await command([
                "SET",
                userActivePairKey(params.userId),
                hash,
                "EX",
                PAIRING_TTL_SECONDS,
            ]);
            return {
                code,
                formatted: formatPairingCode(code),
                expiresAt: Math.floor(expiresAt / 1000),
                qrPayload: `zippp://pair?code=${code}`,
            };
        }
    }

    throw new Error("PAIRING_CODE_GENERATION_FAILED");
}

export type ClaimPairingResult =
    | { ok: true; data: { userId: string; email: string | null } }
    | {
          ok: false;
          error: "INVALID_PAIRING_CODE" | "RATE_LIMITED" | "STORE_UNAVAILABLE";
      };

export async function claimPairingCode(
    rawCode: string,
    clientIp = "unknown"
): Promise<ClaimPairingResult> {
    const allowed = await checkIpRateLimit(clientIp);
    if (!allowed) return { ok: false, error: "RATE_LIMITED" };

    const normalized = normalizePairingCode(rawCode);
    if (!CROCKFORD_PATTERN.test(normalized)) {
        return { ok: false, error: "INVALID_PAIRING_CODE" };
    }

    const hash = hashPairingCode(normalized);

    if (!billingConfigured()) {
        if (isProduction()) return { ok: false, error: "STORE_UNAVAILABLE" };
        const record = memPairs.get(hash);
        if (!record || record.expiresAt <= Date.now()) {
            memPairs.delete(hash);
            return { ok: false, error: "INVALID_PAIRING_CODE" };
        }
        memPairs.delete(hash);
        memUserPairs.delete(record.userId);
        return { ok: true, data: { userId: record.userId, email: record.email } };
    }

    try {
        // GETDEL is atomic: two concurrent claims cannot both consume the code.
        const raw = (await command(["GETDEL", pairKey(hash)])) as string | null;
        if (!raw || typeof raw !== "string") {
            return { ok: false, error: "INVALID_PAIRING_CODE" };
        }

        const record = JSON.parse(raw) as PairingData;
        if (!record?.userId || record.expiresAt <= Date.now()) {
            return { ok: false, error: "INVALID_PAIRING_CODE" };
        }

        try {
            await command(["DEL", userActivePairKey(record.userId)]);
        } catch {
            /* cleanup is best effort */
        }

        return { ok: true, data: { userId: record.userId, email: record.email ?? null } };
    } catch {
        return { ok: false, error: "STORE_UNAVAILABLE" };
    }
}
