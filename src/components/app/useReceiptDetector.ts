"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

export type DetectedBox = { x: number; y: number; w: number; h: number };

export type Detection = {
    /** A bright rectangle was found (used for the overlay only). */
    found: boolean;
    box: DetectedBox | null;
    /** Sharp enough to read. */
    sharp: boolean;
    /** The frame is holding still (motion-based). */
    steady: boolean;
};

const PROCESS_WIDTH = 160;
const FRAME_INTERVAL_MS = 80; // ~12 fps
const STEADY_FRAMES = 6; // ~0.5s
const MOTION_MAX = 8; // mean abs luma diff (0-255) that still counts as "still"
const SHARP_MIN = 12; // variance of Laplacian; low light noise keeps this up

const EMPTY: Detection = { found: false, box: null, sharp: false, steady: false };

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

/**
 * One frame: grayscale, a bright-rectangle box (overlay only) and a sharpness
 * score. The box is best-effort — low light, a hand, or a torn edge all defeat
 * it, which is why steady + sharp + a server receipt check drive auto-capture,
 * not the box.
 */
function analyze(
    data: Uint8ClampedArray,
    w: number,
    h: number
): { box: DetectedBox | null; sharp: boolean; gray: Uint8Array } {
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

    let top = -1;
    let bottom = -1;
    let left = -1;
    let right = -1;
    for (let y = 0; y < h; y++) {
        if (rowCount[y] >= 0.15 * w) {
            if (top < 0) top = y;
            bottom = y;
        }
    }
    for (let x = 0; x < w; x++) {
        if (colCount[x] >= 0.15 * h) {
            if (left < 0) left = x;
            right = x;
        }
    }

    let box: DetectedBox | null = null;
    if (top >= 0 && left >= 0) {
        const bw = right - left + 1;
        const bh = bottom - top + 1;
        const area = (bw * bh) / (w * h);
        const aspect = bw / bh;
        if (bw >= 8 && bh >= 8 && area >= 0.1 && area <= 0.98 && aspect >= 0.15 && aspect <= 1.4) {
            box = { x: left / w, y: top / h, w: bw / w, h: bh / h };
        }
    }

    // Sharpen: variance of Laplacian over the whole frame.
    let mean = 0;
    let n = 0;
    const lap: number[] = [];
    for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
            const i = y * w + x;
            const v =
                gray[i - w] +
                gray[i + w] +
                gray[i - 1] +
                gray[i + 1] -
                4 * gray[i];
            lap.push(v);
            mean += v;
            n++;
        }
    }
    let variance = 0;
    if (n > 0) {
        mean /= n;
        for (const v of lap) variance += (v - mean) * (v - mean);
        variance /= n;
    }

    return { box, sharp: variance > SHARP_MIN, gray };
}

/**
 * On-device capture gate. Reports a bright-rectangle box for the overlay and a
 * motion-based "steady" signal. Auto-capture uses steady + sharp (then a server
 * receipt check); the box is never required.
 */
export function useReceiptDetector(
    videoRef: RefObject<HTMLVideoElement | null>,
    active: boolean
): Detection {
    const [detection, setDetection] = useState<Detection>(EMPTY);
    const prevGray = useRef<Uint8Array | null>(null);
    const steadyCount = useRef(0);

    useEffect(() => {
        if (!active) {
            setDetection(EMPTY);
            prevGray.current = null;
            steadyCount.current = 0;
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
            const { box, sharp, gray } = analyze(frame.data, w, h);

            let motion = 255;
            const prev = prevGray.current;
            if (prev && prev.length === gray.length) {
                let sum = 0;
                for (let i = 0; i < gray.length; i++) sum += Math.abs(gray[i] - prev[i]);
                motion = sum / gray.length;
            }
            prevGray.current = gray;

            if (motion < MOTION_MAX) steadyCount.current++;
            else steadyCount.current = 0;
            const steady = steadyCount.current >= STEADY_FRAMES;

            setDetection({ found: Boolean(box), box, sharp, steady });
        };

        raf = requestAnimationFrame(loop);
        return () => {
            stopped = true;
            cancelAnimationFrame(raf);
            prevGray.current = null;
            steadyCount.current = 0;
        };
    }, [active, videoRef]);

    return detection;
}

export { MOTION_MAX };
