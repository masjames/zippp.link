import { NextResponse } from "next/server";
import {
    applyKaseraEvent,
    kaseraWebhookConfigured,
    verifyKaseraSignature,
} from "@/lib/billing/kasera";

export const runtime = "nodejs";

/**
 * Kasera Pay webhook. Signature covers `t + "." + rawBody`
 * (`Kasera-Signature-V1: t=<unix>,v1=<hex>`). Deduplicated on the payment
 * request id inside grant().
 */
export async function POST(req: Request) {
    const raw = await req.text();
    if (!kaseraWebhookConfigured()) {
        return NextResponse.json(
            { ok: false, error: "Webhook is not configured." },
            { status: 400 }
        );
    }
    const signature =
        req.headers.get("kasera-signature-v1") ||
        req.headers.get("kasera-signature");
    if (!verifyKaseraSignature(raw, signature)) {
        return NextResponse.json(
            { ok: false, error: "Bad signature." },
            { status: 401 }
        );
    }

    let event: { type?: string; data?: Record<string, unknown> };
    try {
        event = JSON.parse(raw) as typeof event;
    } catch {
        return NextResponse.json({ ok: false, error: "Bad JSON." }, { status: 400 });
    }

    const handled = await applyKaseraEvent(
        event as Parameters<typeof applyKaseraEvent>[0]
    );
    return NextResponse.json({ ok: true, handled });
}
