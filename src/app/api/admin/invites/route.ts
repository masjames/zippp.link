import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { MIN_TOPUP_IDR } from "@/lib/billing/config";
import {
    createInvite,
    listInvites,
    revokeInvite,
} from "@/lib/billing/invites";
import { billingConfigured } from "@/lib/billing/redis";
import { sendInviteEmail } from "@/lib/email";

export const runtime = "nodejs";

async function isAdmin(): Promise<boolean> {
    const user = await currentUser();
    return user.admin;
}

export async function GET() {
    if (!(await isAdmin())) {
        return NextResponse.json({ ok: false }, { status: 404 });
    }
    if (!billingConfigured()) {
        return NextResponse.json({ ok: true, invites: [] });
    }
    return NextResponse.json({ ok: true, invites: await listInvites() });
}

export async function POST(req: Request) {
    if (!(await isAdmin())) {
        return NextResponse.json({ ok: false }, { status: 404 });
    }
    if (!billingConfigured()) {
        return NextResponse.json(
            { ok: false, error: "Billing is not configured." },
            { status: 400 }
        );
    }
    let body: { email?: string } = {};
    try {
        body = (await req.json()) as { email?: string };
    } catch {
        /* handled below */
    }
    const email = (body.email || "").trim().toLowerCase();
    if (!email || !email.includes("@")) {
        return NextResponse.json(
            { ok: false, error: "Email is required." },
            { status: 400 }
        );
    }

    const invite = await createInvite(email);
    const host =
        req.headers.get("x-forwarded-host") ||
        req.headers.get("host") ||
        "www.zippp.link";
    const proto = req.headers.get("x-forwarded-proto") || "https";
    const link = `${proto}://${host}/?invite=${invite.code}`;
    void sendInviteEmail({
        to: invite.email,
        link,
        minIdr: invite.minTopupIdr,
        normalIdr: MIN_TOPUP_IDR,
    });
    return NextResponse.json({ ok: true, invite, link });
}

export async function DELETE(req: Request) {
    if (!(await isAdmin())) {
        return NextResponse.json({ ok: false }, { status: 404 });
    }
    let body: { code?: string } = {};
    try {
        body = (await req.json()) as { code?: string };
    } catch {
        /* handled below */
    }
    const code = (body.code || "").trim();
    if (!code || !billingConfigured()) {
        return NextResponse.json({ ok: false }, { status: 400 });
    }
    const invite = await revokeInvite(code);
    return NextResponse.json({ ok: Boolean(invite), invite });
}
