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
 * Laplacian for sharpness. Writes gray into the caller's buffer so the loop
 * allocates nothing per frame. Framing is a static portrait guide in the
 * viewfinder, so no bright-rectangle detection happens here.
 */
function analyze(
    data: Uint8ClampedArray,
    w: number,
    h: number,
    gray: Uint8Array
): { sharp: boolean; brightness: number } {
    const n = w * h;
    let lum = 0;
    for (let i = 0; i < n; i++) {
        const y =
            (data[i * 4] * 299 + data[i * 4 + 1] * 587 + data[i * 4 + 2] * 114) /
            1000;
        gray[i] = y;
        lum += y;
    }
    const brightness = lum / n;

    // Variance of the Laplacian, computed online (no per-frame array).
    let sum = 0;
    let sumSq = 0;
    let count = 0;
    for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
            const i = y * w + x;
            const v =
                gray[i - w] +
                gray[i + w] +
                gray[i - 1] +
                gray[i + 1] -
                4 * gray[i];
            sum += v;
            sumSq += v * v;
            count++;
        }
    }
    const mean = count > 0 ? sum / count : 0;
    const variance = count > 0 ? sumSq / count - mean * mean : 0;

    return { sharp: variance > SHARP_MIN, brightness };
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
    const last = useRef<Detection>(EMPTY);

    useEffect(() => {
        if (!active) {
            setDetection(EMPTY);
            last.current = EMPTY;
            return;
        }
        let stopped = false;
        let raf = 0;
        let lastTime = 0;
        let steadyCount = 0;
        // Two grayscale buffers, swapped each frame so motion is measured
        // against the previous frame without copying.
        let gray = new Uint8Array(0);
        let prev = new Uint8Array(0);

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;

        const loop = (time: number) => {
            if (stopped) return;
            raf = requestAnimationFrame(loop);
            if (time - lastTime < FRAME_INTERVAL_MS) return;
            lastTime = time;

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

            if (gray.length !== w * h) {
                gray = new Uint8Array(w * h);
                prev = new Uint8Array(0);
            }
            const { sharp, brightness } = analyze(frame.data, w, h, gray);

            let motion = 255;
            if (prev.length === gray.length) {
                let sum = 0;
                for (let i = 0; i < gray.length; i++) {
                    sum += Math.abs(gray[i] - prev[i]);
                }
                motion = sum / gray.length;
            }
            // Swap: the current frame becomes the next "previous".
            const swap = prev;
            prev = gray;
            gray = swap;

            if (motion < MOTION_MAX) steadyCount++;
            else steadyCount = 0;
            const steady = steadyCount >= STEADY_FRAMES;

            // Only push state when something actually changed. Re-rendering the
            // whole screen ~12x a second was the main cost on older devices.
            const previous = last.current;
            if (
                previous.sharp !== sharp ||
                previous.steady !== steady ||
                Math.abs(previous.brightness - brightness) >= 1
            ) {
                const next = { sharp, steady, brightness };
                last.current = next;
                setDetection(next);
            }
        };

        raf = requestAnimationFrame(loop);
        return () => {
            stopped = true;
            cancelAnimationFrame(raf);
        };
    }, [active, videoRef]);

    return detection;
}
