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

/** Downscale to `maxEdge` on the long side, JPEG `quality`. Returns the input on failure. */
export async function downscaleImage(
    file: Blob,
    maxEdge = 1600,
    quality = 0.7
): Promise<Blob> {
    try {
        const src = await loadBitmap(file);
        const w0 = src.width;
        const h0 = src.height;
        if (!w0 || !h0) return file;
        const scale = Math.min(1, maxEdge / Math.max(w0, h0));
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
