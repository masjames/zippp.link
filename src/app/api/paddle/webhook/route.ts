import { NextResponse } from "next/server";
import { grant } from "@/lib/billing/ledger";
import { paddleConfig, verifyPaddleSignature } from "@/lib/billing/paddle";
import { onTopupApproved } from "@/lib/billing/referral";

export const runtime = "nodejs";

type PaddleEvent = {
    event_type?: string;
    data?: { id?: string; custom_data?: { google_user_id?: string } | null };
};

export async function POST(req: Request) {
    const raw = await req.text();
    const secret = process.env.PADDLE_WEBHOOK_SECRET || "";
    const signature = req.headers.get("paddle-signature");

    if (!verifyPaddleSignature(raw, signature, secret)) {
        return NextResponse.json({ ok: false, error: "Bad signature." }, { status: 401 });
    }

    let event: PaddleEvent;
    try {
        event = JSON.parse(raw) as PaddleEvent;
    } catch {
        return NextResponse.json({ ok: false, error: "Bad JSON." }, { status: 400 });
    }

    if (event.event_type !== "transaction.completed") {
        return NextResponse.json({ ok: true, ignored: event.event_type });
    }

    const txnId = event.data?.id;
    const userId = event.data?.custom_data?.google_user_id;
    if (!txnId || !userId) {
        return NextResponse.json({ ok: false, error: "Missing txn or user." }, { status: 400 });
    }

    const { credits } = paddleConfig();
    const granted = await grant({
        userId,
        credits,
        source: "topup_paddle",
        idem: `paddle:${txnId}`,
        note: `transaction ${txnId}`,
    });
    if (granted) {
        await onTopupApproved(userId, credits, `paddle:${txnId}`);
    }

    return NextResponse.json({ ok: true, granted });
}
