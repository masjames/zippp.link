import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { GOPAY_NAME, GOPAY_NUMBER } from "@/lib/billing/config";
import { getOrder } from "@/lib/billing/orders";

export const runtime = "nodejs";

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const user = await currentUser();
    if (!user.signedIn || !user.userId) {
        return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
    }
    const order = await getOrder(id);
    if (!order || order.userId !== user.userId) {
        return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
    }
    return NextResponse.json({
        ok: true,
        order,
        gopay: { number: GOPAY_NUMBER, name: GOPAY_NAME },
    });
}
