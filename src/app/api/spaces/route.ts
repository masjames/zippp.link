// @implements FEAT-114
import { NextResponse } from "next/server";
import { requestUser } from "@/lib/auth/request-user";
import { loadWording } from "@/lib/content";
import { getAppLocale } from "@/lib/server-locale";
import { makeT } from "@/lib/t";
import {
  createSpace,
  listSpacesForUser,
  normalizeSpaceName,
} from "@/lib/space/space-store";

export const runtime = "nodejs";

function noStore(data: unknown, status = 200): NextResponse {
  const res = NextResponse.json(data, { status });
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export async function GET(req: Request) {
  const user = await requestUser(req);
  if (!user) return noStore({ ok: false, code: "UNAUTHORIZED" }, 401);

  const spaces = await listSpacesForUser(user.userId);
  return noStore({
    ok: true,
    spaces: spaces.map((s) => ({
      id: s.space_id,
      display_name: s.display_name,
      role: s.members.find((m) => m.user_id === user.userId)?.role ?? "member",
      member_count: s.members.length,
    })),
  });
}

export async function POST(req: Request) {
  const user = await requestUser(req);
  if (!user) return noStore({ ok: false, code: "UNAUTHORIZED" }, 401);

  let body: { display_name?: string };
  try {
    body = (await req.json()) as { display_name?: string };
  } catch {
    body = {};
  }

  const requested =
    typeof body.display_name === "string" ? body.display_name : "";
  let displayName = normalizeSpaceName(requested);
  if (!displayName) {
    const { lang } = await getAppLocale();
    displayName = makeT(loadWording(), lang)("app.space.defaultName");
  }

  try {
    const space = await createSpace({
      ownerUserId: user.userId,
      displayName,
      ownerEmail: user.email,
    });
    return noStore({
      ok: true,
      space: {
        id: space.space_id,
        display_name: space.display_name,
        role: "owner",
        member_count: space.members.length,
      },
    });
  } catch (err) {
    if (err instanceof Error && err.message === "INVALID_NAME") {
      return noStore({ ok: false, code: "INVALID_NAME" }, 400);
    }
    return noStore({ ok: false, code: "SERVER_ERROR" }, 500);
  }
}
