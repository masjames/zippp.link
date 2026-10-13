import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { recentDokuOrders } from "@/lib/billing/doku";

export const runtime = "nodejs";

/** Recent DOKU checkouts, read-only. Credits are granted by DOKU's notification. */
export async function GET() {
    const user = await currentUser();
    if (!user.admin) {
        return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
    }
    const recent = await recentDokuOrders(50);
    return NextResponse.json({ ok: true, recent });
}
