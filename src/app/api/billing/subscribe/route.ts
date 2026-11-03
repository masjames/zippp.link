// @implements FEAT-117
import { NextResponse } from "next/server";
import { requestUser } from "@/lib/auth/request-user";
import { createSubscriptionCheckout } from "@/lib/billing/paddle";

export const runtime = "nodejs";

/** Web-only plan checkout. Android never calls this. */
export async function POST(req: Request) {
  const user = await requestUser(req);
  if (!user) {
    return NextResponse.json({ ok: false, code: "UNAUTHORIZED" }, { status: 401 });
  }

  const url = await createSubscriptionCheckout({
    userId: user.userId,
    email: user.email,
  });
  if (!url) {
    return NextResponse.json(
      { ok: false, code: "PLAN_NOT_CONFIGURED" },
      { status: 503 }
    );
  }

  const res = NextResponse.json({ ok: true, url });
  res.headers.set("Cache-Control", "no-store");
  return res;
}
