import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { approveOrder, rejectOrder } from "@/lib/billing/orders";

export const runtime = "nodejs";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await currentUser();
    if (!user.admin) {
        return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
    }
    const { id } = await params;

    let action = "";
    try {
        const body = (await req.json()) as { action?: string };
        action = body.action ?? "";
    } catch {
        /* handled below */
    }

    if (action === "approve") {
        const order = await approveOrder(id);
        return order
            ? NextResponse.json({ ok: true, order })
            : NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
    }
    if (action === "reject") {
        const order = await rejectOrder(id);
        return order
            ? NextResponse.json({ ok: true, order })
            : NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: false, error: "Unknown action." }, { status: 400 });
}
