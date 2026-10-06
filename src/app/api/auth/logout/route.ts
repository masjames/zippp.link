import { NextResponse } from "next/server";
import { clearSession } from "@/lib/google/session";
import { deleteTokens } from "@/lib/google/token-store";
import { deleteWorkspace } from "@/lib/google/workspace-store";

export const runtime = "nodejs";

export async function GET(req: Request) {
    await deleteTokens();
    await deleteWorkspace();
    const url = new URL("/", req.url);
    url.searchParams.set("auth", "logged_out");
    const res = NextResponse.redirect(url);
    clearSession(res);
    return res;
}

export async function POST() {
    await deleteTokens();
    await deleteWorkspace();
    const res = NextResponse.json({ ok: true, signedIn: false });
    clearSession(res);
    return res;
}
