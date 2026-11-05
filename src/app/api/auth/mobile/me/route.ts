import { NextResponse } from "next/server";
import { resolveBearerUser } from "@/lib/auth/mobile-auth";
import { mobileApiEnabled } from "@/lib/mobile/config";
import { loadWorkspaceForUser } from "@/lib/google/workspace-store";
import { mobileWorkspace, type MobileWorkspace } from "@/lib/mobile/me-workspace";
import { getPlanUsage } from "@/lib/billing/plan";
import { listSpacesForUser } from "@/lib/space/space-store";

export const runtime = "nodejs";

function noStore(data: unknown, status = 200): NextResponse {
  const res = NextResponse.json(data, { status });
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export async function GET(req: Request) {
  if (!mobileApiEnabled()) {
    return noStore({ ok: false, code: "NOT_FOUND" }, 404);
  }

  const auth = await resolveBearerUser(req);
  if (!auth.user) {
    const status =
      auth.error === "DEVICE_REVOKED"
        ? 401
        : auth.error === "SERVER_MISCONFIGURED"
          ? 503
          : 401;
    return noStore({ ok: false, code: auth.error }, status);
  }

  let spaces: Array<{ id: string; display_name: string; role: string }> = [];
  try {
    spaces = (await listSpacesForUser(auth.user.userId)).map((s) => ({
      id: s.space_id,
      display_name: s.display_name,
      role:
        s.members.find((m) => m.user_id === auth.user!.userId)?.role ?? "member",
    }));
  } catch {
    spaces = [];
  }

  let workspace: MobileWorkspace | null = null;
  try {
    const ws = await loadWorkspaceForUser(auth.user.userId);
    if (ws) workspace = mobileWorkspace(ws);
  } catch {
    workspace = null;
  }

  let plan: {
    status: string;
    used: number;
    included: number;
    used_pct: number;
    period_end: number;
  } | null = null;
  try {
    const usage = await getPlanUsage(auth.user.userId);
    if (usage) {
      plan = {
        status: usage.status,
        used: usage.used,
        included: usage.included,
        used_pct: usage.used_pct,
        period_end: usage.period_end,
      };
    }
  } catch {
    plan = null;
  }

  return noStore({
    ok: true,
    user: { email: auth.user.email },
    plan,
    device_id: auth.user.deviceId,
    spaces,
    workspace,
  });
}
