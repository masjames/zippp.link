import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { openOrders, recentOrders } from "@/lib/billing/orders";

export const runtime = "nodejs";

export async function GET() {
    const user = await currentUser();
    if (!user.admin) {
        return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
    }
    const [open, recent] = await Promise.all([openOrders(), recentOrders()]);
    return NextResponse.json({ ok: true, open, recent });
}
