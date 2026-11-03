// @implements FEAT-114
import { createHash, randomBytes } from "node:crypto";
import { billingConfigured, command } from "@/lib/billing/redis";
import type { SpaceInvite } from "./types";

export const INVITE_TTL_SECONDS = 7 * 24 * 3600;
const inviteKey = (hash: string) => `space:invite:${hash}`;

const memInvites = new Map<string, SpaceInvite>();

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

function requireStore(): boolean {
  if (billingConfigured()) return true;
  if (isProduction()) throw new Error("SPACE_STORE_UNAVAILABLE");
  return false;
}

export function hashInviteCode(code: string): string {
  return createHash("sha256").update(code.trim()).digest("hex");
}

/**
 * Create a single-use invite. `email` binds the invite to one address so a
 * forwarded link cannot be redeemed by somebody else.
 */
export async function createInvite(params: {
  spaceId: string;
  createdBy: string;
  email?: string | null;
  ttlSeconds?: number;
}): Promise<{ code: string; invite: SpaceInvite }> {
  const ttl = params.ttlSeconds ?? INVITE_TTL_SECONDS;
  const now = Date.now();
  const invite: SpaceInvite = {
    space_id: params.spaceId,
    created_by: params.createdBy,
    email: params.email ? params.email.trim().toLowerCase() : null,
    created_at: now,
    expires_at: now + ttl * 1000,
  };
  const code = randomBytes(16).toString("hex");
  const hash = hashInviteCode(code);

  if (!requireStore()) {
    memInvites.set(hash, invite);
    return { code, invite };
  }

  await command([
    "SET",
    inviteKey(hash),
    JSON.stringify(invite),
    "EX",
    Math.max(1, ttl),
  ]);
  return { code, invite };
}

/** Read an invite without consuming it. Used to validate before joining. */
export async function readInvite(code: string): Promise<SpaceInvite | null> {
  const trimmed = code.trim();
  if (!trimmed) return null;
  const hash = hashInviteCode(trimmed);

  if (!billingConfigured()) {
    if (isProduction()) return null;
    const invite = memInvites.get(hash);
    if (!invite) return null;
    if (invite.expires_at <= Date.now()) {
      memInvites.delete(hash);
      return null;
    }
    return invite;
  }

  try {
    const raw = (await command(["GET", inviteKey(hash)])) as string | null;
    if (!raw || typeof raw !== "string") return null;
    const invite = JSON.parse(raw) as SpaceInvite;
    if (invite.expires_at <= Date.now()) {
      await command(["DEL", inviteKey(hash)]);
      return null;
    }
    return invite;
  } catch {
    return null;
  }
}

/** Read and delete an invite. Returns null when it is missing or expired. */
export async function consumeInvite(
  code: string
): Promise<SpaceInvite | null> {
  const trimmed = code.trim();
  if (!trimmed) return null;
  const hash = hashInviteCode(trimmed);

  if (!billingConfigured()) {
    if (isProduction()) return null;
    const invite = memInvites.get(hash);
    if (!invite) return null;
    memInvites.delete(hash);
    if (invite.expires_at <= Date.now()) return null;
    return invite;
  }

  try {
    let raw = (await command(["GETDEL", inviteKey(hash)])) as string | null;
    if (!raw) {
      raw = (await command(["GET", inviteKey(hash)])) as string | null;
      if (raw) await command(["DEL", inviteKey(hash)]);
    }
    if (!raw || typeof raw !== "string") return null;
    const invite = JSON.parse(raw) as SpaceInvite;
    if (invite.expires_at <= Date.now()) return null;
    return invite;
  } catch {
    return null;
  }
}

export function __resetInviteStoreForTests(): void {
  memInvites.clear();
}
