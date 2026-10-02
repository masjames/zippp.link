import { NextResponse } from "next/server";
import { runExtraction } from "@/lib/extract-pipeline";
import type { ExtractResponse } from "@/types/receipt";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/extract — one image in, receipt JSON out.
 *
 * Pipeline: PaddleOCR-VL (vision) -> markdown -> DeepSeek Flash (text) ->
 * receipt JSON. Gemini is the fallback if either stage fails. Every response
 * carries a `debug` trace (always on) for the in-app debug console.
 */
export async function POST(req: Request) {
    const started = performance.now();

    let image: File;
    try {
        const form = await req.formData();
        const file = form.get("image");
        if (!(file instanceof File) || file.size === 0) {
            const body: ExtractResponse = { ok: false, error: "No image." };
            return NextResponse.json(body, { status: 400 });
        }
        image = file;
    } catch {
        const body: ExtractResponse = { ok: false, error: "No image." };
        return NextResponse.json(body, { status: 400 });
    }

    const result = await runExtraction(image);
    const server_ms = Math.round(performance.now() - started);

    if (result.ok) {
        const body: ExtractResponse = {
            ok: true,
            receipt: result.receipt,
            timings: { model_ms: result.model_ms, server_ms },
            debug: result.debug,
        };
        return NextResponse.json(body, { status: 200 });
    }

    const body: ExtractResponse = {
        ok: false,
        error: result.error,
        debug: result.debug,
    };
    return NextResponse.json(body, { status: result.refusal ? 422 : 502 });
}
