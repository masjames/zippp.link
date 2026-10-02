"use client";

import { useEffect, useRef, useState } from "react";
import PhoneShell from "../PhoneShell";
import type { T } from "@/lib/t";

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
 * The shutter opens the live camera (getUserMedia) and captures a frame.
 * If the camera is unavailable or blocked it falls back to the native camera
 * input. The "upload a photo" link always opens the file picker instead.
 */
export default function CaptureScreen({
    t,
    pill,
    onFile,
}: {
    t: T;
    pill?: string;
    onFile: (file: File) => void;
}) {
    const [mode, setMode] = useState<Mode>("idle");
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const uploadInputRef = useRef<HTMLInputElement>(null);

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
                stopCamera();
                setMode("idle");
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

    return (
        <PhoneShell tone="brand" pill={pill}>
            <h2 className="mt-2 font-head text-3xl font-extrabold leading-none">
                {t("app.capture.title")}
            </h2>
            <p className="max-w-[30ch]">{t("app.capture.body")}</p>

            <div className="relative flex min-h-[250px] flex-1 items-center justify-center overflow-hidden rounded-panel bg-[#2a1410] px-6 text-center text-peach">
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
                <Corners />
            </div>

            {/* Native camera fallback (mobile capture, or desktop without webcam). */}
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
            {/* Plain file picker for the upload link. */}
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
                className="mx-auto mt-1 block h-[84px] w-[84px] rounded-full border-[6px] border-maroon bg-white active:scale-95"
            />
            <button
                type="button"
                onClick={() => uploadInputRef.current?.click()}
                className="text-center font-medium text-ink underline underline-offset-4"
            >
                {t("app.capture.upload")}
            </button>
        </PhoneShell>
    );
}
