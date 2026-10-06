import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { grant } from "@/lib/billing/ledger";
import { userIdForEmail } from "@/lib/billing/ledger";

export const runtime = "nodejs";

export async function POST(req: Request) {
    const user = await currentUser();
    if (!user.admin) {
        return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
    }

    let body: { email?: string; credits?: number; reason?: string } = {};
    try {
        body = (await req.json()) as typeof body;
    } catch {
        /* handled below */
    }
    const email = (body.email || "").trim().toLowerCase();
    const credits = Number(body.credits);
    if (!email || !Number.isFinite(credits) || credits <= 0) {
        return NextResponse.json(
            { ok: false, error: "email and a positive credits value are required." },
            { status: 400 }
        );
    }

    const userId = await userIdForEmail(email);
    if (!userId) {
        return NextResponse.json(
            { ok: false, error: `No user for ${email}. They must sign in once.` },
            { status: 400 }
        );
    }

    const granted = await grant({
        userId,
        credits,
        source: "admin_grant",
        idem: `admin:${randomUUID()}`,
        note: body.reason || `grant by ${user.email ?? "admin"}`,
    });

    return NextResponse.json({ ok: true, granted, userId });
}
