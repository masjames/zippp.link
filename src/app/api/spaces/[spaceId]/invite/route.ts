import { NextResponse } from "next/server";
import { requestUser } from "@/lib/auth/request-user";
import { loadWording } from "@/lib/content";
import { mailtrapConfigured, sendMail } from "@/lib/email";
import { getAppLocale } from "@/lib/server-locale";
import { absoluteUrl } from "@/lib/site";
import { createInvite } from "@/lib/space/invite-store";
import { getSpace, normalizeEmail } from "@/lib/space/space-store";
import { fill, makeT } from "@/lib/t";

export const runtime = "nodejs";

function noStore(data: unknown, status = 200): NextResponse {
  const res = NextResponse.json(data, { status });
  res.headers.set("Cache-Control", "no-store");
  return res;
}

type Ctx = { params: Promise<{ spaceId: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const user = await requestUser(req);
  if (!user) return noStore({ ok: false, code: "UNAUTHORIZED" }, 401);
  const { spaceId } = await ctx.params;
  const space = await getSpace(spaceId);
  if (!space) return noStore({ ok: false, code: "NOT_FOUND" }, 404);
  if (space.owner_user_id !== user.userId) {
    return noStore({ ok: false, code: "FORBIDDEN" }, 403);
  }

  let body: { email?: string };
  try {
    body = (await req.json()) as { email?: string };
  } catch {
    body = {};
  }

  const rawEmail = typeof body.email === "string" ? body.email.trim() : "";
  const email = normalizeEmail(rawEmail);
  if (rawEmail && !email) {
    return noStore({ ok: false, code: "INVALID_EMAIL" }, 400);
  }

  const { code, invite } = await createInvite({
    spaceId,
    createdBy: user.userId,
    email,
  });
  const path = `/join?code=${encodeURIComponent(code)}`;

  let emailed = false;
  if (email && mailtrapConfigured()) {
    const { lang } = await getAppLocale();
    const t = makeT(loadWording(), lang);
    const link = absoluteUrl(path);
    const values = { name: space.display_name, link };
    emailed = await sendMail({
      to: email,
      subject: fill(t("app.space.invite.emailSubject"), values),
      text: fill(t("app.space.invite.emailBody"), values),
    });
  }

  return noStore({
    ok: true,
    code,
    path,
    emailed,
    expires_at: Math.floor(invite.expires_at / 1000),
  });
}
