import { NextResponse } from "next/server";
import { requestUser } from "@/lib/auth/request-user";
import { leaveSpace } from "@/lib/space/space-store";

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
  try {
    const space = await leaveSpace(spaceId, user.userId);
    if (!space) return noStore({ ok: false, code: "NOT_FOUND" }, 404);
    return noStore({ ok: true });
  } catch (err) {
    if (err instanceof Error && err.message === "OWNER_CANNOT_LEAVE") {
      return noStore({ ok: false, code: "OWNER_CANNOT_LEAVE" }, 400);
    }
    return noStore({ ok: false, code: "SERVER_ERROR" }, 500);
  }
}
