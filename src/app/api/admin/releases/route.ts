import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { listReleases } from "@/lib/admin/eval-store";

export const runtime = "nodejs";

export async function GET() {
    const user = await currentUser();
    if (!user.admin) {
        return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, releases: await listReleases() });
}
