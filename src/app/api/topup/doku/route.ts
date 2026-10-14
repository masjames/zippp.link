import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { createDokuCheckout, dokuConfigured } from "@/lib/billing/doku";
import { getAppLocale } from "@/lib/server-locale";

export const runtime = "nodejs";

/** Create a DOKU hosted checkout and return its URL for redirect. */
export async function POST(req: Request) {
    const user = await currentUser();
    if (!user.signedIn || !user.userId) {
        return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
    }
    if (!dokuConfigured()) {
        return NextResponse.json({ ok: false, error: "DOKU is not configured." }, { status: 400 });
    }

    let body: { amountIdr?: number } = {};
    try {
        body = (await req.json()) as { amountIdr?: number };
    } catch {
        /* handled below */
    }

    const { lang } = await getAppLocale();
    // Behind Vercel the public host arrives in x-forwarded-host.
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
    const proto = req.headers.get("x-forwarded-proto") || "https";
    const origin = `${proto}://${host}`;

    try {
        const order = await createDokuCheckout({
            userId: user.userId,
            email: user.email,
            name: user.email ? user.email.split("@")[0] : null,
            amountIdr: Number(body.amountIdr),
            lang,
            origin,
        });
        return NextResponse.json({
            ok: true,
            order: { invoice: order.invoice, url: order.url, expiresAt: order.expiresAt },
        });
    } catch (err) {
        return NextResponse.json(
            { ok: false, error: err instanceof Error ? err.message : "Failed." },
            { status: 400 }
        );
    }
}
