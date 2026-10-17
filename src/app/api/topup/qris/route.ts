import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import {
    MAX_TOPUP_IDR,
    MIN_TOPUP_IDR,
} from "@/lib/billing/config";
import { minTopupForUser } from "@/lib/billing/invites";
import { createKaseraOrder, kaseraConfigured } from "@/lib/billing/kasera";
import { billingConfigured } from "@/lib/billing/redis";

export const runtime = "nodejs";

/** Create a Kasera QRIS payment request and return its hosted checkout. */
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
    if (!kaseraConfigured()) {
        return NextResponse.json(
            { ok: false, error: "QRIS is not configured." },
            { status: 400 }
        );
    }

    let body: { amountIdr?: number } = {};
    try {
        body = (await req.json()) as { amountIdr?: number };
    } catch {
        /* handled below */
    }

    const amount = Number(body.amountIdr);
    const minIdr = await minTopupForUser(user.userId, MIN_TOPUP_IDR);
    if (
        !Number.isFinite(amount) ||
        amount < minIdr ||
        amount > MAX_TOPUP_IDR ||
        amount % 1000 !== 0
    ) {
        return NextResponse.json(
            {
                ok: false,
                error: `Amount must be between ${minIdr} and ${MAX_TOPUP_IDR} in steps of 1000.`,
            },
            { status: 400 }
        );
    }

    const host =
        req.headers.get("x-forwarded-host") ||
        req.headers.get("host") ||
        "";
    const proto = req.headers.get("x-forwarded-proto") || "https";
    const origin = `${proto}://${host}`;

    try {
        const order = await createKaseraOrder({
            userId: user.userId,
            email: user.email,
            name: user.email ? user.email.split("@")[0] : null,
            amountIdr: amount,
            origin,
        });
        return NextResponse.json({
            ok: true,
            order: {
                id: order.orderId,
                checkoutUrl: order.checkoutUrl,
                qrString: order.qrString,
                amount: order.amount,
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
