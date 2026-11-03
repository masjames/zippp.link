import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { revokeDevice, revokeAllUserDevices } from "@/lib/auth/device-store";

export const runtime = "nodejs";

type RevokeBody = {
  device_id?: string;
  revoke_all?: boolean;
};

/** Web-only device revocation. */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user.signedIn || !user.userId) {
    return NextResponse.json({ ok: false, code: "UNAUTHORIZED" }, { status: 401 });
  }

  let body: RevokeBody = {};
  try {
    body = (await req.json()) as RevokeBody;
  } catch {
    /* allow empty body */
  }

  if (body.revoke_all === true) {
    const count = await revokeAllUserDevices(user.userId);
    return NextResponse.json({ ok: true, revoked: count });
  }

  if (!body.device_id || typeof body.device_id !== "string") {
    return NextResponse.json(
      { ok: false, code: "DEVICE_ID_REQUIRED" },
      { status: 400 }
    );
  }

  const ok = await revokeDevice(body.device_id, user.userId);
  if (!ok) {
    return NextResponse.json(
      { ok: false, code: "DEVICE_NOT_FOUND" },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true, revoked: 1 });
}
