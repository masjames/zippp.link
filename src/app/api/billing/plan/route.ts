// @implements FEAT-117
import { NextResponse } from "next/server";
import { requestUser } from "@/lib/auth/request-user";
import { getPlanUsage } from "@/lib/billing/plan";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const user = await requestUser(req);
  if (!user) {
    return NextResponse.json({ ok: false, code: "UNAUTHORIZED" }, { status: 401 });
  }

  let plan = null;
  try {
    const usage = await getPlanUsage(user.userId);
    if (usage) {
      plan = {
        status: usage.status,
        included: usage.included,
        used: usage.used,
        used_pct: usage.used_pct,
        period_end: usage.period_end,
      };
    }
  } catch {
    plan = null;
  }

  const res = NextResponse.json({ ok: true, plan });
  res.headers.set("Cache-Control", "no-store");
  return res;
}
