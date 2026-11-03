// @implements FEAT-115
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { resolveBearerUser } from "@/lib/auth/mobile-auth";
import { mobileApiEnabled } from "@/lib/mobile/config";
import { recordScanOwner } from "@/lib/mobile/scan-store";

export const runtime = "nodejs";

/**
 * Issue a scan id for manual entry. Append still requires an owned scan id, so
 * credits and idempotency behave exactly like a camera scan. No receipt data is
 * sent here.
 */
export async function POST(req: Request) {
  if (!mobileApiEnabled()) {
    return NextResponse.json({ ok: false, code: "NOT_FOUND" }, { status: 404 });
  }

  const auth = await resolveBearerUser(req);
  if (!auth.user) {
    const status =
      auth.error === "DEVICE_REVOKED"
        ? 401
        : auth.error === "SERVER_MISCONFIGURED"
          ? 503
          : 401;
    return NextResponse.json({ ok: false, code: auth.error }, { status });
  }

  const scanId = randomUUID();
  try {
    await recordScanOwner(auth.user.userId, scanId);
  } catch {
    return NextResponse.json(
      { ok: false, code: "SCAN_ISSUE_FAILED" },
      { status: 503 }
    );
  }

  const res = NextResponse.json({ ok: true, scanId });
  res.headers.set("Cache-Control", "no-store");
  return res;
}
