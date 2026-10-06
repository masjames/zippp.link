import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { claimOrder } from "@/lib/billing/orders";

export const runtime = "nodejs";

export async function POST(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const user = await currentUser();
    if (!user.signedIn || !user.userId) {
        return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
    }
    const order = await claimOrder(id, user.userId);
    if (!order) {
        return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, order });
}
