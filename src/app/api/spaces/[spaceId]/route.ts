import { NextResponse } from "next/server";
import { requestUser } from "@/lib/auth/request-user";
import { getSpace, renameSpace } from "@/lib/space/space-store";

export const runtime = "nodejs";

function noStore(data: unknown, status = 200): NextResponse {
  const res = NextResponse.json(data, { status });
  res.headers.set("Cache-Control", "no-store");
  return res;
}

type Ctx = { params: Promise<{ spaceId: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const user = await requestUser(req);
  if (!user) return noStore({ ok: false, code: "UNAUTHORIZED" }, 401);
  const { spaceId } = await ctx.params;
  const space = await getSpace(spaceId);
  if (!space) return noStore({ ok: false, code: "NOT_FOUND" }, 404);
  const me = space.members.find((m) => m.user_id === user.userId);
  if (!me) return noStore({ ok: false, code: "FORBIDDEN" }, 403);
  return noStore({
    ok: true,
    space: {
      id: space.space_id,
      display_name: space.display_name,
      owner_user_id: space.owner_user_id,
      role: me.role,
      members: space.members.map((m) => ({
        user_id: m.user_id,
        email: m.email,
        role: m.role,
        joined_at: m.joined_at,
      })),
    },
  });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const user = await requestUser(req);
  if (!user) return noStore({ ok: false, code: "UNAUTHORIZED" }, 401);
  const { spaceId } = await ctx.params;
  let body: { display_name?: string };
  try {
    body = (await req.json()) as { display_name?: string };
  } catch {
    return noStore({ ok: false, code: "INVALID_REQUEST" }, 400);
  }
  try {
    const space = await renameSpace(
      spaceId,
      user.userId,
      typeof body.display_name === "string" ? body.display_name : ""
    );
    if (!space) return noStore({ ok: false, code: "NOT_FOUND" }, 404);
    return noStore({
      ok: true,
      space: { id: space.space_id, display_name: space.display_name },
    });
  } catch (err) {
    if (err instanceof Error && err.message === "FORBIDDEN") {
      return noStore({ ok: false, code: "FORBIDDEN" }, 403);
    }
    if (err instanceof Error && err.message === "INVALID_NAME") {
      return noStore({ ok: false, code: "INVALID_NAME" }, 400);
    }
    return noStore({ ok: false, code: "SERVER_ERROR" }, 500);
  }
}
