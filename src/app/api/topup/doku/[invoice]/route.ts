import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getDokuOrder } from "@/lib/billing/doku";

export const runtime = "nodejs";

/** Order status for the return page; only the owner may read it. */
export async function GET(
    _req: Request,
    { params }: { params: Promise<{ invoice: string }> }
) {
    const user = await currentUser();
    if (!user.signedIn || !user.userId) {
        return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
    }
    const { invoice } = await params;
    const order = await getDokuOrder(invoice);
    if (!order || order.userId !== user.userId) {
        return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
    }
    return NextResponse.json({
        ok: true,
        order: { invoice: order.invoice, amount: order.amount, state: order.state },
    });
}
