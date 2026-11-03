import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import {
  createLinkToken,
  getChatIdForUser,
  unlinkUser,
} from "@/lib/telegram/store";
import { botDeepLink } from "@/lib/telegram/bot";

export const runtime = "nodejs";

export async function GET() {
  const user = await currentUser();
  if (!user.signedIn || !user.userId) {
    return NextResponse.json({ ok: false, code: "UNAUTHORIZED" }, { status: 401 });
  }
  const chatId = await getChatIdForUser(user.userId);
  return NextResponse.json({ ok: true, linked: Boolean(chatId) });
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user.signedIn || !user.userId) {
    return NextResponse.json({ ok: false, code: "UNAUTHORIZED" }, { status: 401 });
  }

  let action = "start";
  try {
    const body = (await req.json()) as { action?: string };
    if (body.action) action = body.action;
  } catch {
    /* start */
  }

  if (action === "unlink") {
    await unlinkUser(user.userId);
    return NextResponse.json({ ok: true, linked: false });
  }

  try {
    const token = await createLinkToken(user.userId);
    return NextResponse.json({
      ok: true,
      url: botDeepLink(`link_${token}`),
      expires_in: 600,
    });
  } catch {
    return NextResponse.json(
      { ok: false, code: "STORE_UNAVAILABLE" },
      { status: 503 }
    );
  }
}
