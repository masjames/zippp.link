import { NextResponse } from "next/server";
import { clearSession } from "@/lib/google/session";
import { deleteTokens } from "@/lib/google/token-store";
import { deleteWorkspace } from "@/lib/google/workspace-store";
import { resolveRequestUser } from "@/lib/auth/request-user";
import { revokeDevice } from "@/lib/auth/device-store";

export const runtime = "nodejs";

export async function GET(req: Request) {
  await deleteTokens();
  await deleteWorkspace();
  const url = new URL("/", req.url);
  url.searchParams.set("auth", "logged_out");
  const res = NextResponse.redirect(url);
  clearSession(res);
  return res;
}

export async function POST(req: Request) {
  const hasBearer = Boolean(
    req.headers.get("authorization")?.toLowerCase().startsWith("bearer ")
  );

  // Mobile logout: revoke this device, then tell the client to clear its token.
  if (hasBearer) {
    try {
      const { user } = await resolveRequestUser(req);
      if (user?.source === "mobile" && user.deviceId) {
        await revokeDevice(user.deviceId, user.userId);
        return NextResponse.json({ ok: true });
      }
      return NextResponse.json({ ok: false, code: "INVALID_TOKEN" }, { status: 401 });
    } catch {
      return NextResponse.json(
        { ok: false, code: "STORE_UNAVAILABLE" },
        { status: 503 }
      );
    }
  }

  // Web logout must not depend on a token-store read. Clearing the cookie is
  // the most important part, and it must happen even if a remote store is down.
  try {
    await deleteTokens();
    await deleteWorkspace();
  } catch (err) {
    console.error(
      JSON.stringify({
        event: "auth.logout.store_failed",
        error: err instanceof Error ? err.message : String(err),
      })
    );
  }
  const res = NextResponse.json({ ok: true, signedIn: false });
  clearSession(res);
  return res;
}
