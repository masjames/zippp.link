import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { absoluteUrl } from "@/lib/site";
import {
    waChannelEnabled,
    waConfigured,
    waDisplayNumber,
    waMockMode,
    waPhoneNumberId,
    waProvider,
    waUiEnabled,
} from "@/lib/wa/config";
import {
    getLinkByUserId,
    mintLinkToken,
    unlinkUser,
} from "@/lib/wa/store";

export const runtime = "nodejs";

function waMeLink(token: string): string {
    const display = waDisplayNumber();
    const text = encodeURIComponent(`zippp link ${token}`);
    if (display) {
        return `https://wa.me/${display}?text=${text}`;
    }
    return absoluteUrl(`/api/wa/link/claim?token=${token}`);
}

export async function GET() {
    if (!waUiEnabled()) {
        return NextResponse.json({ ok: true, enabled: false, mock: false });
    }
    const user = await currentUser();
    if (!user.signedIn || !user.userId) {
        return NextResponse.json({ ok: false }, { status: 401 });
    }
    const link = await getLinkByUserId(user.userId);
    return NextResponse.json({
        ok: true,
        enabled: true,
        mock: waMockMode(),
        live: waChannelEnabled() && waConfigured(),
        configured: waConfigured(),
        provider: waProvider(),
        phoneNumberId:
            waConfigured() && waProvider() === "meta"
                ? waPhoneNumberId()
                : null,
        mockUrl: waMockMode() ? "/app/wa-mock" : null,
        linked: link
            ? { phone: link.phone, linkedAt: link.linkedAt }
            : null,
    });
}

export async function POST(req: Request) {
    const user = await currentUser();
    if (!user.signedIn || !user.userId) {
        return NextResponse.json({ ok: false }, { status: 401 });
    }

    let action = "start";
    try {
        const body = (await req.json()) as { action?: string };
        if (body.action) action = body.action;
    } catch {
        /* start */
    }

    // Mock: no Meta needed — open the playground.
    if (waMockMode() && (action === "start" || action === "mock")) {
        return NextResponse.json({
            ok: true,
            mock: true,
            openUrl: "/app/wa-mock",
        });
    }

    if (!waChannelEnabled() || !waConfigured()) {
        return NextResponse.json(
            { ok: false, error: "WhatsApp channel is off." },
            { status: 404 }
        );
    }

    if (action === "unlink") {
        await unlinkUser(user.userId);
        return NextResponse.json({ ok: true, linked: null });
    }

    const token = await mintLinkToken(user.userId);
    return NextResponse.json({
        ok: true,
        token,
        openUrl: waMeLink(token),
        instruction: `zippp link ${token}`,
    });
}
