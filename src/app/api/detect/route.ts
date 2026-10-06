import { NextResponse } from "next/server";
import { detectReceiptWithDeepSeekVision } from "@/lib/deepseek";
import { runPaddleOcr } from "@/lib/paddleocr";
import { isLikelyReceipt } from "@/lib/receipt-detect";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * POST /api/detect — is a receipt in this image?
 * PaddleOCR (vision) + a date/item/price heuristic; if PaddleOCR is
 * unavailable or times out, DeepSeek vision decides.
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
            JSON.stringify({ event: "detect.run", via: "paddle", receipt, chars: ocr.markdown.length })
        );
        return NextResponse.json({
            ok: true,
            via: "paddle",
            receipt,
            chars: ocr.markdown.length,
        });
    } catch (err) {
        // PaddleOCR unavailable / timed out: ask DeepSeek vision directly.
        const reason = err instanceof Error ? err.message : "ocr failed";
        try {
            const bytes = Buffer.from(await image.arrayBuffer());
            const receipt = await detectReceiptWithDeepSeekVision({
                mimeType: image.type || "image/jpeg",
                dataBase64: bytes.toString("base64"),
            });
            console.log(
                JSON.stringify({ event: "detect.run", via: "deepseek", receipt, fallback: reason })
            );
            return NextResponse.json({ ok: true, via: "deepseek", receipt });
        } catch (err2) {
            const message = err2 instanceof Error ? err2.message : "detect failed";
            console.log(
                JSON.stringify({ event: "detect.failed", ocr: reason, deepseek: message })
            );
            return NextResponse.json({ ok: false, receipt: false, error: message });
        }
    }
}
