import { MailtrapClient } from "mailtrap";
import { loadWording } from "@/lib/content";
import { fill, makeT } from "@/lib/t";

/**
 * Mailtrap transactional email through the official Node SDK.
 *
 * Every message sends both an HTML body and a plain-text fallback. Production
 * sending uses the Sending API. Set `MAILTRAP_USE_SANDBOX=true` and
 * `MAILTRAP_INBOX_ID` to capture mail in a sandbox inbox instead (nothing is
 * delivered). A failure is logged and never blocks the action that triggered
 * the email. Check delivery at https://mailtrap.io/sending/email_logs
 */

const SITE = process.env.SITE_URL || "https://www.zippp.link";

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
    html?: string;
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
            html: input.html,
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

/* ------------------------------ HTML layout ----------------------------- */

function esc(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

/**
 * One shared layout for every zippp email. Inline styles only, because email
 * clients strip most external CSS. Colors match the app tokens.
 */
function wrapEmail(input: {
    title: string;
    paragraphs: string[];
    cta?: { label: string; url: string };
    footer: string;
}): string {
    const body = input.paragraphs
        .filter((p) => p.trim() !== "")
        .map(
            (p) =>
                `<p style="margin:0 0 16px;font-size:16px;line-height:24px;color:#1c0b09;">${esc(
                    p
                ).replace(/\n/g, "<br>")}</p>`
        )
        .join("");
    const cta = input.cta
        ? `<a href="${esc(input.cta.url)}" style="display:inline-block;background:#ee5329;color:#1c0b09;font-weight:700;text-decoration:none;padding:12px 24px;border-radius:999px;margin:8px 0 24px;">${esc(
              input.cta.label
          )}</a>`
        : "";
    const footer = `<p style="margin:0;font-size:14px;line-height:22px;color:#5e4640;">${esc(
        input.footer
    ).replace(/\n/g, "<br>")}</p>`;

    return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f3ede9;font-family:Inter,Arial,sans-serif;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:24px;padding:32px;">
      <div style="font-size:26px;font-weight:900;color:#ee5329;margin-bottom:24px;">zippp</div>
      <h1 style="margin:0 0 16px;font-size:24px;line-height:30px;color:#1c0b09;">${esc(
          input.title
      )}</h1>
      ${body}
      ${cta}
      ${footer}
      <p style="margin:24px 0 0;font-size:12px;color:#5e4640;">zippp.link</p>
    </div>
  </body>
</html>`;
}

/* -------------------------------- emails -------------------------------- */

/** Tell the user about a manual grant, with the admin's message. */
export async function sendGrantEmail(input: {
    to: string;
    message: string;
    credits: number;
}): Promise<boolean> {
    const t = makeT(loadWording(), "en");
    const subject = fill(t("email.grant.subject"), { credits: input.credits });
    const body = fill(t("email.grant.body"), {
        message: input.message,
        credits: input.credits,
    });
    const footer = t("email.footer");
    return sendMail({
        to: input.to,
        subject,
        text: `${body}\n\n${footer}`,
        html: wrapEmail({
            title: subject,
            paragraphs: body.split("\n\n"),
            cta: { label: t("email.cta.open"), url: `${SITE}/app` },
            footer,
        }),
    });
}

/** Exclusive invitation with a unique signup link and the lower minimum. */
export async function sendInviteEmail(input: {
    to: string;
    link: string;
    minIdr: number;
    normalIdr: number;
}): Promise<boolean> {
    const t = makeT(loadWording(), "en");
    const subject = t("email.invite.subject");
    const body = fill(t("email.invite.body"), {
        link: input.link,
        min: input.minIdr.toLocaleString("id-ID"),
        normal: input.normalIdr.toLocaleString("id-ID"),
    });
    const footer = t("email.footer");
    const paragraphs = body
        .split("\n\n")
        .filter((p) => !p.includes(input.link));
    return sendMail({
        to: input.to,
        subject,
        text: `${body}\n\n${footer}`,
        html: wrapEmail({
            title: subject,
            paragraphs,
            cta: { label: t("email.cta.accept"), url: input.link },
            footer,
        }),
    });
}
