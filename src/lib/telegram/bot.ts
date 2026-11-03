/**
 * Telegram Bot API client.
 * Low-level fetch wrapper for outbound Telegram messages.
 */

function botToken(): string | null {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  return token && token.trim() ? token.trim() : null;
}

function botUrl(method: string): string {
  const token = botToken();
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN not set");
  return `https://api.telegram.org/bot${token}/${method}`;
}

export function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function sendMessage(params: {
  chat_id: string | number;
  text: string;
  parse_mode?: "HTML" | "Markdown" | "MarkdownV2";
  disable_web_page_preview?: boolean;
}): Promise<void> {
  const token = botToken();
  if (!token) {
    console.log(
      JSON.stringify({ event: "telegram.bot.skipped", chat: params.chat_id })
    );
    return;
  }

  try {
    await fetch(botUrl("sendMessage"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: params.chat_id,
        text: params.text,
        // Only opt into HTML when the caller explicitly asks. Plain text is
        // safer for user-controlled values such as device names.
        parse_mode: params.parse_mode,
        disable_web_page_preview: params.disable_web_page_preview ?? true,
      }),
      cache: "no-store",
    });
  } catch (err) {
    console.error(
      JSON.stringify({
        event: "telegram.bot.failed",
        error: err instanceof Error ? err.message : String(err),
      })
    );
  }
}

function botUsername(): string {
  const username = (process.env.TELEGRAM_BOT_USERNAME || "zippp_bot").trim();
  return /^[A-Za-z0-9_]{5,32}$/.test(username) ? username : "zippp_bot";
}

/** Bot username for deep link construction. */
export function botDeepLink(startParam: string): string {
  return `https://t.me/${botUsername()}?start=${encodeURIComponent(startParam)}`;
}

/** Support deep link for a specific user. */
export function supportDeepLink(userId: string): string {
  const encoded = Buffer.from(userId).toString("base64url");
  return botDeepLink(`support_${encoded}`);
}
