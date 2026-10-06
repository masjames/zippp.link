"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

export type Detection = {
    /** Sharp enough to read. */
    sharp: boolean;
    /** The frame is holding still (motion-based). */
    steady: boolean;
    /** Mean luma 0-255; drives the low-light torch. */
    brightness: number;
};

const PROCESS_WIDTH = 160;
const FRAME_INTERVAL_MS = 80; // ~12 fps
const STEADY_FRAMES = 6; // ~0.5s
const MOTION_MAX = 8; // mean abs luma diff (0-255) that still counts as "still"
const SHARP_MIN = 12; // variance of Laplacian; low light noise keeps this up

const EMPTY: Detection = {
    sharp: false,
    steady: false,
    brightness: 0,
};

/**
 * One frame: grayscale, mean luma for the torch, and the variance of the
 * Laplacian for sharpness. Framing is a static portrait guide in the viewfinder,
 * so no bright-rectangle detection happens here.
 */
function analyze(
    data: Uint8ClampedArray,
    w: number,
    h: number
): { sharp: boolean; gray: Uint8Array; brightness: number } {
    const gray = new Uint8Array(w * h);
    let lum = 0;
    for (let i = 0; i < w * h; i++) {
        const r = data[i * 4];
        const g = data[i * 4 + 1];
        const b = data[i * 4 + 2];
        const y = (r * 299 + g * 587 + b * 114) / 1000;
        gray[i] = y;
        lum += y;
    }
    const brightness = lum / (w * h);

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

    return { sharp: variance > SHARP_MIN, gray, brightness };
}

/**
 * On-device capture gate: sharpness and motion only. Auto-capture uses
 * steady + sharp; the server then decides whether the frame is actually a
 * receipt (an automatic capture that is not a receipt is dropped).
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
            const { sharp, gray, brightness } = analyze(frame.data, w, h);

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

            setDetection({ sharp, steady, brightness });
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
