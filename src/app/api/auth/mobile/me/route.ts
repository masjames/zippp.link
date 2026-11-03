import { NextResponse } from "next/server";
import { resolveBearerUser } from "@/lib/auth/mobile-auth";
import { mobileApiEnabled } from "@/lib/mobile/config";
import { listSpacesForUser } from "@/lib/space/space-store";

export const runtime = "nodejs";

function noStore(data: unknown, status = 200): NextResponse {
  const res = NextResponse.json(data, { status });
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export async function GET(req: Request) {
  if (!mobileApiEnabled()) {
    return noStore({ ok: false, code: "NOT_FOUND" }, 404);
  }

  const auth = await resolveBearerUser(req);
  if (!auth.user) {
    const status =
      auth.error === "DEVICE_REVOKED"
        ? 401
        : auth.error === "SERVER_MISCONFIGURED"
          ? 503
          : 401;
    return noStore({ ok: false, code: auth.error }, status);
  }

  let spaces: Array<{ id: string; display_name: string; role: string }> = [];
  try {
    spaces = (await listSpacesForUser(auth.user.userId)).map((s) => ({
      id: s.space_id,
      display_name: s.display_name,
      role:
        s.members.find((m) => m.user_id === auth.user!.userId)?.role ?? "member",
    }));
  } catch {
    spaces = [];
  }

  return noStore({
    ok: true,
    user: { email: auth.user.email },
    device_id: auth.user.deviceId,
    spaces,
  });
}
