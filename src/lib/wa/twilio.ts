import { createHmac, timingSafeEqual } from "node:crypto";
import {
    twilioAccountSid,
    twilioAuthToken,
    twilioContentSidReview,
    twilioWhatsAppFrom,
} from "./config";
import type { InboundMessage } from "./meta";

type SendResult = { ok: boolean; id?: string; error?: string };

/** Digits-only wa id (matches Meta Cloud API `from`). */
export function normalizeTwilioWaId(from: string): string {
    return from.replace(/^whatsapp:/i, "").replace(/\D/g, "");
}

export function twilioToAddress(waId: string): string {
    const digits = waId.replace(/\D/g, "");
    return `whatsapp:+${digits}`;
}

/**
 * Validate X-Twilio-Signature (form POST).
 * @see https://www.twilio.com/docs/usage/webhooks/webhooks-security
 */
export function verifyTwilioSignature(
    url: string,
    params: Record<string, string>,
    signature: string | null
): boolean {
    if (!signature) return false;
    const token = twilioAuthToken();
    if (!token) return false;

    const sorted = Object.keys(params).sort();
    let data = url;
    for (const key of sorted) {
        data += key + params[key];
    }
    const expected = createHmac("sha1", token).update(data, "utf8").digest("base64");
    try {
        const a = Buffer.from(expected, "utf8");
        const b = Buffer.from(signature, "utf8");
        if (a.length !== b.length) return false;
        return timingSafeEqual(a, b);
    } catch {
        return false;
    }
}

export function parseTwilioForm(
    params: Record<string, string>
): InboundMessage | null {
    const from = params.From;
    if (!from) return null;
    const waId = normalizeTwilioWaId(from);

    const buttonPayload = params.ButtonPayload?.trim();
    if (buttonPayload) {
        return {
            waId,
            type: "interactive",
            buttonId: buttonPayload,
            buttonTitle: params.ButtonText,
            text: params.Body,
        };
    }

    const numMedia = Number(params.NumMedia ?? "0");
    if (Number.isFinite(numMedia) && numMedia > 0 && params.MediaUrl0) {
        const mime = params.MediaContentType0 ?? "";
        if (!mime || mime.startsWith("image/")) {
            return {
                waId,
                type: "image",
                imageId: params.MediaUrl0,
                text: params.Body,
            };
        }
    }

    const body = params.Body?.trim();
    if (body) {
        return { waId, type: "text", text: body };
    }

    return null;
}

async function twilioPost(
    fields: Record<string, string>
): Promise<SendResult> {
    const sid = twilioAccountSid();
    const token = twilioAuthToken();
    if (!sid || !token) {
        return { ok: false, error: "Twilio not configured" };
    }
    const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
    const body = new URLSearchParams(fields);
    const auth = Buffer.from(`${sid}:${token}`).toString("base64");
    const res = await fetch(url, {
        method: "POST",
        headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
    });
    const json = (await res.json().catch(() => ({}))) as {
        sid?: string;
        message?: string;
        error_message?: string;
    };
    if (!res.ok) {
        return {
            ok: false,
            error: json.message ?? json.error_message ?? `Twilio ${res.status}`,
        };
    }
    return { ok: true, id: json.sid };
}

export async function sendTwilioText(
    to: string,
    body: string
): Promise<SendResult> {
    return twilioPost({
        From: twilioWhatsAppFrom(),
        To: twilioToAddress(to),
        Body: body.slice(0, 1600),
    });
}

/**
 * Review card: Content template quick-replies when SID set; else freeform
 * text with Terima / Ubah / Buang (handler maps replies via last draft).
 */
export async function sendTwilioReviewButtons(
    to: string,
    body: string,
    buttons: { id: string; title: string }[]
): Promise<SendResult> {
    const contentSid = twilioContentSidReview();
    if (contentSid) {
        const vars: Record<string, string> = { "1": body.slice(0, 1024) };
        // Content variables are template-specific; payload ids go in Body fallback.
        const contentVars = JSON.stringify(vars);
        const result = await twilioPost({
            From: twilioWhatsAppFrom(),
            To: twilioToAddress(to),
            ContentSid: contentSid,
            ContentVariables: contentVars,
        });
        if (result.ok) return result;
        // Fall through to freeform if Content API rejects.
    }

    const lines = buttons
        .slice(0, 3)
        .map((b) => `• ${b.title}`)
        .join("\n");
    const text = `${body.slice(0, 1400)}\n\nBalas: Terima / Ubah / Buang\n${lines}`;
    return sendTwilioText(to, text);
}

export async function sendTwilioCtaUrl(
    to: string,
    body: string,
    buttonLabel: string,
    url: string
): Promise<SendResult> {
    return sendTwilioText(to, `${body}\n\n${buttonLabel}: ${url}`);
}

/** Download inbound media from Twilio MediaUrl (Basic auth). */
export async function downloadTwilioMedia(mediaUrl: string): Promise<{
    bytes: Buffer;
    mime: string;
} | null> {
    const sid = twilioAccountSid();
    const token = twilioAuthToken();
    if (!sid || !token || !mediaUrl) return null;
    const auth = Buffer.from(`${sid}:${token}`).toString("base64");
    const res = await fetch(mediaUrl, {
        headers: { Authorization: `Basic ${auth}` },
        redirect: "follow",
    });
    if (!res.ok) return null;
    const mime = res.headers.get("content-type") || "image/jpeg";
    const ab = await res.arrayBuffer();
    return { bytes: Buffer.from(ab), mime };
}
