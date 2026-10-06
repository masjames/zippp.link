/** Admin alerts. A Telegram failure never blocks the caller. */
export async function sendTelegram(text: string): Promise<void> {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chat = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chat) {
        console.log(
            JSON.stringify({ event: "telegram.skipped", text: text.slice(0, 140) })
        );
        return;
    }
    try {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: chat,
                text,
                parse_mode: "HTML",
                disable_web_page_preview: true,
            }),
            cache: "no-store",
        });
    } catch (err) {
        console.error(
            JSON.stringify({
                event: "telegram.failed",
                error: err instanceof Error ? err.message : String(err),
            })
        );
    }
}
