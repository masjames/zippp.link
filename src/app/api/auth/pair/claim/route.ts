import { NextResponse } from "next/server";
import { claimPairingCode } from "@/lib/auth/pairing-store";
import { issueMobileSession } from "@/lib/auth/issue-mobile-session";
import { mobileApiEnabled } from "@/lib/mobile/config";

export const runtime = "nodejs";

type ClaimBody = {
  pairing_code?: string;
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

  let body: ClaimBody;
  try {
    body = (await req.json()) as ClaimBody;
  } catch {
    return noStore({ ok: false, code: "INVALID_REQUEST" }, 400);
  }

  if (!body.pairing_code || typeof body.pairing_code !== "string") {
    return noStore({ ok: false, code: "INVALID_REQUEST" }, 400);
  }

  const result = await claimPairingCode(body.pairing_code, getClientIp(req));
  if (!result.ok) {
    if (result.error === "RATE_LIMITED") {
      return noStore({ ok: false, code: "RATE_LIMITED" }, 429);
    }
    if (result.error === "STORE_UNAVAILABLE") {
      return noStore({ ok: false, code: "STORE_UNAVAILABLE" }, 503);
    }
    return noStore({ ok: false, code: "INVALID_PAIRING_CODE" }, 401);
  }

  const session = await issueMobileSession({
    userId: result.data.userId,
    email: result.data.email,
    deviceId: body.device_id,
    deviceName: body.device_name,
    appVersion: body.app_version,
    platform: body.platform,
  });

  if (!session.ok) {
    const status =
      session.code === "DEVICE_CONFLICT"
        ? 409
        : session.code === "SERVER_MISCONFIGURED"
          ? 503
          : 503;
    return noStore({ ok: false, code: session.code }, status);
  }

  return noStore(session);
}
