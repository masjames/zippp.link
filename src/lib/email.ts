import { MailtrapClient } from "mailtrap";
import { loadWording } from "@/lib/content";
import { fill, makeT } from "@/lib/t";

/**
 * Mailtrap transactional email through the official Node SDK.
 *
 * Production sending uses the Sending API. Set `MAILTRAP_USE_SANDBOX=true` and
 * `MAILTRAP_INBOX_ID` to capture mail in a sandbox inbox instead (nothing is
 * delivered). A failure is logged and never blocks the action that triggered
 * the email. Check delivery at https://mailtrap.io/sending/email_logs
 */

let cachedClient: MailtrapClient | null = null;
let cachedKey = "";

function clientFor(token: string): MailtrapClient {
    const sandbox = process.env.MAILTRAP_USE_SANDBOX === "true";
    const inboxId = Number(process.env.MAILTRAP_INBOX_ID) || undefined;
    const key = `${token}:${sandbox}:${inboxId ?? ""}`;
    if (!cachedClient || cachedKey !== key) {
        cachedClient = new MailtrapClient({
            token,
            sandbox,
            testInboxId: inboxId,
        });
        cachedKey = key;
    }
    return cachedClient;
}

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

    try {
        await clientFor(token).send({
            from: {
                email: from,
                name: process.env.MAILTRAP_FROM_NAME || "zippp",
            },
            to: [{ email: input.to }],
            subject: input.subject,
            text: input.text,
            category: "zippp",
        });
        return true;
    } catch (err) {
        console.error(
            JSON.stringify({
                event: "mailtrap.failed",
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
