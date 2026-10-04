"use client";

import { useEffect, useRef, useState } from "react";
import PhoneShell from "../PhoneShell";
import QueueStrip from "../QueueStrip";
import type { QueueItem } from "../queue";
import { useReceiptDetector } from "../useReceiptDetector";
import { fill, type T } from "@/lib/t";

function Corners() {
    const base = "pointer-events-none absolute h-9 w-9 border-4 border-white";
    return (
        <>
            <span className={`${base} left-4 top-4 rounded-tl-xl border-b-0 border-r-0`} />
            <span className={`${base} right-4 top-4 rounded-tr-xl border-b-0 border-l-0`} />
            <span className={`${base} bottom-4 left-4 rounded-bl-xl border-t-0 border-r-0`} />
            <span className={`${base} bottom-4 right-4 rounded-br-xl border-t-0 border-l-0`} />
        </>
    );
}

type Mode = "idle" | "starting" | "live" | "error";

/**
 * Screen 03 / Capture.
 *
 * Live camera with an on-device receipt detector (heuristic, no ML). The
 * detected receipt gets a green box once it holds steady and sharp; Auto-snap
 * (opt-in) captures it automatically. Manual shutter always works, and the
 * camera stays live after every snap so receipts queue up.
 */
export default function CaptureScreen({
    t,
    pill,
    onFile,
    queue,
    onReview,
    onRetry,
    onRemove,
    readyCount,
    onReviewNext,
}: {
    t: T;
    pill?: string;
    onFile: (file: File) => void;
    queue: QueueItem[];
    onReview: (id: string) => void;
    onRetry: (id: string) => void;
    onRemove: (id: string) => void;
    readyCount: number;
    onReviewNext: () => void;
}) {
    const [mode, setMode] = useState<Mode>("idle");
    const [autoSnap, setAutoSnap] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const uploadInputRef = useRef<HTMLInputElement>(null);
    const armed = useRef(true);

    const detection = useReceiptDetector(videoRef, mode === "live");
    const locked = detection.found && detection.sharp && detection.stable;

    function stopCamera() {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
    }

    useEffect(() => () => stopCamera(), []);

    async function openCamera() {
        if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
            setMode("error");
            cameraInputRef.current?.click();
            return;
        }
        setMode("starting");
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { ideal: "environment" } },
                audio: false,
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play().catch(() => undefined);
            }
            setMode("live");
        } catch {
            setMode("error");
            cameraInputRef.current?.click();
        }
    }

    function captureFrame() {
        const video = videoRef.current;
        if (!video) return;
        const width = video.videoWidth || 1080;
        const height = video.videoHeight || 1440;
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(video, 0, 0, width, height);
        canvas.toBlob(
            (blob) => {
                if (!blob) return;
                onFile(
                    new File([blob], `receipt-${Date.now()}.jpg`, {
                        type: "image/jpeg",
                    })
                );
            },
            "image/jpeg",
            0.92
        );
    }

    function shutter() {
        if (mode === "live") captureFrame();
        else void openCamera();
    }

    function pick(files: FileList | null, fallback: boolean) {
        const file = files?.[0];
        if (file) onFile(file);
        if (fallback) setMode("idle");
    }

    // Re-arm autosnap only after the receipt leaves the frame.
    useEffect(() => {
        if (!detection.found) armed.current = true;
    }, [detection.found]);

    useEffect(() => {
        if (!autoSnap || mode !== "live") return;
        const { found, box, sharp, stable } = detection;
        if (!found || !box || !sharp || !stable) return;
        if (box.w * box.h < 0.2) return;
        if (!armed.current) return;
        armed.current = false;
        captureFrame();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [autoSnap, mode, detection]);

    return (
        <PhoneShell tone="brand" pill={pill}>
            <h2 className="mt-2 font-head text-3xl font-extrabold leading-none">
                {t("app.capture.title")}
            </h2>
            <p className="max-w-[30ch]">{t("app.capture.body")}</p>

            <div className="relative flex min-h-[220px] flex-1 items-center justify-center overflow-hidden rounded-panel bg-[#2a1410] px-6 text-center text-peach">
                {mode === "live" ? (
                    <video
                        ref={videoRef}
                        playsInline
                        muted
                        autoPlay
                        className="absolute inset-0 h-full w-full object-cover"
                    />
                ) : (
                    <span className="text-sm">
                        {mode === "starting"
                            ? t("app.capture.starting")
                            : mode === "error"
                              ? t("app.capture.cameraError")
                              : t("app.capture.frame")}
                    </span>
                )}

                {mode === "live" && detection.box ? (
                    <div
                        className={`pointer-events-none absolute rounded-lg border-2 transition-colors ${
                            locked ? "border-green-400" : "border-amber-300"
                        }`}
                        style={{
                            left: `${detection.box.x * 100}%`,
                            top: `${detection.box.y * 100}%`,
                            width: `${detection.box.w * 100}%`,
                            height: `${detection.box.h * 100}%`,
                        }}
                    />
                ) : null}

                <Corners />
            </div>

            <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                    pick(e.target.files, true);
                    e.target.value = "";
                }}
            />
            <input
                ref={uploadInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                    pick(e.target.files, false);
                    e.target.value = "";
                }}
            />

            <button
                type="button"
                aria-label={t("app.capture.shutter")}
                onClick={shutter}
                className="mx-auto mt-1 block h-[76px] w-[76px] rounded-full border-[6px] border-maroon bg-white active:scale-95"
            />
            <button
                type="button"
                onClick={() => uploadInputRef.current?.click()}
                className="text-center font-medium text-ink underline underline-offset-4"
            >
                {t("app.capture.upload")}
            </button>

            <button
                type="button"
                aria-pressed={autoSnap}
                onClick={() => setAutoSnap((v) => !v)}
                className={`mx-auto rounded-full px-4 py-2 text-sm font-semibold ${
                    autoSnap ? "bg-maroon text-white" : "bg-peach text-ink"
                }`}
            >
                {t("app.capture.autoSnap")}
                {autoSnap ? " · ON" : ""}
            </button>

            {locked ? (
                <p className="text-center text-xs font-semibold text-ink">
                    {t("app.capture.detected")}
                </p>
            ) : null}

            {readyCount > 0 ? (
                <button
                    type="button"
                    onClick={onReviewNext}
                    className="rounded-full bg-maroon px-6 py-4 font-semibold text-white"
                >
                    {fill(t("app.queue.reviewNext"), { count: readyCount })}
                </button>
            ) : queue.length > 0 ? (
                <p className="text-center text-xs text-ink opacity-70">
                    {t("app.queue.keepSnapping")}
                </p>
            ) : null}

            <QueueStrip
                t={t}
                queue={queue}
                onReview={onReview}
                onRetry={onRetry}
                onRemove={onRemove}
            />
        </PhoneShell>
    );
}
