import type { RequestUser } from "./request-user";

/** Web drafts are tied to the signed-in account; mobile bearer sessions bind their own user. */
export function matchesAppendOwner(user: Pick<RequestUser, "source" | "userId">, expectedUserId: unknown): boolean {
    return user.source === "mobile" || (typeof expectedUserId === "string" && expectedUserId === user.userId);
}
