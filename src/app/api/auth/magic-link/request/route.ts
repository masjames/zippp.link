// @implements FEAT-113
import { NextResponse } from "next/server";
import { createMagicLink, normalizeEmail } from "@/lib/auth/magic-link-store";
import { userIdForEmail } from "@/lib/billing/ledger";
import { sendMail, mailtrapConfigured } from "@/lib/email";
import { mobileApiEnabled } from "@/lib/mobile/config";

export const runtime = "nodejs";

const SITE = process.env.SITE_URL || "https://www.zippp.link";

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

/**
 * Always returns ok:true when the request shape is valid (anti-enumeration).
 * Email is only sent when the address maps to an existing billing user.
 */
export async function POST(req: Request) {
  if (!mobileApiEnabled()) {
    return noStore({ ok: false, code: "NOT_FOUND" }, 404);
  }

  let body: { email?: string };
  try {
    body = (await req.json()) as { email?: string };
  } catch {
    return noStore({ ok: false, code: "INVALID_REQUEST" }, 400);
  }

  const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
  if (!email.includes("@") || email.length > 254) {
    return noStore({ ok: false, code: "INVALID_REQUEST" }, 400);
  }

  const userId = await userIdForEmail(email);
  if (!userId) {
    return noStore({ ok: true });
  }

  const created = await createMagicLink({
    userId,
    email,
    clientIp: getClientIp(req),
  });
  if (!created.ok) {
    if (created.error === "RATE_LIMITED") {
      return noStore({ ok: false, code: "RATE_LIMITED" }, 429);
    }
    return noStore({ ok: false, code: "STORE_UNAVAILABLE" }, 503);
  }

  if (mailtrapConfigured()) {
    const verifyUrl = `${SITE}/api/auth/magic-link/verify?token=${encodeURIComponent(created.token)}`;
    const deep = `zippp://auth?token=${encodeURIComponent(created.token)}`;
    void sendMail({
      to: email,
      subject: "Zippp sign-in link",
      text: `Open this link on your phone to sign in to Zippp:\n\n${verifyUrl}\n\nOr open the app:\n${deep}\n\nExpires in 15 minutes.`,
      html: `<p>Open this link on your phone to sign in to Zippp:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p><p>Or open the app: <a href="${deep}">${deep}</a></p><p>Expires in 15 minutes.</p>`,
    });
  }

  return noStore({ ok: true });
}
