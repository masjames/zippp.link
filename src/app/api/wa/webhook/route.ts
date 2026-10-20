import { NextResponse } from "next/server";
import {
    waChannelEnabled,
    waConfigured,
    waVerifyToken,
} from "@/lib/wa/config";
import { handleWaWebhookBody } from "@/lib/wa/handler";
import { verifyMetaSignature } from "@/lib/wa/meta";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Meta webhook verification handshake. */
export async function GET(req: Request) {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (
        mode === "subscribe" &&
        token &&
        token === waVerifyToken() &&
        challenge
    ) {
        return new NextResponse(challenge, { status: 200 });
    }
    return NextResponse.json({ ok: false }, { status: 403 });
}

/**
 * Inbound WhatsApp events. Always 200 quickly when signature ok so Meta
 * does not retry-storm; work runs in-request with maxDuration 60.
 */
export async function POST(req: Request) {
    if (!waChannelEnabled() || !waConfigured()) {
        return NextResponse.json({ ok: true, disabled: true });
    }

    const rawBody = await req.text();
    const sig = req.headers.get("x-hub-signature-256");
    if (!verifyMetaSignature(rawBody, sig)) {
        return NextResponse.json({ ok: false }, { status: 401 });
    }

    // Process before responding when possible; Meta retries on non-2xx only.
    await handleWaWebhookBody(rawBody);
    return NextResponse.json({ ok: true });
}
