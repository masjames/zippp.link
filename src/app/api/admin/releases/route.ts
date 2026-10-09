import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { listReleases, triggerDeploy, updateRelease } from "@/lib/admin/eval-store";

export const runtime = "nodejs";

export async function GET() {
    const user = await currentUser();
    if (!user.admin) {
        return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, releases: await listReleases() });
}

export async function POST(req: Request) {
    const user = await currentUser();
    if (!user.admin) {
        return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
    }
    let body: Record<string, unknown>;
    try {
        body = (await req.json()) as Record<string, unknown>;
    } catch {
        return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
    }
    const id = typeof body.id === "string" ? body.id : "";
    if (!id || body.action !== "deploy") {
        return NextResponse.json({ ok: false, error: "Bad request." }, { status: 400 });
    }
    const deploy = await triggerDeploy();
    await updateRelease(id, deploy);
    return NextResponse.json({ ok: true, deploy });
}
