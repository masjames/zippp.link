import { NextResponse } from "next/server";
import {
    contactEmail,
    createContactChallenge,
    verifyContactChallenge,
} from "@/lib/contact-reveal";

export const runtime = "nodejs";

/** Fresh challenge for the contact reveal widget. */
export async function GET() {
    const challenge = createContactChallenge();
    if (!challenge) {
        return NextResponse.json({ ok: false, error: "Not configured." }, { status: 503 });
    }
    return NextResponse.json({ ok: true, challenge });
}

/** Solve the challenge to receive the contact email. */
export async function POST(req: Request) {
    let body: { a?: number; b?: number; sum?: number; token?: string } = {};
    try {
        body = (await req.json()) as typeof body;
    } catch {
        return NextResponse.json({ ok: false, error: "Bad JSON." }, { status: 400 });
    }

    const ok = verifyContactChallenge({
        a: Number(body.a),
        b: Number(body.b),
        sum: Number(body.sum),
        token: String(body.token || ""),
    });
    if (!ok) {
        return NextResponse.json({ ok: false, error: "Wrong answer." }, { status: 403 });
    }
    return NextResponse.json({ ok: true, email: contactEmail() });
}
