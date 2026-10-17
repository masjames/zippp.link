import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { refreshKaseraOrder } from "@/lib/billing/kasera";

export const runtime = "nodejs";

/** Status for the QRIS return page. Refreshes from Kasera while pending. */
export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const user = await currentUser();
    if (!user.signedIn || !user.userId) {
        return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
    }
    const order = await refreshKaseraOrder(id);
    if (!order || order.userId !== user.userId) {
        return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
    }
    return NextResponse.json({
        ok: true,
        order: {
            id: order.orderId,
            amount: order.amount,
            status: order.status,
            expiresAt: order.expiresAt,
            checkoutUrl: order.checkoutUrl,
            qrString: order.qrString,
        },
    });
}
