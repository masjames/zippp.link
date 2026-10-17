import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { clearNotice } from "@/lib/notices";

export const runtime = "nodejs";

/** Mark the pending notice as read. */
export async function POST() {
    const user = await currentUser();
    if (user.signedIn && user.userId) {
        await clearNotice(user.userId);
    }
    return NextResponse.json({ ok: true });
}
