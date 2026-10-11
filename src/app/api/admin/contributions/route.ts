import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { deleteContribution, listContributions } from "@/lib/contribute-store";

export const runtime = "nodejs";

export async function GET() {
    const user = await currentUser();
    if (!user.admin) {
        return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, contributions: await listContributions() });
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
    if (!id || body.action !== "delete") {
        return NextResponse.json({ ok: false, error: "Bad request." }, { status: 400 });
    }
    const deleted = await deleteContribution(id);
    return NextResponse.json({ ok: deleted });
}
