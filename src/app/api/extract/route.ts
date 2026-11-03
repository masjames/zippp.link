import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { runExtraction } from "@/lib/extract-pipeline";
import { resolveBearerUser } from "@/lib/auth/mobile-auth";
import { mobileApiEnabled } from "@/lib/mobile/config";
import { recordScanOwner } from "@/lib/mobile/scan-store";
import type { ExtractResponse } from "@/types/receipt";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

/**
 * POST /api/extract: one image in, receipt JSON plus a server-issued scanId.
 *
 * The photo path is deliberately image-only. It never imports Google modules
 * and never passes user or sheet data into the extraction pipeline.
 *
 * A mobile bearer token is checked when present. Web requests keep the existing
 * cookie-less behaviour so the current web app is not broken by this rollout.
 */
export async function POST(req: Request) {
    const started = performance.now();

    const hasBearer = Boolean(
        req.headers.get("authorization")?.toLowerCase().startsWith("bearer ")
    );
    let mobileUserId: string | null = null;
    if (hasBearer) {
        if (!mobileApiEnabled()) {
            return NextResponse.json(
                { ok: false, error: "MOBILE_API_DISABLED" },
                { status: 404 }
            );
        }
        const mobile = await resolveBearerUser(req);
        if (!mobile.user) {
            return NextResponse.json(
                { ok: false, error: mobile.error },
                { status: 401 }
            );
        }
        mobileUserId = mobile.user.userId;
    }

    let image: File;
    try {
        const form = await req.formData();
        const file = form.get("image");
        if (!(file instanceof File) || file.size === 0) {
            const body: ExtractResponse = { ok: false, error: "No image." };
            return NextResponse.json(body, { status: 400 });
        }
        if (file.size > MAX_IMAGE_BYTES) {
            const body: ExtractResponse = { ok: false, error: "Image too large." };
            return NextResponse.json(body, { status: 413 });
        }
        if (!ALLOWED_TYPES.has(file.type)) {
            const body: ExtractResponse = { ok: false, error: "Unsupported image type." };
            return NextResponse.json(body, { status: 415 });
        }
        image = file;
    } catch {
        const body: ExtractResponse = { ok: false, error: "No image." };
        return NextResponse.json(body, { status: 400 });
    }

    const scanId = randomUUID();

    const result = await runExtraction(image);
    const server_ms = Math.round(performance.now() - started);

    if (result.ok) {
        if (mobileUserId) {
            await recordScanOwner(mobileUserId, scanId);
        }
        const body: ExtractResponse & { scanId: string } = {
            ok: true,
            receipt: result.receipt,
            timings: { model_ms: result.model_ms, server_ms },
            debug: result.debug,
            scanId,
        };
        return NextResponse.json(body, { status: 200 });
    }

    const body: ExtractResponse = {
        ok: false,
        error: result.error,
        refusal: result.refusal,
        debug: result.debug,
    };
    return NextResponse.json(body, { status: result.refusal ? 422 : 502 });
}
