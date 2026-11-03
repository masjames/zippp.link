// @implements FEAT-113
import { NextResponse } from "next/server";
import { consumeMagicLink } from "@/lib/auth/magic-link-store";
import { issueMobileSession } from "@/lib/auth/issue-mobile-session";
import { mobileApiEnabled } from "@/lib/mobile/config";

export const runtime = "nodejs";

type Body = {
  token?: string;
  device_name?: string;
  device_id?: string;
  app_version?: string;
  platform?: string;
};

function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

function noStore(data: unknown, status = 200): NextResponse {
  const res = NextResponse.json(data, { status });
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export async function POST(req: Request) {
  if (!mobileApiEnabled()) {
    return noStore({ ok: false, code: "NOT_FOUND" }, 404);
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return noStore({ ok: false, code: "INVALID_REQUEST" }, 400);
  }

  if (!body.token || typeof body.token !== "string") {
    return noStore({ ok: false, code: "INVALID_REQUEST" }, 400);
  }

  const claimed = await consumeMagicLink(body.token, getClientIp(req));
  if (!claimed.ok) {
    if (claimed.error === "RATE_LIMITED") {
      return noStore({ ok: false, code: "RATE_LIMITED" }, 429);
    }
    if (claimed.error === "STORE_UNAVAILABLE") {
      return noStore({ ok: false, code: "STORE_UNAVAILABLE" }, 503);
    }
    return noStore({ ok: false, code: "INVALID_MAGIC_LINK" }, 401);
  }

  const session = await issueMobileSession({
    userId: claimed.data.userId,
    email: claimed.data.email,
    deviceId: body.device_id,
    deviceName: body.device_name,
    appVersion: body.app_version,
    platform: body.platform,
  });

  if (!session.ok) {
    return noStore(
      { ok: false, code: session.code },
      session.code === "DEVICE_CONFLICT" ? 409 : 503
    );
  }

  return noStore(session);
}
