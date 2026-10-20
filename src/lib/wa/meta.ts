import { createHmac, timingSafeEqual } from "node:crypto";
import {
    WA_GRAPH_BASE,
    waAccessToken,
    waAppSecret,
    waPhoneNumberId,
} from "./config";

export function verifyMetaSignature(
    rawBody: string,
    header: string | null
): boolean {
    if (!header?.startsWith("sha256=")) return false;
    const expected = createHmac("sha256", waAppSecret())
        .update(rawBody)
        .digest("hex");
    const got = header.slice("sha256=".length);
    try {
        return timingSafeEqual(
            Buffer.from(expected, "utf8"),
            Buffer.from(got, "utf8")
        );
    } catch {
        return false;
    }
}

type SendResult = { ok: boolean; id?: string; error?: string };

async function graphPost(
    path: string,
    body: Record<string, unknown>
): Promise<SendResult> {
    const url = `${WA_GRAPH_BASE}/${path}`;
    const res = await fetch(url, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${waAccessToken()}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => ({}))) as {
        messages?: { id?: string }[];
        error?: { message?: string };
    };
    if (!res.ok) {
        return {
            ok: false,
            error: json.error?.message ?? `Meta ${res.status}`,
        };
    }
    return { ok: true, id: json.messages?.[0]?.id };
}

export async function sendText(
    to: string,
    body: string
): Promise<SendResult> {
    return graphPost(`${waPhoneNumberId()}/messages`, {
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body },
    });
}

/** Review card with up to 3 reply buttons. */
export async function sendReviewButtons(
    to: string,
    body: string,
    buttons: { id: string; title: string }[]
): Promise<SendResult> {
    return graphPost(`${waPhoneNumberId()}/messages`, {
        messaging_product: "whatsapp",
        to,
        type: "interactive",
        interactive: {
            type: "button",
            body: { text: body.slice(0, 1024) },
            action: {
                buttons: buttons.slice(0, 3).map((b) => ({
                    type: "reply",
                    reply: {
                        id: b.id.slice(0, 256),
                        title: b.title.slice(0, 20),
                    },
                })),
            },
        },
    });
}

export async function sendCtaUrl(
    to: string,
    body: string,
    buttonLabel: string,
    url: string
): Promise<SendResult> {
    return graphPost(`${waPhoneNumberId()}/messages`, {
        messaging_product: "whatsapp",
        to,
        type: "interactive",
        interactive: {
            type: "cta_url",
            body: { text: body.slice(0, 1024) },
            action: {
                name: "cta_url",
                parameters: {
                    display_text: buttonLabel.slice(0, 20),
                    url,
                },
            },
        },
    });
}

/** Download inbound media bytes from Meta. */
export async function downloadMedia(mediaId: string): Promise<{
    bytes: Buffer;
    mime: string;
} | null> {
    const metaRes = await fetch(`${WA_GRAPH_BASE}/${mediaId}`, {
        headers: { Authorization: `Bearer ${waAccessToken()}` },
    });
    if (!metaRes.ok) return null;
    const meta = (await metaRes.json()) as { url?: string; mime_type?: string };
    if (!meta.url) return null;
    const bin = await fetch(meta.url, {
        headers: { Authorization: `Bearer ${waAccessToken()}` },
    });
    if (!bin.ok) return null;
    const ab = await bin.arrayBuffer();
    return {
        bytes: Buffer.from(ab),
        mime: meta.mime_type || "image/jpeg",
    };
}

export type InboundMessage = {
    waId: string;
    type: string;
    text?: string;
    imageId?: string;
    buttonId?: string;
    buttonTitle?: string;
};

export function parseInbound(payload: unknown): InboundMessage[] {
    const out: InboundMessage[] = [];
    const root = payload as {
        entry?: {
            changes?: {
                value?: {
                    messages?: {
                        from?: string;
                        type?: string;
                        text?: { body?: string };
                        image?: { id?: string };
                        interactive?: {
                            button_reply?: { id?: string; title?: string };
                            list_reply?: { id?: string; title?: string };
                        };
                    }[];
                };
            }[];
        }[];
    };
    for (const entry of root.entry ?? []) {
        for (const change of entry.changes ?? []) {
            for (const msg of change.value?.messages ?? []) {
                if (!msg.from) continue;
                const row: InboundMessage = {
                    waId: msg.from,
                    type: msg.type ?? "unknown",
                };
                if (msg.type === "text") row.text = msg.text?.body;
                if (msg.type === "image") row.imageId = msg.image?.id;
                if (msg.type === "interactive") {
                    const br = msg.interactive?.button_reply;
                    const lr = msg.interactive?.list_reply;
                    row.buttonId = br?.id ?? lr?.id;
                    row.buttonTitle = br?.title ?? lr?.title;
                }
                out.push(row);
            }
        }
    }
    return out;
}
