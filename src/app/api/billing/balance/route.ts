import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { balance, listLedger, loadUser } from "@/lib/billing/ledger";
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

  const [b, record, entries] = await Promise.all([
    balance(user.userId),
    loadUser(user.userId),
    listLedger(user.userId, 200),
  ]);
  const referralEarned = entries
    .filter((e) => e.source === "referral_reward")
    .reduce((sum, e) => sum + Math.max(0, e.credits), 0);

  return NextResponse.json({
    ok: true,
    configured: true,
    credits: b.credits,
    soonestExpiry: b.soonestExpiry,
    refCode: record?.refCode ?? null,
    referralEarned,
  });
}
