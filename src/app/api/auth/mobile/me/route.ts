import { NextResponse } from "next/server";
import { resolveBearerUser } from "@/lib/auth/mobile-auth";
import { mobileApiEnabled } from "@/lib/mobile/config";
import { loadWorkspaceForUser } from "@/lib/google/workspace-store";
import { PAYMENT_OPTIONS } from "@/lib/google/templates";
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

  let workspace: {
    ready: boolean;
    template_id: string;
    payment_options: string[];
    staff_names: string[];
    outlets: string[];
    default_outlet: string | null;
    photo_proof: boolean;
  } | null = null;
  try {
    const ws = await loadWorkspaceForUser(auth.user.userId);
    if (ws) {
      workspace = {
        ready:
          Boolean(ws.spreadsheet_id) &&
          Boolean(ws.column_map && Object.keys(ws.column_map).length > 0),
        template_id: ws.template_id,
        payment_options: [...(PAYMENT_OPTIONS[ws.template_id] ?? [])],
        staff_names: ws.staff_names,
        outlets: ws.outlets,
        default_outlet: ws.default_outlet,
        photo_proof: Boolean(ws.photo_proof),
      };
    }
  } catch {
    workspace = null;
  }

  return noStore({
    ok: true,
    user: { email: auth.user.email },
    device_id: auth.user.deviceId,
    spaces,
    workspace,
  });
}
