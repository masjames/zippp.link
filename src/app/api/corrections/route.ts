import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import {
    appendCorrection,
    hashUser,
    type StoredCorrection,
} from "@/lib/corrections-store";
import type { CorrectionField } from "@/lib/correction-diff";

export const runtime = "nodejs";

/**
 * Field-level correction telemetry, sent when a user accepts a card. No images
 * and no raw values are accepted or stored.
 */

function parseFields(raw: unknown): CorrectionField[] {
    if (!Array.isArray(raw)) return [];
    return raw
        .slice(0, 100)
        .map((item) => {
            const o = (item ?? {}) as Record<string, unknown>;
            return {
                path: typeof o.path === "string" ? o.path.slice(0, 120) : "",
                edited: o.edited === true,
                flagged: o.flagged === true,
                reasons: Array.isArray(o.reasons)
                    ? o.reasons.slice(0, 5).map((r) => String(r).slice(0, 40))
                    : [],
            };
        })
        .filter((field) => field.path !== "");
}

export async function POST(req: Request) {
    const user = await currentUser();
    if (!user.signedIn || !user.userId) {
        return NextResponse.json({ ok: false }, { status: 401 });
    }

    let body: Record<string, unknown>;
    try {
        body = (await req.json()) as Record<string, unknown>;
    } catch {
        return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
    }

    const record: StoredCorrection = {
        id: randomUUID(),
        at: Date.now(),
        user: hashUser(user.userId),
        runId: typeof body.runId === "string" ? body.runId.slice(0, 80) : null,
        countChanged: body.countChanged === true,
        fields: parseFields(body.fields),
        lang: typeof body.lang === "string" ? body.lang.slice(0, 8) : null,
    };

    await appendCorrection(record);
    return NextResponse.json({ ok: true });
}
