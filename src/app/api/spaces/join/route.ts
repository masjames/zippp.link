import { NextResponse } from "next/server";
import { requestUser } from "@/lib/auth/request-user";
import { readInvite } from "@/lib/space/invite-store";
import { getSpace, joinSpaceByInvite } from "@/lib/space/space-store";

export const runtime = "nodejs";

function noStore(data: unknown, status = 200): NextResponse {
  const res = NextResponse.json(data, { status });
  res.headers.set("Cache-Control", "no-store");
  return res;
}

function codeFrom(value: string | null): string {
  return (value || "").trim();
}

/** Preview an invite for the join page. Does not consume it. */
export async function GET(req: Request) {
  const code = codeFrom(new URL(req.url).searchParams.get("code"));
  if (!code) return noStore({ ok: false, code: "MISSING_CODE" }, 400);

  const invite = await readInvite(code);
  if (!invite) return noStore({ ok: false, code: "INVALID_INVITE" }, 404);

  const space = await getSpace(invite.space_id);
  if (!space) return noStore({ ok: false, code: "INVALID_INVITE" }, 404);

  return noStore({
    ok: true,
    space: { display_name: space.display_name },
    email_bound: Boolean(invite.email),
  });
}

export async function POST(req: Request) {
  const user = await requestUser(req);
  if (!user) return noStore({ ok: false, code: "UNAUTHORIZED" }, 401);

  let body: { code?: string };
  try {
    body = (await req.json()) as { code?: string };
  } catch {
    return noStore({ ok: false, code: "INVALID_REQUEST" }, 400);
  }
  const code = codeFrom(typeof body.code === "string" ? body.code : "");
  if (!code) return noStore({ ok: false, code: "MISSING_CODE" }, 400);

  try {
    const { space, alreadyMember } = await joinSpaceByInvite({
      code,
      userId: user.userId,
      email: user.email,
    });
    return noStore({
      ok: true,
      already_member: alreadyMember,
      space: {
        id: space.space_id,
        display_name: space.display_name,
        role: space.members.find((m) => m.user_id === user.userId)?.role,
      },
    });
  } catch (err) {
    if (!(err instanceof Error)) {
      return noStore({ ok: false, code: "SERVER_ERROR" }, 500);
    }
    if (err.message === "INVALID_INVITE") {
      return noStore({ ok: false, code: "INVALID_INVITE" }, 404);
    }
    if (err.message === "INVITE_EMAIL_MISMATCH") {
      return noStore({ ok: false, code: "INVITE_EMAIL_MISMATCH" }, 403);
    }
    if (err.message === "SPACE_NOT_FOUND") {
      return noStore({ ok: false, code: "SPACE_NOT_FOUND" }, 404);
    }
    return noStore({ ok: false, code: "SERVER_ERROR" }, 500);
  }
}
