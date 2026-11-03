import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { listUserDevices } from "@/lib/auth/device-store";

export const runtime = "nodejs";

/** Web-only device list. Mobile tokens must not manage other devices. */
export async function GET() {
  const user = await currentUser();
  if (!user.signedIn || !user.userId) {
    return NextResponse.json({ ok: false, code: "UNAUTHORIZED" }, { status: 401 });
  }

  const devices = await listUserDevices(user.userId);
  return NextResponse.json({
    ok: true,
    devices: devices.map((d) => ({
      device_id: d.device_id,
      device_name: d.device_name,
      platform: d.platform,
      app_version: d.app_version,
      paired_at: d.paired_at,
      last_seen_at: d.last_seen_at,
      revoked: d.revoked,
    })),
  });
}
