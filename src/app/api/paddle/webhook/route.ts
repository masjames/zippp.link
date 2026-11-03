import { NextResponse } from "next/server";
import { balance, grant } from "@/lib/billing/ledger";
import { paddleConfig, verifyPaddleSignature } from "@/lib/billing/paddle";
import { activatePlan, cancelPlan } from "@/lib/billing/plan";
import { onTopupApproved } from "@/lib/billing/referral";
import { sendTopUpAlert } from "@/lib/telegram/alerts";

export const runtime = "nodejs";

type PaddleEvent = {
    event_type?: string;
    data?: {
        id?: string;
        subscription_id?: string;
        custom_data?: { google_user_id?: string; plan?: string } | null;
    };
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

    if (event.event_type === "subscription.canceled") {
        const subscriptionId = event.data?.id;
        const canceled = subscriptionId
            ? await cancelPlan(subscriptionId)
            : false;
        return NextResponse.json({ ok: true, canceled });
    }

    if (event.event_type !== "transaction.completed") {
        return NextResponse.json({ ok: true, ignored: event.event_type });
    }

    if (event.data?.custom_data?.plan === "pro") {
        const planUserId = event.data.custom_data.google_user_id;
        if (!planUserId) {
            return NextResponse.json({ ok: false, error: "Missing user." }, { status: 400 });
        }
        const plan = await activatePlan({
            userId: planUserId,
            subscriptionId: event.data.subscription_id ?? event.data.id ?? null,
        });
        return NextResponse.json({ ok: true, plan: plan.period_end });
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
        let current = { credits: 0 };
        try {
            current = await balance(userId);
        } catch {
            /* alert balance is best effort */
        }
        void sendTopUpAlert({
            userId,
            added: credits,
            newBalance: current.credits,
        });
    }

    return NextResponse.json({ ok: true, granted });
}
