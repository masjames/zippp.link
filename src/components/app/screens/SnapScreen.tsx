"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import PhoneShell from "../PhoneShell";
import DebugPanel from "../DebugPanel";
import { useApp, type SheetCandidate } from "../AppProvider";
import { useReceiptDetector } from "../useReceiptDetector";
import { fill, type T } from "@/lib/t";
import { toDraft, type Draft } from "../draft";
import type { BatchItem } from "@/lib/batch-db";

/** Green Google Sheets mark, for the open-sheet action. */
function SheetsIcon() {
    return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
            <path
                fill="#188038"
                d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"
            />
            <path fill="#34a853" d="M14 2l6 6h-6z" />
            <path
                fill="#fff"
                d="M8 12h8v7H8v-7zm1.5 1.5v1.5H11v-1.5H9.5zm3 0v1.5h3v-1.5h-3zm-3 3v1h1.5v-1H9.5zm3 0v1h3v-1h-3z"
            />
        </svg>
    );
}

const INPUT_BASE =
    "min-w-0 rounded-lg border bg-surface px-2 py-1.5 text-sm text-body focus:outline-none";
const INPUT = `${INPUT_BASE} w-full border-line focus:border-brand`;
const INPUT_ASSUMED = `${INPUT_BASE} w-full border-amber-400 focus:border-amber-500`;
const INPUT_INLINE = `${INPUT_BASE} border-line focus:border-brand`;
const LABEL = "text-[10px] font-semibold leading-none text-muted";

/** Stored captures stay within this budget. Smaller means a faster encode. */
const CAPTURE_MAX_PIXELS = 3_000_000;
const CAPTURE_QUALITY = 0.72;

/** Static portrait guide. The video frame itself is not overlayed. */
function GuideFrame() {
    const base = "pointer-events-none absolute h-7 w-7 border-4 border-white/90";
    return (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="relative aspect-[9/16] h-[88%]">
                <span className={`${base} left-0 top-0 rounded-tl-xl border-b-0 border-r-0`} />
                <span className={`${base} right-0 top-0 rounded-tr-xl border-b-0 border-l-0`} />
                <span className={`${base} bottom-0 left-0 rounded-bl-xl border-t-0 border-r-0`} />
                <span className={`${base} bottom-0 right-0 rounded-br-xl border-t-0 border-l-0`} />
            </div>
        </div>
    );
}

type Mode = "idle" | "starting" | "live" | "error";

export default function SnapScreen() {
    const {
        t,
        workspace,
        batch,
        autoSnap,
        setAutoSnap,
        autoCooldownUntil,
        addFile,
        addBlob,
        pickSheet,
        listSheetChoices,
        updateDraft,
        acceptItem,
        removeItem,
        retryItem,
        contributeItem,
        balance,
        savedTick,
    } = useApp();
    const router = useRouter();

    const [mode, setMode] = useState<Mode>("idle");
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const uploadInputRef = useRef<HTMLInputElement>(null);
    const armed = useRef(true);
    const flashAuto = useRef(true);
    const [videoAspect, setVideoAspect] = useState(3 / 4);
    const [torchSupported, setTorchSupported] = useState(false);
    const [torchOn, setTorchOn] = useState(false);

    // Expanded bottom-sheet review; minimized card keeps the camera free.
    const [reviewExpanded, setReviewExpanded] = useState(false);
    const [reviewIndex, setReviewIndex] = useState(0);
    const pendingMinimize = useRef(false);
    // White flash on shutter.
    const [flash, setFlash] = useState(false);
    const flashTimer = useRef<number | null>(null);
    // Quick sheet selector, opened from the sheet-name pill.
    const [sheetPicker, setSheetPicker] = useState(false);
    const [sheetChoices, setSheetChoices] = useState<SheetCandidate[]>([]);
    const [sheetPickerBusy, setSheetPickerBusy] = useState(false);
    // Soft toasts + Sheets glow when the queue is clear.
    const [toast, setToast] = useState<string | null>(null);
    const toastTimer = useRef<number | null>(null);
    // One-off admin notice (manual grant), shown once per user.
    const [notice, setNotice] = useState<{
        message: string;
        credits: number;
    } | null>(null);
    const [sheetsShine, setSheetsShine] = useState(false);
    const shineTimer = useRef<number | null>(null);
    const prevUnacceptedLen = useRef(0);
    const cameraBooted = useRef(false);

    // Accepted and in-flight items are hidden from the review queue.
    const unaccepted = batch.filter(
        (item) => item.status !== "accepted" && item.status !== "sending"
    );
    const safeIndex = Math.min(
        reviewIndex,
        Math.max(0, unaccepted.length - 1)
    );
    const current = unaccepted[safeIndex] ?? null;
    const reviewBlocking = reviewExpanded && Boolean(current);
    const framing = mode === "live" || flash;
    const outOfCredits = balance?.configured === true && balance.credits <= 0;

    const detection = useReceiptDetector(
        videoRef,
        mode === "live" && !reviewBlocking
    );

    useEffect(() => {
        if (reviewIndex !== safeIndex) setReviewIndex(safeIndex);
    }, [safeIndex, reviewIndex]);

    /** New capture → jump to the newest item so reading UI shows. */
    const prevQueueLen = useRef(0);
    useEffect(() => {
        if (unaccepted.length > prevQueueLen.current) {
            setReviewIndex(unaccepted.length - 1);
        }
        prevQueueLen.current = unaccepted.length;
    }, [unaccepted.length]);

    /** Reading → expand; once draft lands, minimize so the user can snap again. */
    useEffect(() => {
        if (!current) {
            setReviewExpanded(false);
            pendingMinimize.current = false;
            return;
        }
        const stillReading = !current.draft && current.status !== "failed";
        if (stillReading) {
            setReviewExpanded(true);
            pendingMinimize.current = true;
            return;
        }
        if (
            pendingMinimize.current &&
            (current.draft || current.status === "failed")
        ) {
            const id = window.setTimeout(() => {
                setReviewExpanded(false);
                pendingMinimize.current = false;
            }, 650);
            return () => window.clearTimeout(id);
        }
    }, [current?.id, current?.draft, current?.status]);

    /** Soft "saved" toast whenever an append succeeds. */
    useEffect(() => {
        if (savedTick === 0) return;
        setToast(t("app.review.saved"));
        if (toastTimer.current) window.clearTimeout(toastTimer.current);
        toastTimer.current = window.setTimeout(() => {
            setToast(null);
            toastTimer.current = null;
        }, 1800);
    }, [savedTick, t]);

    /** Queue emptied → soft notif + Sheets button shines. */
    useEffect(() => {
        if (prevUnacceptedLen.current > 0 && unaccepted.length === 0) {
            setToast(t("app.review.allDone"));
            setSheetsShine(true);
            if (toastTimer.current) window.clearTimeout(toastTimer.current);
            toastTimer.current = window.setTimeout(() => {
                setToast(null);
                toastTimer.current = null;
            }, 2600);
            if (shineTimer.current) window.clearTimeout(shineTimer.current);
            shineTimer.current = window.setTimeout(() => {
                setSheetsShine(false);
                shineTimer.current = null;
            }, 4200);
        }
        prevUnacceptedLen.current = unaccepted.length;
    }, [unaccepted.length, t]);

    /** Fetch the pending admin notice once, when Snap opens. */
    useEffect(() => {
        let alive = true;
        void (async () => {
            try {
                const res = await fetch("/api/notices", { cache: "no-store" });
                const data = await res.json();
                if (alive && data.notice?.message) {
                    setNotice({
                        message: String(data.notice.message),
                        credits: Number(data.notice.credits) || 0,
                    });
                }
            } catch {
                /* ignore */
            }
        })();
        return () => {
            alive = false;
        };
    }, []);

    function stopCamera() {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setTorchOn(false);
        flashAuto.current = true;
    }

    async function applyTorch(on: boolean) {
        const track = streamRef.current?.getVideoTracks()[0];
        if (!track) return;
        try {
            await track.applyConstraints({
                advanced: [{ torch: on }],
            } as unknown as MediaTrackConstraints);
        } catch {
            /* not supported; ignore */
        }
    }

    function toggleFlash() {
        flashAuto.current = false;
        const next = !torchOn;
        setTorchOn(next);
        void applyTorch(next);
    }

    useEffect(
        () => () => {
            if (flashTimer.current) window.clearTimeout(flashTimer.current);
            if (toastTimer.current) window.clearTimeout(toastTimer.current);
            if (shineTimer.current) window.clearTimeout(shineTimer.current);
            stopCamera();
        },
        []
    );

    /** Open the camera as soon as Snap loads. */
    useEffect(() => {
        if (cameraBooted.current) return;
        cameraBooted.current = true;
        void openCamera();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function openCamera() {
        if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
            setMode("error");
            cameraInputRef.current?.click();
            return;
        }
        setMode("starting");
        try {
            // Soft constraints only. Asking for 4K made some older phones take
            // seconds to open the camera and produced a heavy preview.
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: { ideal: "environment" },
                    width: { ideal: 1920 },
                },
                audio: false,
            });
            streamRef.current = stream;
            const track = stream.getVideoTracks()[0];
            const caps = track?.getCapabilities?.() as { torch?: boolean } | undefined;
            setTorchSupported(Boolean(caps?.torch));
            setMode("live");
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play().catch(() => undefined);
            }
        } catch {
            setMode("error");
            cameraInputRef.current?.click();
        }
    }

    async function captureFrame(): Promise<{ blob: Blob; thumb: string } | null> {
        const video = videoRef.current;
        if (!video || !video.videoWidth || !video.videoHeight) return null;
        const vw = video.videoWidth;
        const vh = video.videoHeight;
        const scale = Math.min(1, Math.sqrt(CAPTURE_MAX_PIXELS / (vw * vh)));
        const width = Math.max(1, Math.round(vw * scale));
        const height = Math.max(1, Math.round(vh * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return null;
        // One draw, one encode. ImageCapture.takePhoto() was the slow path: it
        // grabbed a full-sensor frame that then had to be decoded and resized.
        ctx.drawImage(video, 0, 0, width, height);

        // Keep the live stream — user should be able to snap the next receipt.

        // Thumbnail from the same canvas, so there is no second decode.
        const thumbSize = 96;
        const tcanvas = document.createElement("canvas");
        tcanvas.width = thumbSize;
        tcanvas.height = thumbSize;
        const tctx = tcanvas.getContext("2d");
        let thumb = "";
        if (tctx) {
            const s = Math.max(thumbSize / width, thumbSize / height);
            const tw = width * s;
            const th = height * s;
            tctx.drawImage(
                canvas,
                (thumbSize - tw) / 2,
                (thumbSize - th) / 2,
                tw,
                th
            );
            thumb = tcanvas.toDataURL("image/jpeg", 0.6);
        }

        const blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob((b) => resolve(b), "image/jpeg", CAPTURE_QUALITY)
        );
        return blob ? { blob, thumb } : null;
    }

    async function manualCapture() {
        // Flash the viewfinder as feedback, then grab the frame.
        setFlash(true);
        if (flashTimer.current) window.clearTimeout(flashTimer.current);
        flashTimer.current = window.setTimeout(() => {
            setFlash(false);
            flashTimer.current = null;
        }, 160);
        const shot = await captureFrame();
        if (shot) addBlob(shot.blob, shot.thumb, "manual");
    }

    async function openSheetPicker() {
        setSheetPicker(true);
        setSheetPickerBusy(true);
        const list = await listSheetChoices();
        // Always offer the connected sheet, even if the Drive search misses it.
        const withCurrent =
            workspace && !list.some((c) => c.id === workspace.spreadsheet_id)
                ? [
                      {
                          id: workspace.spreadsheet_id,
                          name: workspace.spreadsheet_title,
                          modifiedTime: "",
                      },
                      ...list,
                  ]
                : list;
        setSheetChoices(withCurrent);
        setSheetPickerBusy(false);
    }

    function shutter() {
        if (outOfCredits || mode === "starting") return;
        if (mode !== "live") {
            void openCamera();
            return;
        }
        if (!detection.sharp) return;
        void manualCapture();
    }

    useEffect(() => {
        if (!torchSupported || !flashAuto.current || mode !== "live") return;
        const b = detection.brightness;
        if (b <= 0) return;
        if (b < 55 && !torchOn) {
            setTorchOn(true);
            void applyTorch(true);
        } else if (b > 95 && torchOn) {
            setTorchOn(false);
            void applyTorch(false);
        }
    }, [detection.brightness, torchSupported, mode, torchOn]);

    useEffect(() => {
        if (!detection.steady) armed.current = true;
    }, [detection.steady]);

    useEffect(() => {
        if (!autoSnap || mode !== "live" || outOfCredits || reviewBlocking)
            return;
        const { steady, sharp } = detection;
        if (!steady || !sharp) return;
        if (!armed.current) return;
        if (Date.now() < autoCooldownUntil) return;
        armed.current = false;
        void (async () => {
            const shot = await captureFrame();
            if (shot) addBlob(shot.blob, shot.thumb, "auto");
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        autoSnap,
        mode,
        detection,
        outOfCredits,
        autoCooldownUntil,
        reviewBlocking,
    ]);

    function goReview(delta: number) {
        setReviewIndex((i) => {
            const next = i + delta;
            if (next < 0 || next >= unaccepted.length) return i;
            return next;
        });
    }

    function handleAccept() {
        if (!current) return;
        acceptItem(current.id);
        // Index stays; the next item slides into this slot.
    }

    function pick(files: FileList | null, fallback: boolean) {
        const file = files?.[0];
        if (file) addFile(file);
        if (fallback) setMode("idle");
    }

    const miniTitle =
        current?.draft?.merchant?.trim() ||
        (current && !current.draft && current.status !== "failed"
            ? t("app.review.reading")
            : current?.status === "failed"
              ? t("app.queue.failed")
              : t("app.review.openCard"));

    return (
        <PhoneShell
            tone="page"
            pill={workspace?.spreadsheet_title}
            pillAction={workspace ? () => void openSheetPicker() : undefined}
        >
            <div
                className={`relative w-full flex-none overflow-hidden rounded-panel bg-[#2a1410] text-center text-peach ${
                    framing ? "" : "h-24"
                }`}
                style={framing ? { aspectRatio: String(videoAspect) } : undefined}
            >
                <video
                    ref={videoRef}
                    playsInline
                    muted
                    autoPlay
                    onLoadedMetadata={(e) => {
                        const v = e.currentTarget;
                        if (v.videoWidth && v.videoHeight) {
                            setVideoAspect(v.videoWidth / v.videoHeight);
                        }
                    }}
                    className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-300 ${
                        mode === "live" && !reviewBlocking
                            ? "opacity-100"
                            : "opacity-40"
                    }`}
                />
                {mode === "live" ? <GuideFrame /> : null}
                {mode === "live" && !reviewBlocking ? (
                    <span className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center">
                        <span className="rounded-full bg-black/55 px-3 py-1 text-xs font-semibold text-white">
                            {t("app.capture.tapToShoot")}
                        </span>
                    </span>
                ) : null}
                {mode !== "live" ? (
                    <span className="absolute inset-0 z-10 flex items-center justify-center text-sm text-peach">
                        {mode === "starting"
                            ? t("app.capture.starting")
                            : mode === "error"
                              ? t("app.capture.cameraError")
                              : t("app.capture.tapStart")}
                    </span>
                ) : !detection.sharp ? (
                    <span className="absolute bottom-4 left-0 right-0 z-10 text-xs font-semibold text-amber-200">
                        {t("app.capture.holdSteady")}
                    </span>
                ) : (
                    <span className="absolute bottom-4 left-0 right-0 z-10 px-6 text-xs text-white/80">
                        {t("app.capture.frame")}
                    </span>
                )}
                <button
                    type="button"
                    aria-label={t("app.capture.shutter")}
                    onClick={shutter}
                    disabled={outOfCredits || mode === "starting" || reviewBlocking}
                    className="absolute inset-0 z-20 cursor-pointer disabled:cursor-not-allowed"
                />
                {flash ? (
                    <span
                        className="pointer-events-none absolute inset-0 z-30 bg-white"
                        aria-hidden
                    />
                ) : null}
            </div>

            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden"
                onChange={(e) => { pick(e.target.files, true); e.target.value = ""; }} />
            <input
                ref={uploadInputRef}
                type="file"
                accept="image/*,application/pdf,.pdf"
                className="hidden"
                onChange={(e) => {
                    pick(e.target.files, false);
                    e.target.value = "";
                }}
            />

            <div className="flex items-center justify-between text-xs">
                <button type="button" onClick={() => uploadInputRef.current?.click()}
                    className="font-medium text-ink underline underline-offset-4">
                    {t("app.capture.upload")}
                </button>
                <div className="flex items-center gap-2">
                    {torchSupported ? (
                        <button
                            type="button"
                            aria-pressed={torchOn}
                            onClick={toggleFlash}
                            className={`rounded-full px-3 py-1 font-semibold ${
                                torchOn ? "bg-brand text-ink" : "bg-card text-ink shadow-sm"
                            }`}
                        >
                            {t("app.capture.flash")}
                            {torchOn ? ` · ${t("app.capture.on")}` : ""}
                        </button>
                    ) : null}
                    <button type="button" aria-pressed={autoSnap} onClick={() => setAutoSnap(!autoSnap)}
                        className={`rounded-full px-3 py-1 font-semibold ${autoSnap ? "bg-maroon text-white" : "bg-card text-ink shadow-sm"}`}>
                        {t("app.capture.autoSnap")}
                        {autoSnap ? ` · ${t("app.capture.on")}` : ""}
                    </button>
                </div>
            </div>

            {outOfCredits ? (
                <div className="rounded-2xl bg-card p-3 text-center text-sm shadow-sm">
                    <p className="font-semibold text-ink">{t("app.credits.none")}</p>
                    <button type="button" onClick={() => router.push("/app/topup")}
                        className="mt-2 rounded-full bg-maroon px-4 py-2 font-semibold text-white">
                        {t("app.topup.title")}
                    </button>
                </div>
            ) : null}

            {current && !reviewExpanded ? (
                <div className="review-card-in flex items-center gap-1 rounded-2xl border-2 border-line bg-card p-2 shadow-sm">
                    <button
                        type="button"
                        aria-label={t("app.review.prev")}
                        disabled={safeIndex <= 0}
                        onClick={() => goReview(-1)}
                        className="flex h-10 w-9 shrink-0 items-center justify-center rounded-xl text-xl font-bold text-ink disabled:opacity-30"
                    >
                        ‹
                    </button>
                    <button
                        type="button"
                        onClick={() => setReviewExpanded(true)}
                        className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-1 py-1 text-left"
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={current.thumb}
                            alt=""
                            className="h-12 w-12 shrink-0 rounded-lg object-cover ring-1 ring-line"
                        />
                        <span className="min-w-0">
                            <span className="block truncate text-sm font-bold text-ink">
                                {miniTitle}
                            </span>
                            <span className="block text-xs text-muted">
                                {fill(t("app.review.toReview"), {
                                    count: unaccepted.length,
                                })}
                                {unaccepted.length > 1
                                    ? ` · ${safeIndex + 1}/${unaccepted.length}`
                                    : ""}
                            </span>
                        </span>
                    </button>
                    <button
                        type="button"
                        aria-label={t("app.review.next")}
                        disabled={safeIndex >= unaccepted.length - 1}
                        onClick={() => goReview(1)}
                        className="flex h-10 w-9 shrink-0 items-center justify-center rounded-xl text-xl font-bold text-ink disabled:opacity-30"
                    >
                        ›
                    </button>
                </div>
            ) : null}

            {workspace ? (
                <a
                    href={`https://docs.google.com/spreadsheets/d/${workspace.spreadsheet_id}/edit`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center justify-center gap-2 rounded-full bg-mist px-6 py-4 font-semibold text-ink transition ${
                        sheetsShine ? "sheets-shine" : ""
                    }`}
                >
                    <SheetsIcon />
                    {t("app.sheets.open")}
                </a>
            ) : null}

            {reviewExpanded && current ? (
                <ReviewSheet
                    t={t}
                    current={current}
                    stack={unaccepted}
                    index={safeIndex}
                    onPrev={() => goReview(-1)}
                    onNext={() => goReview(1)}
                    onChange={(draft) => updateDraft(current.id, draft)}
                    onAccept={handleAccept}
                    onRetry={() => retryItem(current.id)}
                    onContribute={() => contributeItem(current.id)}
                    onRemove={() => removeItem(current.id)}
                    onMinimize={() => {
                        pendingMinimize.current = false;
                        setReviewExpanded(false);
                        if (mode !== "live") void openCamera();
                    }}
                />
            ) : null}

            {sheetPicker ? (
                <div className="fixed inset-0 z-40" onClick={() => setSheetPicker(false)}>
                    <div
                        className="mx-auto mt-16 w-full max-w-[430px] px-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="ml-auto w-full max-w-[320px] overflow-hidden rounded-2xl border-2 border-line bg-card text-body shadow-xl">
                            {sheetPickerBusy ? (
                                <span
                                    className="mx-auto my-5 block h-6 w-6 animate-spin rounded-full border-4 border-line border-t-brand"
                                    aria-hidden
                                />
                            ) : sheetChoices.length > 0 ? (
                                <ul className="max-h-72 overflow-y-auto">
                                    {sheetChoices.map((c) => (
                                        <li
                                            key={c.id}
                                            className="border-b border-line last:border-b-0"
                                        >
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    void pickSheet(c.id);
                                                    setSheetPicker(false);
                                                }}
                                                className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm hover:bg-surface"
                                            >
                                                <span className="truncate font-semibold">
                                                    {c.name}
                                                </span>
                                                {c.id === workspace?.spreadsheet_id ? (
                                                    <span className="flex-none text-brand">
                                                        ✓
                                                    </span>
                                                ) : null}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="px-4 py-3 text-sm text-muted">
                                    {t("app.sheets.emptyTitle")}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            ) : null}

            {toast ? (
                <div className="pointer-events-none fixed inset-x-0 bottom-28 z-[60] flex justify-center px-4">
                    <span className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white shadow-lg">
                        {toast}
                    </span>
                </div>
            ) : null}

            {notice ? (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-6">
                    <div className="w-full max-w-[360px] rounded-3xl bg-card p-5 text-body shadow-2xl">
                        <p className="font-head text-xl font-extrabold">
                            {t("app.notice.title")}
                        </p>
                        <p className="mt-2 whitespace-pre-line text-sm">
                            {notice.message}
                        </p>
                        {notice.credits > 0 ? (
                            <p className="mt-3 text-sm font-semibold text-brand">
                                {fill(t("app.notice.credits"), {
                                    count: notice.credits,
                                })}
                            </p>
                        ) : null}
                        <button
                            type="button"
                            onClick={() => {
                                setNotice(null);
                                void fetch("/api/notices/read", {
                                    method: "POST",
                                }).catch(() => undefined);
                            }}
                            className="mt-4 w-full rounded-full bg-btn px-6 py-3 font-semibold text-btntext"
                        >
                            {t("app.notice.ok")}
                        </button>
                    </div>
                </div>
            ) : null}
        </PhoneShell>
    );
}

function ReviewSheet({
    t,
    current,
    stack,
    index,
    onPrev,
    onNext,
    onChange,
    onAccept,
    onRetry,
    onContribute,
    onRemove,
    onMinimize,
}: {
    t: T;
    current: BatchItem;
    stack: BatchItem[];
    index: number;
    onPrev: () => void;
    onNext: () => void;
    onChange: (draft: Draft) => void;
    onAccept: () => void;
    onRetry: () => void;
    onContribute: () => void;
    onRemove: () => void;
    onMinimize: () => void;
}) {
    return (
        <div className="fixed inset-0 z-50 flex justify-center">
            <button
                type="button"
                aria-label={t("app.review.minimize")}
                onClick={onMinimize}
                className="absolute inset-0 bg-black/45"
            />
            <div className="review-sheet-up relative mt-auto flex max-h-[88vh] w-full max-w-[430px] flex-col rounded-t-3xl bg-card shadow-2xl">
                <div className="flex flex-none items-center justify-between gap-2 border-b border-line px-3 py-2.5">
                    <button
                        type="button"
                        onClick={onMinimize}
                        className="rounded-full bg-mist px-3 py-1.5 text-xs font-semibold text-ink"
                    >
                        ↓ {t("app.review.minimize")}
                    </button>
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            aria-label={t("app.review.prev")}
                            disabled={index <= 0}
                            onClick={onPrev}
                            className="flex h-8 w-8 items-center justify-center rounded-full text-lg font-bold disabled:opacity-30"
                        >
                            ‹
                        </button>
                        <span className="min-w-[4.5rem] text-center text-[11px] font-semibold text-muted">
                            {index + 1}/{stack.length}
                        </span>
                        <button
                            type="button"
                            aria-label={t("app.review.next")}
                            disabled={index >= stack.length - 1}
                            onClick={onNext}
                            className="flex h-8 w-8 items-center justify-center rounded-full text-lg font-bold disabled:opacity-30"
                        >
                            ›
                        </button>
                    </div>
                </div>

                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                    {current.status === "failed" ? (
                        <div className="min-h-0 flex-1 overflow-y-auto p-3">
                            <FailedCard
                                t={t}
                                item={current}
                                onRetry={onRetry}
                                onContribute={onContribute}
                                onRemove={onRemove}
                            />
                        </div>
                    ) : current.draft ? (
                        <ConfirmCard
                            t={t}
                            item={current}
                            onChange={onChange}
                            onAccept={onAccept}
                            onRemove={onRemove}
                        />
                    ) : (
                        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-12">
                            <span
                                className="h-8 w-8 animate-spin rounded-full border-4 border-line border-t-brand"
                                aria-hidden
                            />
                            <p className="text-sm text-muted">
                                {t("app.review.reading")}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function FailedCard({
    t,
    item,
    onRetry,
    onContribute,
    onRemove,
}: {
    t: T;
    item: BatchItem;
    onRetry: () => void;
    onContribute: () => void;
    onRemove: () => void;
}) {
    const [contributeDismissed, setContributeDismissed] = useState(false);
    return (
        <div>
            <p className="text-sm font-semibold text-danger">
                {item.error ?? t("app.queue.failed")}
            </p>
            <div className="mt-3 flex gap-2">
                <button type="button" onClick={onRetry}
                    className="rounded-full bg-maroon px-4 py-2 text-sm font-semibold text-white">
                    {t("app.queue.retry")}
                </button>
                <button type="button" onClick={onRemove}
                    className="rounded-full bg-mist px-4 py-2 text-sm font-semibold text-ink">
                    {t("app.review.delete")}
                </button>
            </div>
            {item.contributed ? (
                <p className="mt-3 text-xs font-medium text-green-700">
                    {t("app.contribute.thanks")}
                </p>
            ) : contributeDismissed ? null : (
                <div className="mt-3 rounded-xl border-2 border-line p-3">
                    <p className="text-xs font-semibold">{t("app.contribute.title")}</p>
                    <p className="mt-1 text-xs text-muted">{t("app.contribute.body")}</p>
                    <div className="mt-2 flex gap-2">
                        <button type="button" onClick={onContribute}
                            className="rounded-full bg-btn px-3 py-1 text-xs font-semibold text-btntext">
                            {t("app.contribute.yes")}
                        </button>
                        <button type="button" onClick={() => setContributeDismissed(true)}
                            className="rounded-full bg-mist px-3 py-1 text-xs font-semibold text-ink">
                            {t("app.contribute.no")}
                        </button>
                    </div>
                </div>
            )}
            <DebugPanel debug={item.debug} />
        </div>
    );
}

/** Minimal confirm card: store, date, items, total. Accept or Delete. */
function ConfirmCard({
    t,
    item,
    onChange,
    onAccept,
    onRemove,
}: {
    t: T;
    item: BatchItem;
    onChange: (draft: Draft) => void;
    onAccept: () => void;
    onRemove: () => void;
}) {
    const draft = item.draft ?? (item.receipt ? toDraft(item.receipt) : null);
    const [showErrors, setShowErrors] = useState(false);
    if (!draft) return null;
    const d: Draft = draft;

    const noLines = !d.lines.some(
        (l) =>
            l.description.trim() ||
            l.qty.trim() ||
            l.unitPrice.trim() ||
            l.amount.trim()
    );
    const noPrice =
        !d.lines.some((l) => l.amount.trim() !== "") && d.total.trim() === "";

    function patch(next: Partial<Draft>) {
        onChange({ ...d, ...next } as Draft);
    }
    function patchLine(i: number, next: Partial<Draft["lines"][number]>) {
        onChange({
            ...d,
            lines: d.lines.map((line, idx) =>
                idx === i ? { ...line, ...next } : line
            ),
        } as Draft);
    }
    function tryAccept() {
        setShowErrors(true);
        if (noLines || noPrice) return;
        onAccept();
    }

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-2.5">
                <input
                    value={d.merchant}
                    onChange={(e) => patch({ merchant: e.target.value })}
                    placeholder={t("app.check.merchantFallback")}
                    className={`${INPUT} font-head text-base font-extrabold`}
                />

                <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                    <label className="grid gap-0.5">
                        <span className={LABEL}>{t("app.check.category")}</span>
                        <input
                            value={d.category}
                            onChange={(e) => patch({ category: e.target.value })}
                            placeholder={t("app.check.category")}
                            className={INPUT}
                        />
                    </label>
                    <label className="grid gap-0.5">
                        <span className={LABEL}>{t("app.check.date")}</span>
                        <input
                            value={d.date}
                            onChange={(e) =>
                                patch({ date: e.target.value, dateAssumed: false })
                            }
                            placeholder={t("app.check.datePlaceholder")}
                            className={d.dateAssumed ? INPUT_ASSUMED : INPUT}
                        />
                    </label>
                    <label className="grid gap-0.5">
                        <span className={LABEL}>{t("app.check.subtotal")}</span>
                        <input
                            value={d.subtotal}
                            onChange={(e) => patch({ subtotal: e.target.value })}
                            inputMode="decimal"
                            className={`${INPUT} text-right tabular-money`}
                        />
                    </label>
                    <label className="grid gap-0.5">
                        <span className={LABEL}>{t("app.check.tax")}</span>
                        <input
                            value={d.tax}
                            onChange={(e) => patch({ tax: e.target.value })}
                            inputMode="decimal"
                            className={`${INPUT} text-right tabular-money`}
                        />
                    </label>
                    <label className="col-span-2 grid gap-0.5">
                        <span className={LABEL}>{t("app.check.total")}</span>
                        <input
                            value={d.total}
                            onChange={(e) => patch({ total: e.target.value })}
                            inputMode="decimal"
                            className={`${INPUT} text-right font-extrabold tabular-money`}
                        />
                    </label>
                </div>

                <div className="mt-1.5 grid gap-1">
                    {d.lines.map((line, i) => (
                        <div
                            key={i}
                            className="grid grid-cols-[minmax(0,1fr)_2.5rem_minmax(4.5rem,5.5rem)] items-center gap-1 rounded-lg border border-line p-1.5"
                        >
                            <input
                                value={line.description}
                                onChange={(e) =>
                                    patchLine(i, { description: e.target.value })
                                }
                                placeholder={t("app.check.item")}
                                className={INPUT}
                            />
                            <input
                                value={line.qty}
                                onChange={(e) =>
                                    patchLine(i, { qty: e.target.value })
                                }
                                placeholder={t("app.check.qty")}
                                inputMode="decimal"
                                aria-label={t("app.check.qty")}
                                className={`${INPUT_INLINE} text-center`}
                            />
                            <input
                                value={line.amount}
                                onChange={(e) =>
                                    patchLine(i, { amount: e.target.value })
                                }
                                placeholder={t("app.check.amt")}
                                inputMode="decimal"
                                aria-label={t("app.check.amt")}
                                className={`${INPUT_INLINE} text-right tabular-money`}
                            />
                        </div>
                    ))}
                    {showErrors && noLines ? (
                        <span className="text-[11px] font-medium text-danger">
                            {t("app.check.itemsErr")}
                        </span>
                    ) : null}
                    {showErrors && noPrice ? (
                        <span className="text-[11px] font-medium text-danger">
                            {t("app.check.priceErr")}
                        </span>
                    ) : null}
                </div>

                <div className="mt-1.5">
                    <DebugPanel debug={item.debug} />
                </div>
            </div>

            <div className="flex-none border-t border-line bg-card px-3 py-2">
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={tryAccept}
                        className="flex-1 rounded-full bg-btn px-4 py-2.5 text-sm font-semibold text-btntext"
                    >
                        {t("app.review.acceptCost")}
                    </button>
                    <button
                        type="button"
                        onClick={onRemove}
                        className="rounded-full border border-line px-4 py-2.5 text-sm font-semibold text-danger"
                    >
                        {t("app.review.delete")}
                    </button>
                </div>
            </div>
        </div>
    );
}
