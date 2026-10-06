import { NextResponse } from "next/server";
import { runPaddleOcr } from "@/lib/paddleocr";
import { isLikelyReceipt } from "@/lib/receipt-detect";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * POST /api/detect — is a receipt in this image? Uses PaddleOCR (vision) plus a
 * text heuristic. Cheap: no DeepSeek structuring. Gates auto-capture.
 */
export async function POST(req: Request) {
    let image: File;
    try {
        const form = await req.formData();
        const file = form.get("image");
        if (!(file instanceof File) || file.size === 0) {
            return NextResponse.json({ ok: false, error: "No image." }, { status: 400 });
        }
        image = file;
    } catch {
        return NextResponse.json({ ok: false, error: "No image." }, { status: 400 });
    }

    try {
        const ocr = await runPaddleOcr(image, 6000);
        const receipt = isLikelyReceipt(ocr.markdown);
        console.log(
            JSON.stringify({
                event: "detect.run",
                receipt,
                chars: ocr.markdown.length,
            })
        );
        return NextResponse.json({
            ok: true,
            receipt,
            chars: ocr.markdown.length,
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Detect failed.";
        console.log(JSON.stringify({ event: "detect.failed", error: message }));
        // A failed detect is treated as "no receipt" by the client.
        return NextResponse.json({ ok: false, receipt: false, error: message });
    }
}
