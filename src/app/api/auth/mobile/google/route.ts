// @implements FEAT-113
import { NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import { issueMobileSession } from "@/lib/auth/issue-mobile-session";
import { mobileApiEnabled } from "@/lib/mobile/config";

export const runtime = "nodejs";

type Body = {
  id_token?: string;
  device_name?: string;
  device_id?: string;
  app_version?: string;
  platform?: string;
};

function noStore(data: unknown, status = 200): NextResponse {
  const res = NextResponse.json(data, { status });
  res.headers.set("Cache-Control", "no-store");
  return res;
}

function audience(): string[] {
  const ids = [
    process.env.GOOGLE_ANDROID_CLIENT_ID,
    process.env.GOOGLE_CLIENT_ID,
  ].filter((v): v is string => Boolean(v && v.trim()));
  return ids;
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

  if (!body.id_token || typeof body.id_token !== "string") {
    return noStore({ ok: false, code: "INVALID_REQUEST" }, 400);
  }

  const aud = audience();
  if (aud.length === 0) {
    return noStore({ ok: false, code: "SERVER_MISCONFIGURED" }, 503);
  }

  let userId: string;
  let email: string | null = null;
  try {
    const client = new OAuth2Client();
    const ticket = await client.verifyIdToken({
      idToken: body.id_token,
      audience: aud,
    });
    const payload = ticket.getPayload();
    if (!payload?.sub) {
      return noStore({ ok: false, code: "INVALID_TOKEN" }, 401);
    }
    userId = payload.sub;
    email = payload.email ?? null;
  } catch {
    return noStore({ ok: false, code: "INVALID_TOKEN" }, 401);
  }

  const session = await issueMobileSession({
    userId,
    email,
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
