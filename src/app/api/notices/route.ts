import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getNotice } from "@/lib/notices";

export const runtime = "nodejs";

/** The signed-in user's pending one-off notice, if any. */
export async function GET() {
    const user = await currentUser();
    if (!user.signedIn || !user.userId) {
        return NextResponse.json({ ok: true, notice: null });
    }
    return NextResponse.json({ ok: true, notice: await getNotice(user.userId) });
}
