import { NextResponse } from "next/server";
import {
    waChannelEnabled,
    waConfigured,
    waProvider,
    waVerifyToken,
} from "@/lib/wa/config";
import {
    handleInboundMessages,
    handleWaWebhookBody,
} from "@/lib/wa/handler";
import { verifyMetaSignature } from "@/lib/wa/meta";
import {
    parseTwilioForm,
    verifyTwilioSignature,
} from "@/lib/wa/twilio";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Meta webhook verification handshake (unused for Twilio). */
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
 * Inbound WhatsApp events.
 * - Meta: JSON + X-Hub-Signature-256
 * - Twilio: form POST + X-Twilio-Signature
 * Always 200 when signature ok so providers do not retry-storm.
 */
export async function POST(req: Request) {
    if (!waChannelEnabled() || !waConfigured()) {
        return NextResponse.json({ ok: true, disabled: true });
    }

    if (waProvider() === "twilio") {
        return handleTwilioPost(req);
    }

    const rawBody = await req.text();
    const sig = req.headers.get("x-hub-signature-256");
    if (!verifyMetaSignature(rawBody, sig)) {
        return NextResponse.json({ ok: false }, { status: 401 });
    }

    await handleWaWebhookBody(rawBody);
    return NextResponse.json({ ok: true });
}

async function handleTwilioPost(req: Request): Promise<Response> {
    const rawBody = await req.text();
    const params = Object.fromEntries(new URLSearchParams(rawBody));
    const url = webhookPublicUrl(req);
    const sig = req.headers.get("x-twilio-signature");
    if (!verifyTwilioSignature(url, params, sig)) {
        return NextResponse.json({ ok: false }, { status: 401 });
    }

    const msg = parseTwilioForm(params);
    if (msg) {
        await handleInboundMessages([msg]);
    }
    // Empty 200 — replies go out via REST, not TwiML.
    return new NextResponse(null, { status: 200 });
}

/** Exact public URL Twilio signed (respects reverse-proxy host headers). */
function webhookPublicUrl(req: Request): string {
    const proto =
        req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
    const host =
        req.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
        req.headers.get("host") ||
        new URL(req.url).host;
    const path = new URL(req.url).pathname;
    return `${proto}://${host}${path}`;
}
