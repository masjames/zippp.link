import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { createPairingSession } from "@/lib/auth/pairing-store";
import { mobileApiEnabled } from "@/lib/mobile/config";

export const runtime = "nodejs";

export async function POST(_req: Request) {
  if (!mobileApiEnabled()) {
    return NextResponse.json({ ok: false, code: "NOT_FOUND" }, { status: 404 });
  }

  const user = await currentUser();
  if (!user.signedIn || !user.userId) {
    return NextResponse.json({ ok: false, code: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const session = await createPairingSession({
      userId: user.userId,
      email: user.email,
    });

    const res = NextResponse.json({
      ok: true,
      code: session.formatted,
      expires_at: session.expiresAt,
      qr_payload: session.qrPayload,
    });
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : "PAIRING_FAILED";
    if (message === "RATE_LIMITED") {
      return NextResponse.json({ ok: false, code: "RATE_LIMITED" }, { status: 429 });
    }
    if (message === "AUTH_STORE_UNAVAILABLE") {
      return NextResponse.json(
        { ok: false, code: "STORE_UNAVAILABLE" },
        { status: 503 }
      );
    }
    console.error("pair/generate error:", message);
    return NextResponse.json({ ok: false, code: "PAIRING_FAILED" }, { status: 500 });
  }
}
