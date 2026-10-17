import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { createOrder } from "@/lib/billing/orders";
import { MIN_TOPUP_IDR } from "@/lib/billing/config";
import { minTopupForUser } from "@/lib/billing/invites";
import { billingConfigured } from "@/lib/billing/redis";

export const runtime = "nodejs";

export async function POST(req: Request) {
    const user = await currentUser();
    if (!user.signedIn || !user.userId) {
        return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
    }
    if (!billingConfigured()) {
        return NextResponse.json(
            { ok: false, error: "Billing is not configured." },
            { status: 400 }
        );
    }

    let body: { baseIdr?: number } = {};
    try {
        body = (await req.json()) as { baseIdr?: number };
    } catch {
        /* handled below */
    }

    try {
        const minIdr = await minTopupForUser(user.userId, MIN_TOPUP_IDR);
        const order = await createOrder({
            userId: user.userId,
            email: user.email,
            baseIdr: Number(body.baseIdr),
            minIdr,
        });
        return NextResponse.json({
            ok: true,
            order: {
                id: order.id,
                payIdr: order.payIdr,
                baseIdr: order.baseIdr,
                code: order.code,
                expiresAt: order.expiresAt,
            },
        });
    } catch (err) {
        return NextResponse.json(
            { ok: false, error: err instanceof Error ? err.message : "Failed." },
            { status: 400 }
        );
    }
}
