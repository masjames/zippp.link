import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { saveContribution } from "@/lib/contribute-store";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_BYTES = 8 * 1024 * 1024;

/**
 * Opt-in donation of a receipt that could not be read. Requires an explicit
 * consent flag from the client. Stores the image and the failure reason only.
 */
export async function POST(req: Request) {
    const user = await currentUser();
    if (!user.signedIn) {
        return NextResponse.json({ ok: false }, { status: 401 });
    }

    let image: File;
    let consent: string;
    let reason: string | null;
    let lang: string | null;
    try {
        const form = await req.formData();
        const file = form.get("image");
        if (!(file instanceof File) || file.size === 0) {
            return NextResponse.json({ ok: false, error: "No image." }, { status: 400 });
        }
        image = file;
        consent = typeof form.get("consent") === "string" ? String(form.get("consent")) : "";
        reason = typeof form.get("reason") === "string" ? String(form.get("reason")) : null;
        lang = typeof form.get("lang") === "string" ? String(form.get("lang")) : null;
    } catch {
        return NextResponse.json({ ok: false }, { status: 400 });
    }

    if (consent !== "true") {
        return NextResponse.json({ ok: false, error: "Consent required." }, { status: 400 });
    }
    if (image.size > MAX_BYTES) {
        return NextResponse.json({ ok: false, error: "Image too large." }, { status: 413 });
    }

    try {
        const record = await saveContribution(image, { reason, lang });
        return NextResponse.json({ ok: true, id: record.id });
    } catch {
        return NextResponse.json({ ok: false, error: "Could not save." }, { status: 500 });
    }
}
