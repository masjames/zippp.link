import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { correctionSummary } from "@/lib/corrections-store";

export const runtime = "nodejs";

export async function GET() {
    const user = await currentUser();
    if (!user.admin) {
        return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, summary: await correctionSummary() });
}
