import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import {
  consumeLinkToken,
  deduplicateUpdate,
  getUserIdForChat,
  linkUserToChat,
  unlinkUser,
} from "@/lib/telegram/store";
import { sendMessage } from "@/lib/telegram/bot";
import { balance } from "@/lib/billing/ledger";
import { billingConfigured } from "@/lib/billing/redis";
import { loadWorkspaceForUser } from "@/lib/google/workspace-store";
import { loadWording } from "@/lib/content";
import { fill, makeT } from "@/lib/t";

export const runtime = "nodejs";
export const maxDuration = 30;

type TelegramUpdate = {
  update_id?: number;
  message?: {
    message_id?: number;
    from?: { id?: number };
    chat?: { id?: number; type?: string };
    text?: string;
  };
};

function translator() {
  return makeT(loadWording(), "id");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function POST(req: Request) {
  const secret = (process.env.TELEGRAM_WEBHOOK_SECRET || "").trim();
  if (!secret) {
    return NextResponse.json({ ok: false, error: "WEBHOOK_NOT_CONFIGURED" }, { status: 503 });
  }
  const header = req.headers.get("x-telegram-bot-api-secret-token") || "";
  if (!safeEqual(header, secret)) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  const raw = await req.text();
  let update: TelegramUpdate;
  try {
    update = JSON.parse(raw) as TelegramUpdate;
  } catch {
    return NextResponse.json({ ok: false, error: "BAD_JSON" }, { status: 400 });
  }

  if (typeof update.update_id !== "number") {
    return NextResponse.json({ ok: true, ignored: true });
  }

  try {
    const isNew = await deduplicateUpdate(update.update_id);
    if (!isNew) return NextResponse.json({ ok: true, duplicate: true });
  } catch {
    return NextResponse.json({ ok: false, error: "STORE_UNAVAILABLE" }, { status: 503 });
  }

  const message = update.message;
  const text = (message?.text || "").trim();
  const chatId = message?.chat?.id;
  const chatType = message?.chat?.type;
  if (!message || !chatId || !chatType || !text) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  // Account commands are private-chat only. A group chat must never receive
  // another user's balance or sheet title.
  if (chatType !== "private") {
    return NextResponse.json({ ok: true, ignored: "not_private" });
  }

  const chat = String(chatId);
  const t = translator();

  if (text.startsWith("/start")) {
    const payload = text.slice("/start".length).trim();
    if (payload.startsWith("link_")) {
      const token = payload.slice("link_".length);
      const userId = await consumeLinkToken(token);
      if (!userId) {
        await sendMessage({ chat_id: chat, text: t("telegram.link_expired") });
        return NextResponse.json({ ok: true });
      }
      const linked = await linkUserToChat(userId, chat);
      if (!linked.ok) {
        await sendMessage({
          chat_id: chat,
          text:
            linked.error === "CHAT_ALREADY_LINKED"
              ? t("telegram.link_conflict")
              : t("telegram.not_linked"),
        });
        return NextResponse.json({ ok: true });
      }
      await sendMessage({ chat_id: chat, text: t("telegram.linked") });
      return NextResponse.json({ ok: true });
    }

    await sendMessage({ chat_id: chat, text: t("telegram.not_linked") });
    return NextResponse.json({ ok: true });
  }

  const userId = await getUserIdForChat(chat);

  if (text.startsWith("/saldo") || text.startsWith("/balance")) {
    if (!userId) {
      await sendMessage({ chat_id: chat, text: t("telegram.not_linked") });
      return NextResponse.json({ ok: true });
    }
    const credits = billingConfigured() ? (await balance(userId)).credits : 0;
    const workspace = await loadWorkspaceForUser(userId);
    await sendMessage({
      chat_id: chat,
      text: fill(t("telegram.balance"), {
        count: credits,
        sheet: workspace?.spreadsheet_title ?? "-",
      }),
    });
    return NextResponse.json({ ok: true });
  }

  if (text.startsWith("/bantuan") || text.startsWith("/help")) {
    await sendMessage({ chat_id: chat, text: t("telegram.help") });
    return NextResponse.json({ ok: true });
  }

  if (text.startsWith("/unlink")) {
    if (!userId) {
      await sendMessage({ chat_id: chat, text: t("telegram.not_linked") });
      return NextResponse.json({ ok: true });
    }
    await unlinkUser(userId);
    await sendMessage({ chat_id: chat, text: t("telegram.unlinked") });
    return NextResponse.json({ ok: true });
  }

  await sendMessage({ chat_id: chat, text: t("telegram.help") });
  return NextResponse.json({ ok: true });
}
