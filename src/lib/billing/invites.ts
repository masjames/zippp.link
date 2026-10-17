import { randomUUID } from "node:crypto";
import { INVITE_MIN_TOPUP_IDR } from "./config";
import { billingConfigured, command } from "./redis";

/**
 * Exclusive invitations. The admin adds an email, the server mints a unique
 * link, and that account can top up from Rp 10.000 instead of Rp 15.000.
 *
 * One invite per email. The link is claimed once, by the matching Google
 * account, and the lower minimum is then read from the user record.
 */

export type Invite = {
    code: string;
    email: string;
    minTopupIdr: number;
    status: "open" | "claimed" | "revoked";
    createdAt: number;
    claimedBy: string | null;
    claimedAt: number | null;
};

const inviteKey = (code: string) => `bill:invite:${code}`;
const emailKey = (email: string) => `bill:invite:email:${email.trim().toLowerCase()}`;
const userKey = (userId: string) => `bill:invite:user:${userId}`;
const ALL = "bill:invite:all";

function newCode(): string {
    return `ZP${randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()}`;
}

async function readJson<T>(key: string): Promise<T | null> {
    const raw = (await command(["GET", key])) as string | null;
    if (!raw) return null;
    try {
        return JSON.parse(raw) as T;
    } catch {
        return null;
    }
}

export async function getInvite(code: string): Promise<Invite | null> {
    return readJson<Invite>(inviteKey(code.trim().toUpperCase()));
}

export async function getInviteByEmail(email: string): Promise<Invite | null> {
    const code = (await command(["GET", emailKey(email)])) as string | null;
    return code ? getInvite(code) : null;
}

export async function createInvite(email: string): Promise<Invite> {
    const normalized = email.trim().toLowerCase();
    const existing = await getInviteByEmail(normalized);
    if (existing && existing.status !== "revoked") return existing;

    const invite: Invite = {
        code: newCode(),
        email: normalized,
        minTopupIdr: INVITE_MIN_TOPUP_IDR,
        status: "open",
        createdAt: Date.now(),
        claimedBy: null,
        claimedAt: null,
    };
    await command(["SET", inviteKey(invite.code), JSON.stringify(invite)]);
    await command(["SET", emailKey(normalized), invite.code]);
    await command(["LPUSH", ALL, invite.code]);
    await command(["LTRIM", ALL, 0, 499]);
    return invite;
}

export async function listInvites(limit = 100): Promise<Invite[]> {
    const codes =
        ((await command(["LRANGE", ALL, 0, limit - 1])) as string[] | null) ?? [];
    const out: Invite[] = [];
    for (const code of codes) {
        const invite = await getInvite(code);
        if (invite) out.push(invite);
    }
    return out;
}

/** Claim for the signed-in account. The email must match the invite. */
export async function claimInvite(
    code: string,
    userId: string,
    email: string | null
): Promise<Invite | null> {
    const invite = await getInvite(code);
    if (!invite || invite.status === "revoked") return null;
    if (email && invite.email.toLowerCase() !== email.toLowerCase()) return null;
    if (invite.status === "claimed") {
        return invite.claimedBy === userId ? invite : null;
    }
    const next: Invite = {
        ...invite,
        status: "claimed",
        claimedBy: userId,
        claimedAt: Date.now(),
    };
    await command(["SET", inviteKey(invite.code), JSON.stringify(next)]);
    await command(["SET", userKey(userId), invite.code]);
    return next;
}

export async function getUserInvite(userId: string): Promise<Invite | null> {
    const code = (await command(["GET", userKey(userId)])) as string | null;
    return code ? getInvite(code) : null;
}

export async function revokeInvite(code: string): Promise<Invite | null> {
    const invite = await getInvite(code);
    if (!invite) return null;
    const next: Invite = { ...invite, status: "revoked" };
    await command(["SET", inviteKey(invite.code), JSON.stringify(next)]);
    return next;
}

/** Public view of an invite for the welcome page. No claim, no writer data. */
export async function publicInviteForCode(
    code: string | null | undefined
): Promise<{ email: string; minTopupIdr: number } | null> {
    const value = (code || "").trim();
    if (!value || !billingConfigured()) return null;
    try {
        const invite = await getInvite(value);
        if (!invite || invite.status === "revoked") return null;
        return { email: invite.email, minTopupIdr: invite.minTopupIdr };
    } catch {
        return null;
    }
}

/** The lowest accepted top-up for this user: invite min when claimed. */
export async function minTopupForUser(
    userId: string,
    fallback: number
): Promise<number> {
    const invite = await getUserInvite(userId);
    return invite?.status === "claimed" ? invite.minTopupIdr : fallback;
}
