import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { decryptSecret, encryptSecret } from "./crypto";

/**
 * Per-browser session. The cookie holds the Google user id, encrypted with
 * TOKEN_ENCRYPTION_KEY so it cannot be tampered with. Token and workspace
 * records are keyed by that id, which is what makes the app multi-user and
 * keeps `/admin` private.
 */
export const SESSION_COOKIE = "zippp_sid";
const MAX_AGE = 60 * 60 * 24 * 30;

export async function sessionUserId(): Promise<string | null> {
    const store = await cookies();
    const raw = store.get(SESSION_COOKIE)?.value;
    if (!raw) return null;
    try {
        return decryptSecret(raw);
    } catch {
        return null;
    }
}

export function applySession(userId: string, res: NextResponse): void {
    res.cookies.set(SESSION_COOKIE, encryptSecret(userId), {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: MAX_AGE,
    });
}

export function clearSession(res: NextResponse): void {
    res.cookies.set(SESSION_COOKIE, "", {
        httpOnly: true,
        path: "/",
        maxAge: 0,
    });
}
