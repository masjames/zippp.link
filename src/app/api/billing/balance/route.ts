import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { balance, loadUser } from "@/lib/billing/ledger";
import { billingConfigured } from "@/lib/billing/redis";

export const runtime = "nodejs";

export async function GET() {
  const user = await currentUser();
  if (!user.signedIn || !user.userId) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }

  const configured = billingConfigured();
  if (!configured) {
    return NextResponse.json({
      ok: true,
      configured: false,
      credits: 0,
      soonestExpiry: null,
      refCode: null,
    });
  }

  const [b, record] = await Promise.all([
    balance(user.userId),
    loadUser(user.userId),
  ]);

  return NextResponse.json({
    ok: true,
    configured: true,
    credits: b.credits,
    soonestExpiry: b.soonestExpiry,
    refCode: record?.refCode ?? null,
  });
}
