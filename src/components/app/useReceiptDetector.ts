"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

export type DetectedBox = { x: number; y: number; w: number; h: number };

export type Detection = {
    found: boolean;
    box: DetectedBox | null;
    sharp: boolean;
    stable: boolean;
};

const PROCESS_WIDTH = 160;
const FRAME_INTERVAL_MS = 80; // ~12 fps is plenty for guidance
const STABLE_FRAMES = 6; // ~0.5s at 12fps

const EMPTY: Detection = { found: false, box: null, sharp: false, stable: false };

/** Otsu's method: pick the luminance threshold that best splits the frame. */
function otsu(hist: number[], total: number): number {
    let sum = 0;
    for (let i = 0; i < 256; i++) sum += i * hist[i];
    let sumB = 0;
    let weightB = 0;
    let best = 0;
    let threshold = 127;
    for (let i = 0; i < 256; i++) {
        weightB += hist[i];
        if (weightB === 0) continue;
        const weightF = total - weightB;
        if (weightF === 0) break;
        sumB += i * hist[i];
        const meanB = sumB / weightB;
        const meanF = (sum - sumB) / weightF;
        const between = weightB * weightF * (meanB - meanF) * (meanB - meanF);
        if (between > best) {
            best = between;
            threshold = i;
        }
    }
    return threshold;
}

/** Find the dominant bright rectangle and whether it is sharp enough. */
function analyze(
    data: Uint8ClampedArray,
    w: number,
    h: number
): { box: DetectedBox | null; sharp: boolean } {
    const gray = new Uint8Array(w * h);
    const hist = new Array<number>(256).fill(0);
    for (let i = 0; i < w * h; i++) {
        const r = data[i * 4];
        const g = data[i * 4 + 1];
        const b = data[i * 4 + 2];
        const y = (r * 299 + g * 587 + b * 114) / 1000;
        gray[i] = y;
        hist[y | 0]++;
    }

    const threshold = otsu(hist, w * h);
    const mask = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) mask[i] = gray[i] > threshold ? 1 : 0;

    const rowCount = new Int32Array(h);
    const colCount = new Int32Array(w);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            if (mask[y * w + x]) {
                rowCount[y]++;
                colCount[x]++;
            }
        }
    }

    const rowThreshold = 0.15 * w;
    const colThreshold = 0.15 * h;
    let top = -1;
    let bottom = -1;
    let left = -1;
    let right = -1;
    for (let y = 0; y < h; y++) {
        if (rowCount[y] >= rowThreshold) {
            if (top < 0) top = y;
            bottom = y;
        }
    }
    for (let x = 0; x < w; x++) {
        if (colCount[x] >= colThreshold) {
            if (left < 0) left = x;
            right = x;
        }
    }
    if (top < 0 || left < 0) return { box: null, sharp: false };

    const bw = right - left + 1;
    const bh = bottom - top + 1;
    if (bw < 8 || bh < 8) return { box: null, sharp: false };

    const area = (bw * bh) / (w * h);
    const aspect = bw / bh;
    if (area < 0.12 || area > 0.97) return { box: null, sharp: false };
    if (aspect < 0.2 || aspect > 1.3) return { box: null, sharp: false };

    let bright = 0;
    let total = 0;
    for (let y = top; y <= bottom; y++) {
        for (let x = left; x <= right; x++) {
            total++;
            if (mask[y * w + x]) bright++;
        }
    }
    if (total === 0 || bright / total < 0.45) return { box: null, sharp: false };

    // Variance of Laplacian over the box: low variance => blurry.
    let mean = 0;
    let n = 0;
    const lap: number[] = [];
    for (let y = top + 1; y < bottom; y++) {
        for (let x = left + 1; x < right; x++) {
            const i = y * w + x;
            const v = gray[i - w] + gray[i + w] + gray[i - 1] + gray[i + 1] - 4 * gray[i];
            lap.push(v);
            mean += v;
            n++;
        }
    }
    if (n === 0) return { box: null, sharp: false };
    mean /= n;
    let variance = 0;
    for (const v of lap) variance += (v - mean) * (v - mean);
    variance /= n;

    return {
        box: { x: left / w, y: top / h, w: bw / w, h: bh / h },
        sharp: variance > 25,
    };
}

/**
 * On-device receipt detector. Downscales each frame, finds the dominant bright
 * rectangle, and reports whether it is steady and sharp. Heuristic (no ML),
 * so it is fast and never blocks the preview.
 */
export function useReceiptDetector(
    videoRef: RefObject<HTMLVideoElement | null>,
    active: boolean
): Detection {
    const [detection, setDetection] = useState<Detection>(EMPTY);
    const history = useRef<DetectedBox[]>([]);

    useEffect(() => {
        if (!active) {
            setDetection(EMPTY);
            return;
        }
        let stopped = false;
        let raf = 0;
        let last = 0;
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;

        const loop = (time: number) => {
            if (stopped) return;
            raf = requestAnimationFrame(loop);
            if (time - last < FRAME_INTERVAL_MS) return;
            last = time;

            const video = videoRef.current;
            if (!video || video.readyState < 2 || !video.videoWidth) return;

            const vw = video.videoWidth;
            const vh = video.videoHeight;
            const w = PROCESS_WIDTH;
            const h = Math.max(1, Math.round((PROCESS_WIDTH * vh) / vw));
            if (canvas.width !== w || canvas.height !== h) {
                canvas.width = w;
                canvas.height = h;
            }
            ctx.drawImage(video, 0, 0, w, h);
            const frame = ctx.getImageData(0, 0, w, h);
            const { box, sharp } = analyze(frame.data, w, h);

            let stable = false;
            if (box) {
                history.current.push(box);
                if (history.current.length > STABLE_FRAMES) history.current.shift();
                if (history.current.length >= STABLE_FRAMES) {
                    const first = history.current[0];
                    const drift =
                        Math.abs(box.x - first.x) +
                        Math.abs(box.y - first.y) +
                        Math.abs(box.w - first.w) +
                        Math.abs(box.h - first.h);
                    stable = drift < 0.08;
                }
            } else {
                history.current = [];
            }

            setDetection({ found: Boolean(box), box, sharp, stable });
        };

        raf = requestAnimationFrame(loop);
        return () => {
            stopped = true;
            cancelAnimationFrame(raf);
            history.current = [];
        };
    }, [active, videoRef]);

    return detection;
}
