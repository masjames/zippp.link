// @implements FEAT-113
import { createHash, randomBytes } from "node:crypto";
import { billingConfigured, command } from "@/lib/billing/redis";

const MAGIC_TTL_SECONDS = 15 * 60;
const MAX_ATTEMPTS_PER_IP = 10;
const MAX_PER_EMAIL_HOUR = 5;
const WINDOW_SECONDS = 15 * 60;

export type MagicLinkData = {
  userId: string;
  email: string;
  createdAt: number;
  expiresAt: number;
};

const tokenKey = (hash: string) => `auth:magic:${hash}`;
const ipRateKey = (ip: string) => `auth:magic_ip:${ip}`;
const emailRateKey = (email: string, hour: number) =>
  `auth:magic_email:${email}:${hour}`;

const memTokens = new Map<string, MagicLinkData>();
const memIp = new Map<string, { count: number; resetAt: number }>();
const memEmail = new Map<string, { count: number; resetAt: number }>();

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

function requireStore(): boolean {
  if (billingConfigured()) return true;
  if (isProduction()) throw new Error("AUTH_STORE_UNAVAILABLE");
  return false;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function hashMagicToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateMagicToken(): string {
  return randomBytes(32).toString("hex");
}

async function checkIp(ip: string): Promise<boolean> {
  const clean = (ip || "unknown").trim() || "unknown";
  const now = Date.now();
  if (!billingConfigured()) {
    if (isProduction()) return false;
    const record = memIp.get(clean);
    if (!record || record.resetAt <= now) {
      memIp.set(clean, { count: 1, resetAt: now + WINDOW_SECONDS * 1000 });
      return true;
    }
    if (record.count >= MAX_ATTEMPTS_PER_IP) return false;
    record.count++;
    return true;
  }
  try {
    const count = (await command(["INCR", ipRateKey(clean)])) as number;
    if (count === 1) await command(["EXPIRE", ipRateKey(clean), WINDOW_SECONDS]);
    return count <= MAX_ATTEMPTS_PER_IP;
  } catch {
    return false;
  }
}

async function checkEmail(email: string): Promise<boolean> {
  const hour = Math.floor(Date.now() / 3_600_000);
  if (!billingConfigured()) {
    if (isProduction()) return false;
    const key = `${email}:${hour}`;
    const record = memEmail.get(key);
    if (!record || record.resetAt <= Date.now()) {
      memEmail.set(key, { count: 1, resetAt: Date.now() + 3_600_000 });
      return true;
    }
    if (record.count >= MAX_PER_EMAIL_HOUR) return false;
    record.count++;
    return true;
  }
  try {
    const count = (await command([
      "INCR",
      emailRateKey(email, hour),
    ])) as number;
    if (count === 1) await command(["EXPIRE", emailRateKey(email, hour), 3600]);
    return count <= MAX_PER_EMAIL_HOUR;
  } catch {
    return false;
  }
}

export async function createMagicLink(params: {
  userId: string;
  email: string;
  clientIp: string;
}): Promise<
  | { ok: true; token: string; expiresAt: number }
  | { ok: false; error: "RATE_LIMITED" | "STORE_UNAVAILABLE" }
> {
  const email = normalizeEmail(params.email);
  if (!(await checkIp(params.clientIp)) || !(await checkEmail(email))) {
    return { ok: false, error: "RATE_LIMITED" };
  }

  const now = Date.now();
  const expiresAt = now + MAGIC_TTL_SECONDS * 1000;
  const data: MagicLinkData = {
    userId: params.userId,
    email,
    createdAt: now,
    expiresAt,
  };

  try {
    if (!requireStore()) {
      const token = generateMagicToken();
      memTokens.set(hashMagicToken(token), data);
      return { ok: true, token, expiresAt: Math.floor(expiresAt / 1000) };
    }

    for (let i = 0; i < 5; i++) {
      const token = generateMagicToken();
      const hash = hashMagicToken(token);
      const set = await command([
        "SET",
        tokenKey(hash),
        JSON.stringify(data),
        "EX",
        MAGIC_TTL_SECONDS,
        "NX",
      ]);
      if (set === "OK") {
        return { ok: true, token, expiresAt: Math.floor(expiresAt / 1000) };
      }
    }
    return { ok: false, error: "STORE_UNAVAILABLE" };
  } catch {
    return { ok: false, error: "STORE_UNAVAILABLE" };
  }
}

export async function consumeMagicLink(
  token: string,
  clientIp: string
): Promise<
  | { ok: true; data: MagicLinkData }
  | { ok: false; error: "INVALID_TOKEN" | "RATE_LIMITED" | "STORE_UNAVAILABLE" }
> {
  if (!(await checkIp(clientIp))) {
    return { ok: false, error: "RATE_LIMITED" };
  }
  const rawToken = (token || "").trim();
  if (rawToken.length < 16) return { ok: false, error: "INVALID_TOKEN" };
  const hash = hashMagicToken(rawToken);

  try {
    if (!requireStore()) {
      const data = memTokens.get(hash);
      if (!data) return { ok: false, error: "INVALID_TOKEN" };
      if (data.expiresAt <= Date.now()) {
        memTokens.delete(hash);
        return { ok: false, error: "INVALID_TOKEN" };
      }
      memTokens.delete(hash);
      return { ok: true, data };
    }

    const raw = (await command(["GETDEL", tokenKey(hash)])) as string | null;
    if (!raw) return { ok: false, error: "INVALID_TOKEN" };
    const data = JSON.parse(raw) as MagicLinkData;
    if (!data?.userId || data.expiresAt <= Date.now()) {
      return { ok: false, error: "INVALID_TOKEN" };
    }
    return { ok: true, data };
  } catch {
    // Fallback without GETDEL
    try {
      if (!billingConfigured()) return { ok: false, error: "STORE_UNAVAILABLE" };
      const raw = (await command(["GET", tokenKey(hash)])) as string | null;
      if (!raw) return { ok: false, error: "INVALID_TOKEN" };
      await command(["DEL", tokenKey(hash)]);
      const data = JSON.parse(raw) as MagicLinkData;
      if (!data?.userId || data.expiresAt <= Date.now()) {
        return { ok: false, error: "INVALID_TOKEN" };
      }
      return { ok: true, data };
    } catch {
      return { ok: false, error: "STORE_UNAVAILABLE" };
    }
  }
}
