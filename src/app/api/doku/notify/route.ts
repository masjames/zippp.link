import { NextResponse } from "next/server";
import {
    applyDokuNotification,
    verifyDokuNotification,
    type DokuNotification,
} from "@/lib/billing/doku";

export const runtime = "nodejs";

/**
 * DOKU HTTP notification. Must answer 200 quickly; DOKU retries otherwise.
 * Signature covers our own path, so this route must stay at this URL (or
 * `DOKU_NOTIFY_PATH` must be set to the externally visible path).
 */
export async function POST(req: Request) {
    const raw = await req.text();
    const target = process.env.DOKU_NOTIFY_PATH || new URL(req.url).pathname;

    if (!verifyDokuNotification({ rawBody: raw, headers: req.headers, target })) {
        return NextResponse.json({ ok: false, error: "Bad signature." }, { status: 401 });
    }

    let note: DokuNotification;
    try {
        note = JSON.parse(raw) as DokuNotification;
    } catch {
        return NextResponse.json({ ok: false, error: "Bad JSON." }, { status: 400 });
    }

    const { order, granted } = await applyDokuNotification(note);
    if (!order) {
        return NextResponse.json({ ok: false, error: "Unknown invoice." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, state: order.state, granted });
}
