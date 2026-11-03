// @implements FEAT-114
import { randomUUID } from "node:crypto";
import { billingConfigured, command } from "@/lib/billing/redis";
import { consumeInvite, readInvite } from "./invite-store";
import type { SpaceMember, SpaceRecord, SpaceRole } from "./types";

const spaceKey = (id: string) => `space:record:${id}`;
const userSpacesKey = (userId: string) => `space:user:${userId}`;

const memSpaces = new Map<string, SpaceRecord>();
const memUserSpaces = new Map<string, Set<string>>();

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

function requireStore(): boolean {
  if (billingConfigured()) return true;
  if (isProduction()) throw new Error("SPACE_STORE_UNAVAILABLE");
  return false;
}

export function normalizeSpaceName(name: string): string {
  return name
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

export function normalizeEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const value = email.trim().toLowerCase();
  if (!value || value.length > 254 || !value.includes("@")) return null;
  return value;
}

async function saveSpace(space: SpaceRecord): Promise<void> {
  if (!requireStore()) {
    memSpaces.set(space.space_id, space);
    for (const member of space.members) {
      let set = memUserSpaces.get(member.user_id);
      if (!set) {
        set = new Set();
        memUserSpaces.set(member.user_id, set);
      }
      set.add(space.space_id);
    }
    return;
  }
  await command(["SET", spaceKey(space.space_id), JSON.stringify(space)]);
  for (const member of space.members) {
    await command(["SADD", userSpacesKey(member.user_id), space.space_id]);
  }
}

async function unindexUser(userId: string, spaceId: string): Promise<void> {
  if (billingConfigured()) {
    await command(["SREM", userSpacesKey(userId), spaceId]);
    return;
  }
  memUserSpaces.get(userId)?.delete(spaceId);
}

function roleFor(space: SpaceRecord, userId: string): SpaceRole | null {
  return space.members.find((m) => m.user_id === userId)?.role ?? null;
}

export async function getSpace(spaceId: string): Promise<SpaceRecord | null> {
  if (!billingConfigured()) {
    if (isProduction()) return null;
    return memSpaces.get(spaceId) ?? null;
  }
  try {
    const raw = await command(["GET", spaceKey(spaceId)]);
    if (!raw || typeof raw !== "string") return null;
    return JSON.parse(raw) as SpaceRecord;
  } catch {
    return null;
  }
}

export async function createSpace(params: {
  ownerUserId: string;
  displayName: string;
  ownerEmail?: string | null;
}): Promise<SpaceRecord> {
  const displayName = normalizeSpaceName(params.displayName);
  if (!displayName) throw new Error("INVALID_NAME");

  const now = Date.now();
  const space: SpaceRecord = {
    space_id: randomUUID(),
    display_name: displayName,
    owner_user_id: params.ownerUserId,
    sheet_source_user_id: params.ownerUserId,
    members: [
      {
        user_id: params.ownerUserId,
        email: normalizeEmail(params.ownerEmail),
        role: "owner",
        joined_at: now,
      },
    ],
    created_at: now,
    updated_at: now,
  };
  await saveSpace(space);
  return space;
}

export async function listSpacesForUser(
  userId: string
): Promise<SpaceRecord[]> {
  if (!billingConfigured()) {
    if (isProduction()) return [];
    const ids = memUserSpaces.get(userId) ?? new Set();
    return [...ids]
      .map((id) => memSpaces.get(id))
      .filter((s): s is SpaceRecord => Boolean(s))
      .sort((a, b) => a.created_at - b.created_at);
  }
  try {
    const ids = (await command(["SMEMBERS", userSpacesKey(userId)])) as string[];
    const out: SpaceRecord[] = [];
    for (const id of ids || []) {
      const space = await getSpace(id);
      if (space) out.push(space);
    }
    return out.sort((a, b) => a.created_at - b.created_at);
  } catch {
    return [];
  }
}

export async function renameSpace(
  spaceId: string,
  actorUserId: string,
  displayName: string
): Promise<SpaceRecord | null> {
  const space = await getSpace(spaceId);
  if (!space) return null;
  if (space.owner_user_id !== actorUserId) throw new Error("FORBIDDEN");
  const name = normalizeSpaceName(displayName);
  if (!name) throw new Error("INVALID_NAME");
  space.display_name = name;
  space.updated_at = Date.now();
  await saveSpace(space);
  return space;
}

export async function addMember(
  spaceId: string,
  userId: string,
  role: SpaceRole = "member",
  email?: string | null
): Promise<SpaceRecord | null> {
  const space = await getSpace(spaceId);
  if (!space) return null;
  const existing = space.members.find((m) => m.user_id === userId);
  if (existing) {
    const normalized = normalizeEmail(email);
    if (normalized && existing.email !== normalized) {
      existing.email = normalized;
      space.updated_at = Date.now();
      await saveSpace(space);
    }
    return space;
  }
  const member: SpaceMember = {
    user_id: userId,
    email: normalizeEmail(email),
    role,
    joined_at: Date.now(),
  };
  space.members.push(member);
  space.updated_at = Date.now();
  await saveSpace(space);
  return space;
}

/**
 * Redeem an invite. An email-bound invite only works for that address; a
 * failed match leaves the invite usable by the intended person.
 */
export async function joinSpaceByInvite(params: {
  code: string;
  userId: string;
  email?: string | null;
}): Promise<{ space: SpaceRecord; alreadyMember: boolean }> {
  const invite = await readInvite(params.code);
  if (!invite) throw new Error("INVALID_INVITE");

  const userEmail = normalizeEmail(params.email);
  if (invite.email && invite.email !== userEmail) {
    throw new Error("INVITE_EMAIL_MISMATCH");
  }

  const space = await getSpace(invite.space_id);
  if (!space) throw new Error("SPACE_NOT_FOUND");

  const alreadyMember = roleFor(space, params.userId) !== null;
  const consumed = await consumeInvite(params.code);
  if (!consumed) throw new Error("INVALID_INVITE");

  if (alreadyMember) return { space, alreadyMember: true };

  const updated = await addMember(
    space.space_id,
    params.userId,
    "member",
    userEmail
  );
  if (!updated) throw new Error("SPACE_NOT_FOUND");
  return { space: updated, alreadyMember: false };
}

export async function removeMember(
  spaceId: string,
  actorUserId: string,
  targetUserId: string
): Promise<SpaceRecord | null> {
  const space = await getSpace(spaceId);
  if (!space) return null;
  if (space.owner_user_id !== actorUserId) throw new Error("FORBIDDEN");
  if (targetUserId === space.owner_user_id) {
    throw new Error("CANNOT_REMOVE_OWNER");
  }
  space.members = space.members.filter((m) => m.user_id !== targetUserId);
  space.updated_at = Date.now();
  await saveSpace(space);
  await unindexUser(targetUserId, spaceId);
  return space;
}

export async function leaveSpace(
  spaceId: string,
  userId: string
): Promise<SpaceRecord | null> {
  const space = await getSpace(spaceId);
  if (!space) return null;
  if (space.owner_user_id === userId) throw new Error("OWNER_CANNOT_LEAVE");
  if (!roleFor(space, userId)) return space;

  space.members = space.members.filter((m) => m.user_id !== userId);
  space.updated_at = Date.now();
  await saveSpace(space);
  await unindexUser(userId, spaceId);
  return space;
}

/** Test helper */
export function __resetSpaceStoreForTests(): void {
  memSpaces.clear();
  memUserSpaces.clear();
}
