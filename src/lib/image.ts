/** Client-side image helpers: downscale before storing, tiny data-URL thumb. */

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

function canvasToJpeg(
    canvas: HTMLCanvasElement,
    quality: number
): Promise<Blob | null> {
    return new Promise((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/jpeg", quality)
    );
}

/**
 * Downscale and thumbnail in one pass. The image is decoded once and both
 * outputs come from the same bitmap, which keeps manual capture fast on older
 * phones (one decode, one encode, one tiny thumb encode).
 */
export async function prepareImage(
    file: Blob,
    maxPixels = 4_000_000,
    quality = 0.85,
    thumbSize = 96
): Promise<PreparedImage> {
    try {
        const src = await loadBitmap(file);
        const w0 = src.width;
        const h0 = src.height;
        if (!w0 || !h0) return { blob: file, thumb: "" };

        const scale = Math.min(1, Math.sqrt(maxPixels / (w0 * h0)));
        const width = Math.max(1, Math.round(w0 * scale));
        const height = Math.max(1, Math.round(h0 * scale));

        let blob: Blob = file;
        if (scale < 1 || file.type !== "image/jpeg") {
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            if (ctx) {
                ctx.drawImage(src as CanvasImageSource, 0, 0, width, height);
                blob = (await canvasToJpeg(canvas, quality)) ?? file;
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
    } catch {
        return { blob: file, thumb: "" };
    }
}

/** Square JPEG data URL. */
export async function makeThumb(file: Blob, size = 96): Promise<string> {
    try {
        const src = await loadBitmap(file);
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
