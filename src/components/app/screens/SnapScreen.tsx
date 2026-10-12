"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import PhoneShell from "../PhoneShell";
import DebugPanel from "../DebugPanel";
import { useApp } from "../AppProvider";
import { useReceiptDetector } from "../useReceiptDetector";
import { fill, type T } from "@/lib/t";
import { toDraft, type Draft } from "../draft";
import { isSoftFlag } from "@/lib/verify-receipt";
import type { BatchItem } from "@/lib/batch-db";

const INPUT_BASE =
    "rounded-xl border-2 bg-surface px-3 py-2 text-body focus:outline-none";
const INPUT = `${INPUT_BASE} w-full border-line focus:border-brand`;
const INPUT_ASSUMED = `${INPUT_BASE} w-full border-amber-400 focus:border-amber-500`;
const INPUT_INLINE = `${INPUT_BASE} border-line focus:border-brand`;
const INPUT_INLINE_ASSUMED = `${INPUT_BASE} border-amber-400 focus:border-amber-500`;

/** Stored captures stay within this budget, matching REVISION-1 (~4 MP). */
const CAPTURE_MAX_PIXELS = 4_000_000;
const CAPTURE_QUALITY = 0.85;

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
        updateDraft,
        acceptItem,
        removeItem,
        retryItem,
        contributeItem,
        sendAll,
        sending,
        balance,
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
    const prevCount = useRef(0);

    const accepted = batch.filter((item) => item.status === "accepted");
    const unaccepted = batch.filter((item) => item.status !== "accepted");
    const current = unaccepted[0] ?? null;
    const readyToSend = accepted.length > 0 && unaccepted.length === 0;
    const overlayOpen = unaccepted.length > 0 && !dismissed;
    const outOfCredits = balance?.configured === true && balance.credits <= 0;

    const detection = useReceiptDetector(videoRef, mode === "live" && !overlayOpen);

    useEffect(() => {
        if (batch.length > prevCount.current) setDismissed(false);
        prevCount.current = batch.length;
    }, [batch.length]);

    /** Pause and fade the camera while a confirm card is open. */
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        if (overlayOpen) {
            video.pause();
        } else if (mode === "live") {
            void video.play().catch(() => undefined);
        }
    }, [overlayOpen, mode]);

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

    useEffect(() => () => stopCamera(), []);

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

    async function captureFrameBlob(): Promise<Blob | null> {
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
        return new Promise((resolve) =>
            canvas.toBlob((b) => resolve(b), "image/jpeg", CAPTURE_QUALITY)
        );
    }

    function fileFrom(blob: Blob): File {
        const type = blob.type || "image/jpeg";
        const ext = type.includes("png") ? "png" : "jpg";
        return new File([blob], `receipt-${Date.now()}.${ext}`, { type });
    }

    async function manualCapture() {
        const blob = await captureFrameBlob();
        if (blob) addFile(fileFrom(blob), "manual");
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
            const blob = await captureFrameBlob();
            if (blob) addFile(fileFrom(blob), "auto");
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [autoSnap, mode, detection, outOfCredits, autoCooldownUntil, overlayOpen]);

    function pick(files: FileList | null, fallback: boolean) {
        const file = files?.[0];
        if (file) addFile(file);
        if (fallback) setMode("idle");
    }

    return (
        <PhoneShell tone="brand" pill={workspace?.spreadsheet_title}>
            <h2 className="mt-2 font-head text-3xl font-extrabold leading-none">
                {t("app.capture.title")}
            </h2>
            <p className="max-w-[30ch]">{t("app.capture.body")}</p>

            <div
                className="relative w-full flex-none overflow-hidden rounded-panel bg-[#2a1410] text-center text-peach"
                style={{ aspectRatio: String(videoAspect) }}
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
            </div>

            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden"
                onChange={(e) => { pick(e.target.files, true); e.target.value = ""; }} />
            <input ref={uploadInputRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { pick(e.target.files, false); e.target.value = ""; }} />

            {mode === "live" ? (
                <p className="mt-1 text-center text-xs opacity-80">
                    {t("app.capture.tapToShoot")}
                </p>
            ) : null}
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

            {readyToSend ? (
                <button
                    type="button"
                    disabled={sending}
                    onClick={() => void sendAll()}
                    className="rounded-full bg-maroon px-6 py-4 font-semibold text-white disabled:opacity-60"
                >
                    {fill(t("app.review.sendAll"), { count: accepted.length })}
                </button>
            ) : null}

            {overlayOpen && current ? (
                <ReviewOverlay
                    t={t}
                    current={current}
                    stack={unaccepted}
                    accepted={accepted.length}
                    total={batch.length}
                    readyToSend={readyToSend}
                    sending={sending}
                    onChange={(draft) => updateDraft(current.id, draft)}
                    onAccept={() => acceptItem(current.id)}
                    onRetry={() => retryItem(current.id)}
                    onContribute={() => contributeItem(current.id)}
                    onRemove={() => removeItem(current.id)}
                    onCaptureMore={() => setDismissed(true)}
                    onSend={() => void sendAll()}
                />
            ) : null}
        </PhoneShell>
    );
}

function ReviewOverlay({
    t,
    current,
    stack,
    accepted,
    total,
    readyToSend,
    sending,
    onChange,
    onAccept,
    onRetry,
    onContribute,
    onRemove,
    onCaptureMore,
    onSend,
}: {
    t: T;
    current: BatchItem;
    stack: BatchItem[];
    accepted: number;
    total: number;
    readyToSend: boolean;
    sending: boolean;
    onChange: (draft: Draft) => void;
    onAccept: () => void;
    onRetry: () => void;
    onContribute: () => void;
    onRemove: () => void;
    onCaptureMore: () => void;
    onSend: () => void;
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
                        {fill(t("app.review.progress"), { done: accepted, total })}
                    </span>
                    {readyToSend ? (
                        <button
                            type="button"
                            disabled={sending}
                            onClick={onSend}
                            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-maroon disabled:opacity-60"
                        >
                            {fill(t("app.review.sendAll"), { count: accepted })}
                        </button>
                    ) : (
                        <span className="w-12" />
                    )}
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

    const flagged = d.flagged ?? [];
    const reviewed = d.reviewed ?? [];
    const flagByPath = new Map(
        (item.receipt?.flags ?? []).map((flag) => [flag.path, flag])
    );
    // One chip per field: the same path can be flagged more than once.
    const pending = Array.from(
        new Set(flagged.filter((path) => !reviewed.includes(path)))
    );
    const isSoft = (path: string) => isSoftFlag(flagByPath.get(path)?.reason);
    const pendingHard = pending.filter((path) => !isSoft(path));

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
    function review(path: string) {
        if (!flagged.includes(path) || reviewed.includes(path)) return;
        patch({ reviewed: [...reviewed, path] });
    }
    function isPending(path: string): boolean {
        return pending.includes(path);
    }
    function fieldClass(path: string): string {
        return isPending(path) ? INPUT_ASSUMED : INPUT;
    }
    function inlineClass(path: string): string {
        return isPending(path) ? INPUT_INLINE_ASSUMED : INPUT_INLINE;
    }
    function flagLabel(path: string): string {
        if (path === "merchant") return t("app.check.merchantFallback");
        if (path === "date") return t("app.check.date");
        if (path === "total") return t("app.check.total");
        if (path === "subtotal") return t("app.check.subtotal");
        if (path === "tax") return t("app.check.tax");
        const line = path.match(/^line_items\[(\d+)\]\.(qty|unit_price|amount)$/);
        if (line) {
            const field =
                line[2] === "qty"
                    ? t("app.check.qty")
                    : line[2] === "unit_price"
                      ? t("app.check.unitPrice")
                      : t("app.check.amt");
            return fill(t("app.review.lineFlag"), { n: Number(line[1]) + 1, field });
        }
        return path;
    }
    function tryAccept() {
        setShowErrors(true);
        if (noLines || noPrice || pendingHard.length > 0) return;
        onAccept();
    }

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
                <input
                    value={d.merchant}
                    onFocus={() => review("merchant")}
                    onChange={(e) => patch({ merchant: e.target.value })}
                    placeholder={t("app.check.merchantFallback")}
                    className={`${fieldClass("merchant")} font-head text-xl font-extrabold`}
                />

                <div className="mt-2 flex gap-2">
                    <label className="grid flex-1 gap-1">
                        <span className="text-xs font-semibold">{t("app.check.date")}</span>
                        <input
                            value={d.date}
                            onFocus={() => review("date")}
                            onChange={(e) => patch({ date: e.target.value, dateAssumed: false })}
                            placeholder="dd/mm/yyyy"
                            className={isPending("date") || d.dateAssumed ? INPUT_ASSUMED : INPUT}
                        />
                    </label>
                    <label className="grid w-32 gap-1">
                        <span className="text-xs font-semibold">{t("app.check.total")}</span>
                        <input
                            value={d.total}
                            onFocus={() => review("total")}
                            onChange={(e) => patch({ total: e.target.value })}
                            inputMode="decimal"
                            className={`${fieldClass("total")} text-right font-extrabold tabular-money`}
                        />
                    </label>
                </div>

                <div className="mt-2 flex gap-2">
                    <label className="grid flex-1 gap-1">
                        <span className="text-xs font-semibold">{t("app.check.subtotal")}</span>
                        <input
                            value={d.subtotal}
                            onFocus={() => review("subtotal")}
                            onChange={(e) => patch({ subtotal: e.target.value })}
                            inputMode="decimal"
                            className={`${fieldClass("subtotal")} text-right tabular-money`}
                        />
                    </label>
                    <label className="grid flex-1 gap-1">
                        <span className="text-xs font-semibold">{t("app.check.tax")}</span>
                        <input
                            value={d.tax}
                            onFocus={() => review("tax")}
                            onChange={(e) => patch({ tax: e.target.value })}
                            inputMode="decimal"
                            className={`${fieldClass("tax")} text-right tabular-money`}
                        />
                    </label>
                </div>

                <div className="mt-2 grid gap-2">
                    {d.lines.map((line, i) => {
                        const qtyPath = `line_items[${i}].qty`;
                        const unitPath = `line_items[${i}].unit_price`;
                        const amountPath = `line_items[${i}].amount`;
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
                                        onFocus={() => review(qtyPath)}
                                        onChange={(e) => patchLine(i, { qty: e.target.value })}
                                        placeholder={t("app.check.qty")}
                                        inputMode="decimal"
                                        className={`${inlineClass(qtyPath)} w-14 text-center`}
                                    />
                                    <input
                                        value={line.unitPrice}
                                        onFocus={() => review(unitPath)}
                                        onChange={(e) => patchLine(i, { unitPrice: e.target.value })}
                                        placeholder={t("app.check.unitPrice")}
                                        inputMode="decimal"
                                        className={`${inlineClass(unitPath)} min-w-0 flex-1 text-right tabular-money`}
                                    />
                                    <input
                                        value={line.amount}
                                        onFocus={() => review(amountPath)}
                                        onChange={(e) => patchLine(i, { amount: e.target.value })}
                                        placeholder={t("app.check.amt")}
                                        inputMode="decimal"
                                        className={`${inlineClass(amountPath)} w-24 text-right tabular-money`}
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

                {pending.length > 0 ? (
                    <div className="mt-3 rounded-xl border-2 border-amber-400 bg-amber-50 p-2">
                        <p className="text-xs font-semibold text-amber-700">
                            {t("app.review.flagsTitle")}
                        </p>
                        <p className="mt-0.5 text-xs text-amber-700">
                            {t("app.review.tapToConfirm")}
                        </p>
                        <ul className="mt-1 flex flex-wrap gap-1">
                            {pending.map((path) => (
                                <li key={path}>
                                    <button
                                        type="button"
                                        onClick={() => review(path)}
                                        className="rounded-full bg-white px-2 py-1 text-left text-xs"
                                    >
                                        <span className="font-semibold text-ink">{flagLabel(path)}</span>
                                        <span className="ml-1 font-semibold text-amber-700">
                                            {isSoft(path)
                                                ? t("app.review.softFlag")
                                                : t("app.review.hardFlag")}
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : null}

                <div className="mt-3">
                    <DebugPanel debug={item.debug} />
                </div>
            </div>

            <div className="flex-none border-t-2 border-line bg-card p-3">
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={tryAccept}
                        disabled={pendingHard.length > 0}
                        className="flex-1 rounded-full bg-btn px-4 py-3 font-semibold text-btntext disabled:opacity-60"
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
