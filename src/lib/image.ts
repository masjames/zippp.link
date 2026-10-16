/** Client-side image helpers: PDF→image, downscale, tiny data-URL thumb. */

export function isPdfFile(file: Blob & { name?: string; type?: string }): boolean {
    if (file.type === "application/pdf") return true;
    const name = typeof file.name === "string" ? file.name.toLowerCase() : "";
    return name.endsWith(".pdf");
}

export function isReceiptUpload(file: Blob & { name?: string; type?: string }): boolean {
    if (isPdfFile(file)) return true;
    if (file.type.startsWith("image/")) return true;
    const name = typeof file.name === "string" ? file.name.toLowerCase() : "";
    return /\.(jpe?g|png|webp|heic|heif|gif)$/i.test(name);
}

async function loadBitmap(
    file: Blob
): Promise<ImageBitmap | HTMLImageElement> {
    if (typeof createImageBitmap === "function") {
        try {
            return await createImageBitmap(file);
        } catch {
            /* fall through */
        }
    }
    const url = URL.createObjectURL(file);
    try {
        return await new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error("image decode failed"));
            img.src = url;
        });
    } finally {
        URL.revokeObjectURL(url);
    }
}

function canvasToJpeg(
    canvas: HTMLCanvasElement,
    quality: number
): Promise<Blob | null> {
    return new Promise((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/jpeg", quality)
    );
}

/**
 * Render page 1 of a PDF to a JPEG. Receipt PDFs from WA/email are almost
 * always one page; multi-page docs use the first page only for now.
 */
export async function pdfFirstPageToJpeg(
    file: Blob,
    maxPixels = 4_000_000,
    quality = 0.85
): Promise<Blob> {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

    const data = new Uint8Array(await file.arrayBuffer());
    const doc = await pdfjs.getDocument({ data }).promise;
    try {
        const page = await doc.getPage(1);
        const base = page.getViewport({ scale: 1 });
        const area = Math.max(1, base.width * base.height);
        const scale = Math.min(2.5, Math.max(1.25, Math.sqrt(maxPixels / area)));
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.floor(viewport.width));
        canvas.height = Math.max(1, Math.floor(viewport.height));
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("canvas unavailable");
        await page.render({
            canvasContext: ctx,
            viewport,
        }).promise;
        const jpeg = await canvasToJpeg(canvas, quality);
        if (!jpeg) throw new Error("pdf encode failed");
        return jpeg;
    } finally {
        await doc.destroy();
    }
}

/**
 * Downscale to a pixel budget (default ~4 MP), JPEG `quality`. Width and height
 * scale by the same factor, so a tall receipt keeps enough width to read.
 * Returns the input on failure.
 */
export async function downscaleImage(
    file: Blob,
    maxPixels = 4_000_000,
    quality = 0.85
): Promise<Blob> {
    try {
        const src = await loadBitmap(file);
        const w0 = src.width;
        const h0 = src.height;
        if (!w0 || !h0) return file;
        const scale = Math.min(1, Math.sqrt(maxPixels / (w0 * h0)));
        // Already within budget and already JPEG: keep the bytes as they are.
        if (scale === 1 && file.type === "image/jpeg") return file;
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(w0 * scale));
        canvas.height = Math.max(1, Math.round(h0 * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) return file;
        ctx.drawImage(src as CanvasImageSource, 0, 0, canvas.width, canvas.height);
        return await new Promise<Blob>((resolve) =>
            canvas.toBlob((b) => resolve(b ?? file), "image/jpeg", quality)
        );
    } catch {
        return file;
    }
}

export type PreparedImage = { blob: Blob; thumb: string };

/**
 * Downscale and thumbnail in one pass. PDFs are rasterized (page 1) first.
 */
export async function prepareImage(
    file: Blob,
    maxPixels = 4_000_000,
    quality = 0.85,
    thumbSize = 96
): Promise<PreparedImage> {
    try {
        const source = isPdfFile(file)
            ? await pdfFirstPageToJpeg(file, maxPixels, quality)
            : file;

        const src = await loadBitmap(source);
        const w0 = src.width;
        const h0 = src.height;
        if (!w0 || !h0) return { blob: source, thumb: "" };

        const scale = Math.min(1, Math.sqrt(maxPixels / (w0 * h0)));
        const width = Math.max(1, Math.round(w0 * scale));
        const height = Math.max(1, Math.round(h0 * scale));

        let blob: Blob = source;
        if (scale < 1 || source.type !== "image/jpeg") {
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            if (ctx) {
                ctx.drawImage(src as CanvasImageSource, 0, 0, width, height);
                blob = (await canvasToJpeg(canvas, quality)) ?? source;
            }
        }

        const tcanvas = document.createElement("canvas");
        tcanvas.width = thumbSize;
        tcanvas.height = thumbSize;
        const tctx = tcanvas.getContext("2d");
        if (!tctx) return { blob, thumb: "" };
        const s = Math.max(thumbSize / w0, thumbSize / h0);
        const tw = w0 * s;
        const th = h0 * s;
        tctx.drawImage(
            src as CanvasImageSource,
            (thumbSize - tw) / 2,
            (thumbSize - th) / 2,
            tw,
            th
        );
        return { blob, thumb: tcanvas.toDataURL("image/jpeg", 0.6) };
    } catch (err) {
        if (isPdfFile(file)) throw err instanceof Error ? err : new Error("pdf failed");
        return { blob: file, thumb: "" };
    }
}

/** Square JPEG data URL. */
export async function makeThumb(file: Blob, size = 96): Promise<string> {
    try {
        const prepared = isPdfFile(file) ? await pdfFirstPageToJpeg(file) : file;
        const src = await loadBitmap(prepared);
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx || !src.width || !src.height) return "";
        const scale = Math.max(size / src.width, size / src.height);
        const w = src.width * scale;
        const h = src.height * scale;
        ctx.drawImage(src as CanvasImageSource, (size - w) / 2, (size - h) / 2, w, h);
        return canvas.toDataURL("image/jpeg", 0.6);
    } catch {
        return "";
    }
}
