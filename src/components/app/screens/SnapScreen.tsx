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
    "rounded-xl border-2 bg-surface px-3 py-2 text-body focus:outline-none";
const INPUT = `${INPUT_BASE} w-full border-line focus:border-brand`;
const INPUT_ASSUMED = `${INPUT_BASE} w-full border-amber-400 focus:border-amber-500`;
const INPUT_INLINE = `${INPUT_BASE} border-line focus:border-brand`;

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

    // The review overlay opens on a new capture and can be dismissed to snap more.
    const [dismissed, setDismissed] = useState(false);
    // White flash shown on a tap, right before the camera stops.
    const [flash, setFlash] = useState(false);
    const flashTimer = useRef<number | null>(null);
    // Quick sheet selector, opened from the sheet-name pill.
    const [sheetPicker, setSheetPicker] = useState(false);
    const [sheetChoices, setSheetChoices] = useState<SheetCandidate[]>([]);
    const [sheetPickerBusy, setSheetPickerBusy] = useState(false);
    // Soft "saved" toast after a successful append.
    const [toast, setToast] = useState(false);
    const toastTimer = useRef<number | null>(null);
    const prevCount = useRef(0);

    // Accepted and in-flight items are hidden from the review queue.
    const unaccepted = batch.filter(
        (item) => item.status !== "accepted" && item.status !== "sending"
    );
    const current = unaccepted[0] ?? null;
    const overlayOpen = unaccepted.length > 0 && !dismissed;
    const framing = mode === "live" || flash;
    const outOfCredits = balance?.configured === true && balance.credits <= 0;

    const detection = useReceiptDetector(videoRef, mode === "live" && !overlayOpen);

    useEffect(() => {
        if (batch.length > prevCount.current) setDismissed(false);
        prevCount.current = batch.length;
    }, [batch.length]);

    /** A review card is open: stop the viewfinder until the user captures more. */
    useEffect(() => {
        if (!overlayOpen) return;
        stopCamera();
        setMode("idle");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [overlayOpen]);

    /** Soft "saved" toast whenever an append succeeds. */
    useEffect(() => {
        if (savedTick === 0) return;
        setToast(true);
        if (toastTimer.current) window.clearTimeout(toastTimer.current);
        toastTimer.current = window.setTimeout(() => {
            setToast(false);
            toastTimer.current = null;
        }, 1800);
    }, [savedTick]);

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
            stopCamera();
        },
        []
    );

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

        // The frame is grabbed. Drop the live view right away.
        stopCamera();
        setMode("idle");

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
        // Flash the viewfinder as feedback, then grab the frame. The camera is
        // stopped when the review card opens (see the overlayOpen effect).
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
        setSheetChoices(list);
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
        if (!autoSnap || mode !== "live" || outOfCredits || overlayOpen) return;
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
    }, [autoSnap, mode, detection, outOfCredits, autoCooldownUntil, overlayOpen]);

    function pick(files: FileList | null, fallback: boolean) {
        const file = files?.[0];
        if (file) addFile(file);
        if (fallback) setMode("idle");
    }

    return (
        <PhoneShell
            tone="brand"
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
                        mode === "live" && !overlayOpen ? "opacity-100" : "opacity-25"
                    }`}
                />
                {mode === "live" ? <GuideFrame /> : null}
                {mode === "live" ? (
                    <span className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center">
                        <span className="rounded-full bg-black/55 px-3 py-1 text-xs font-semibold text-white">
                            {t("app.capture.tapToShoot")}
                        </span>
                    </span>
                ) : null}
                {mode !== "live" ? (
                    <span className="absolute inset-0 z-10 flex items-center justify-center text-sm">
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
                    <span className="absolute bottom-4 left-0 right-0 z-10 px-6 text-xs opacity-80">
                        {t("app.capture.frame")}
                    </span>
                )}
                {/* The viewfinder is the shutter. */}
                <button
                    type="button"
                    aria-label={t("app.capture.shutter")}
                    onClick={shutter}
                    disabled={outOfCredits || mode === "starting"}
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
            <input ref={uploadInputRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { pick(e.target.files, false); e.target.value = ""; }} />

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
                                torchOn ? "bg-brand text-ink" : "bg-peach text-ink"
                            }`}
                        >
                            {t("app.capture.flash")}
                            {torchOn ? " · ON" : ""}
                        </button>
                    ) : null}
                    <button type="button" aria-pressed={autoSnap} onClick={() => setAutoSnap(!autoSnap)}
                        className={`rounded-full px-3 py-1 font-semibold ${autoSnap ? "bg-maroon text-white" : "bg-peach text-ink"}`}>
                        {t("app.capture.autoSnap")}
                        {autoSnap ? " · ON" : ""}
                    </button>
                </div>
            </div>

            {outOfCredits ? (
                <div className="rounded-2xl bg-peach p-3 text-center text-sm">
                    <p className="font-semibold text-ink">{t("app.credits.none")}</p>
                    <button type="button" onClick={() => router.push("/app/topup")}
                        className="mt-2 rounded-full bg-maroon px-4 py-2 font-semibold text-white">
                        {t("app.topup.title")}
                    </button>
                </div>
            ) : null}

            {!overlayOpen && unaccepted.length > 0 ? (
                <button
                    type="button"
                    onClick={() => setDismissed(false)}
                    className="rounded-full bg-maroon px-4 py-2 text-sm font-semibold text-white"
                >
                    {fill(t("app.review.toReview"), { count: unaccepted.length })}
                </button>
            ) : null}

            {workspace ? (
                <a
                    href={`https://docs.google.com/spreadsheets/d/${workspace.spreadsheet_id}/edit`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-auto flex items-center justify-center gap-2 rounded-full bg-mist px-6 py-4 font-semibold text-ink"
                >
                    <SheetsIcon />
                    {t("app.sheets.open")}
                </a>
            ) : null}

            {overlayOpen && current ? (
                <ReviewOverlay
                    t={t}
                    current={current}
                    stack={unaccepted}
                    onChange={(draft) => updateDraft(current.id, draft)}
                    onAccept={() => acceptItem(current.id)}
                    onRetry={() => retryItem(current.id)}
                    onContribute={() => contributeItem(current.id)}
                    onRemove={() => removeItem(current.id)}
                    onCaptureMore={() => {
                        setDismissed(true);
                        // The camera stopped after the tap; bring it back.
                        if (mode !== "live") void openCamera();
                    }}
                />
            ) : null}

            {sheetPicker ? (
                <div
                    className="fixed inset-0 z-40 flex items-end justify-center bg-black/60"
                    onClick={() => setSheetPicker(false)}
                >
                    <div
                        className="w-full max-w-[430px] rounded-t-3xl bg-card p-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <p className="font-head text-lg font-extrabold">
                            {t("app.sheets.title")}
                        </p>
                        <p className="mt-1 text-xs text-muted">{t("app.sheets.body")}</p>
                        {sheetPickerBusy ? (
                            <span
                                className="mx-auto my-6 block h-7 w-7 animate-spin rounded-full border-4 border-line border-t-brand"
                                aria-hidden
                            />
                        ) : sheetChoices.length > 0 ? (
                            <div className="mt-3 grid gap-2">
                                {sheetChoices.map((c) => (
                                    <button
                                        key={c.id}
                                        type="button"
                                        onClick={() => {
                                            void pickSheet(c.id);
                                            setSheetPicker(false);
                                        }}
                                        className={`rounded-2xl border-2 px-4 py-3 text-left ${
                                            c.id === workspace?.spreadsheet_id
                                                ? "border-brand"
                                                : "border-line"
                                        }`}
                                    >
                                        <span className="block font-semibold">{c.name}</span>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <p className="mt-3 text-sm text-muted">
                                {t("app.sheets.emptyTitle")}
                            </p>
                        )}
                        <button
                            type="button"
                            onClick={() => setSheetPicker(false)}
                            className="mt-3 w-full rounded-full bg-mist px-6 py-3 font-semibold text-ink"
                        >
                            {t("app.sheets.cancel")}
                        </button>
                    </div>
                </div>
            ) : null}

            {toast ? (
                <div className="pointer-events-none fixed inset-x-0 bottom-28 z-[60] flex justify-center px-4">
                    <span className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white shadow-lg">
                        {t("app.review.saved")}
                    </span>
                </div>
            ) : null}
        </PhoneShell>
    );
}

function ReviewOverlay({
    t,
    current,
    stack,
    onChange,
    onAccept,
    onRetry,
    onContribute,
    onRemove,
    onCaptureMore,
}: {
    t: T;
    current: BatchItem;
    stack: BatchItem[];
    onChange: (draft: Draft) => void;
    onAccept: () => void;
    onRetry: () => void;
    onContribute: () => void;
    onRemove: () => void;
    onCaptureMore: () => void;
}) {
    return (
        <div className="fixed inset-0 z-50 flex justify-center bg-black/70">
            <div className="flex h-full w-full max-w-[430px] flex-col">
                <div className="flex items-center justify-between gap-2 px-4 py-3 text-white">
                    <button
                        type="button"
                        onClick={onCaptureMore}
                        className="rounded-full bg-white/15 px-4 py-2 text-sm font-semibold"
                    >
                        ↓ {t("app.review.captureMore")}
                    </button>
                    <span className="text-xs">
                        {fill(t("app.review.toReview"), { count: stack.length })}
                    </span>
                </div>

                <div className="flex flex-1 items-center justify-center px-4 pb-6">
                    <div className="relative w-full">
                        {stack.length > 2 ? (
                            <div className="absolute inset-x-6 -top-4 h-8 rounded-t-3xl bg-white/15" aria-hidden />
                        ) : null}
                        {stack.length > 1 ? (
                            <div className="absolute inset-x-3 -top-2 h-8 rounded-t-3xl bg-white/25" aria-hidden />
                        ) : null}
                        <div className="relative flex max-h-[78vh] w-full flex-col overflow-hidden rounded-3xl bg-card shadow-2xl">
                            {current.status === "failed" ? (
                                <div className="min-h-0 flex-1 overflow-y-auto p-4">
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
                                <p className="py-10 text-center text-sm text-muted">
                                    {t("app.review.reading")}
                                </p>
                            )}
                        </div>
                    </div>
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
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
                <input
                    value={d.merchant}
                    onChange={(e) => patch({ merchant: e.target.value })}
                    placeholder={t("app.check.merchantFallback")}
                    className={`${INPUT} font-head text-xl font-extrabold`}
                />

                <div className="mt-2 flex gap-2">
                    <label className="grid flex-1 gap-1">
                        <span className="text-xs font-semibold">{t("app.check.date")}</span>
                        <input
                            value={d.date}
                            onChange={(e) => patch({ date: e.target.value, dateAssumed: false })}
                            placeholder="dd/mm/yyyy"
                            className={d.dateAssumed ? INPUT_ASSUMED : INPUT}
                        />
                    </label>
                    <label className="grid w-32 gap-1">
                        <span className="text-xs font-semibold">{t("app.check.total")}</span>
                        <input
                            value={d.total}
                            onChange={(e) => patch({ total: e.target.value })}
                            inputMode="decimal"
                            className={`${INPUT} text-right font-extrabold tabular-money`}
                        />
                    </label>
                </div>

                <div className="mt-2 flex gap-2">
                    <label className="grid flex-1 gap-1">
                        <span className="text-xs font-semibold">{t("app.check.subtotal")}</span>
                        <input
                            value={d.subtotal}
                            onChange={(e) => patch({ subtotal: e.target.value })}
                            inputMode="decimal"
                            className={`${INPUT} text-right tabular-money`}
                        />
                    </label>
                    <label className="grid flex-1 gap-1">
                        <span className="text-xs font-semibold">{t("app.check.tax")}</span>
                        <input
                            value={d.tax}
                            onChange={(e) => patch({ tax: e.target.value })}
                            inputMode="decimal"
                            className={`${INPUT} text-right tabular-money`}
                        />
                    </label>
                </div>

                <div className="mt-2 grid gap-2">
                    {d.lines.map((line, i) => {
                        return (
                            <div key={i} className="rounded-xl border-2 border-line p-2">
                                <input
                                    value={line.description}
                                    onChange={(e) => patchLine(i, { description: e.target.value })}
                                    placeholder={t("app.check.item")}
                                    className={INPUT}
                                />
                                <div className="mt-2 flex items-center gap-2">
                                    <input
                                        value={line.qty}
                                        onChange={(e) => patchLine(i, { qty: e.target.value })}
                                        placeholder={t("app.check.qty")}
                                        inputMode="decimal"
                                        className={`${INPUT_INLINE} w-14 text-center`}
                                    />
                                    <input
                                        value={line.unitPrice}
                                        onChange={(e) => patchLine(i, { unitPrice: e.target.value })}
                                        placeholder={t("app.check.unitPrice")}
                                        inputMode="decimal"
                                        className={`${INPUT_INLINE} min-w-0 flex-1 text-right tabular-money`}
                                    />
                                    <input
                                        value={line.amount}
                                        onChange={(e) => patchLine(i, { amount: e.target.value })}
                                        placeholder={t("app.check.amt")}
                                        inputMode="decimal"
                                        className={`${INPUT_INLINE} w-24 text-right tabular-money`}
                                    />
                                </div>
                            </div>
                        );
                    })}
                    {showErrors && noLines ? (
                        <span className="text-xs font-medium text-danger">{t("app.check.itemsErr")}</span>
                    ) : null}
                    {showErrors && noPrice ? (
                        <span className="text-xs font-medium text-danger">{t("app.check.priceErr")}</span>
                    ) : null}
                </div>

                <div className="mt-3">
                    <DebugPanel debug={item.debug} />
                </div>
            </div>

            <div className="flex-none border-t-2 border-line bg-card p-3">
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={tryAccept}
                        className="flex-1 rounded-full bg-btn px-4 py-3 font-semibold text-btntext"
                    >
                        {t("app.review.accept")}
                    </button>
                    <button
                        type="button"
                        onClick={onRemove}
                        className="rounded-full border-2 border-line px-4 py-3 font-semibold text-danger"
                    >
                        {t("app.review.delete")}
                    </button>
                </div>
            </div>
        </div>
    );
}
