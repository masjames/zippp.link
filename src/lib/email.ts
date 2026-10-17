import { loadWording } from "@/lib/content";
import { fill, makeT } from "@/lib/t";

/**
 * Mailtrap transactional email.
 *
 * Real delivery uses the Mailtrap Sending API. Set `MAILTRAP_INBOX_ID` to use a
 * sandbox inbox instead (nothing is delivered). A failure is logged and never
 * blocks the action that triggered the email.
 */

export function mailtrapConfigured(): boolean {
    return Boolean(
        process.env.MAILTRAP_API_TOKEN && process.env.MAILTRAP_FROM_EMAIL
    );
}

export async function sendMail(input: {
    to: string;
    subject: string;
    text: string;
}): Promise<boolean> {
    const token = process.env.MAILTRAP_API_TOKEN;
    const from = process.env.MAILTRAP_FROM_EMAIL;
    if (!token || !from) return false;
    const inbox = process.env.MAILTRAP_INBOX_ID;
    const url = inbox
        ? `https://sandbox.api.mailtrap.io/api/send/${encodeURIComponent(inbox)}`
        : "https://send.api.mailtrap.io/api/send";
    try {
        const res = await fetch(url, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                from: {
                    email: from,
                    name: process.env.MAILTRAP_FROM_NAME || "zippp",
                },
                to: [{ email: input.to }],
                subject: input.subject,
                text: input.text,
                category: "zippp",
            }),
        });
        if (!res.ok) {
            console.error(
                JSON.stringify({
                    event: "mailtrap.failed",
                    status: res.status,
                })
            );
            return false;
        }
        return true;
    } catch (err) {
        console.error(
            JSON.stringify({
                event: "mailtrap.error",
                error: err instanceof Error ? err.message : String(err),
            })
        );
        return false;
    }
}

/** Tell the user about a manual grant, with the admin's message. */
export async function sendGrantEmail(input: {
    to: string;
    message: string;
    credits: number;
}): Promise<boolean> {
    const t = makeT(loadWording(), "en");
    return sendMail({
        to: input.to,
        subject: fill(t("email.grant.subject"), { credits: input.credits }),
        text: fill(t("email.grant.body"), {
            message: input.message,
            credits: input.credits,
        }),
    });
}
