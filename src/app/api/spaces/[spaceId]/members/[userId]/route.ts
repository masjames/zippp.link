import { NextResponse } from "next/server";
import { requestUser } from "@/lib/auth/request-user";
import { removeMember } from "@/lib/space/space-store";

export const runtime = "nodejs";

function noStore(data: unknown, status = 200): NextResponse {
  const res = NextResponse.json(data, { status });
  res.headers.set("Cache-Control", "no-store");
  return res;
}

type Ctx = { params: Promise<{ spaceId: string; userId: string }> };

export async function DELETE(req: Request, ctx: Ctx) {
  const user = await requestUser(req);
  if (!user) return noStore({ ok: false, code: "UNAUTHORIZED" }, 401);
  const { spaceId, userId } = await ctx.params;

  try {
    const space = await removeMember(spaceId, user.userId, userId);
    if (!space) return noStore({ ok: false, code: "NOT_FOUND" }, 404);
    return noStore({ ok: true, member_count: space.members.length });
  } catch (err) {
    if (err instanceof Error && err.message === "FORBIDDEN") {
      return noStore({ ok: false, code: "FORBIDDEN" }, 403);
    }
    if (err instanceof Error && err.message === "CANNOT_REMOVE_OWNER") {
      return noStore({ ok: false, code: "CANNOT_REMOVE_OWNER" }, 400);
    }
    return noStore({ ok: false, code: "SERVER_ERROR" }, 500);
  }
}
