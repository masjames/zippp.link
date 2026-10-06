"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import PhoneShell from "../PhoneShell";
import DebugPanel from "../DebugPanel";
import { useApp } from "../AppProvider";
import { useReceiptDetector } from "../useReceiptDetector";
import { fill, type T } from "@/lib/t";
import { toDraft, type Draft } from "../draft";
import type { BatchItem } from "@/lib/batch-db";
import type { Workspace } from "../AppProvider";

const INPUT =
    "w-full rounded-xl border-2 border-line bg-surface px-3 py-2 text-body focus:border-brand focus:outline-none";
const INPUT_BAD =
    "w-full rounded-xl border-2 border-danger bg-surface px-3 py-2 text-body focus:outline-none";

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

export default function SnapScreen() {
    const {
        t,
        workspace,
        batch,
        openId,
        autoSnap,
        setAutoSnap,
        addFile,
        setOpen,
        updateDraft,
        acceptItem,
        removeItem,
        retryItem,
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

    const detection = useReceiptDetector(videoRef, mode === "live");
    const outOfCredits = balance?.configured === true && balance.credits <= 0;

    const accepted = batch.filter((item) => item.status === "accepted");
    const unaccepted = batch.filter((item) => item.status !== "accepted");
    const currentId =
        openId && unaccepted.some((i) => i.id === openId)
            ? openId
            : (unaccepted[0]?.id ?? null);
    const readyToSend = accepted.length > 0 && unaccepted.length === 0;

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
                addFile(
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
        if (outOfCredits) return;
        if (mode !== "live") {
            void openCamera();
            return;
        }
        // Blur hard-blocks capture.
        if (detection.found && !detection.sharp) return;
        captureFrame();
    }

    // Auto-snap: sharp + steady + large enough, then re-arm.
    useEffect(() => {
        if (!detection.found) armed.current = true;
    }, [detection.found]);

    useEffect(() => {
        if (!autoSnap || mode !== "live" || outOfCredits) return;
        const { found, box, sharp, stable } = detection;
        if (!found || !box || !sharp || !stable) return;
        if (box.w * box.h < 0.2) return;
        if (!armed.current) return;
        armed.current = false;
        captureFrame();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [autoSnap, mode, detection, outOfCredits]);

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

            <div className="relative flex min-h-[220px] flex-1 items-center justify-center overflow-hidden rounded-panel bg-[#2a1410] px-6 text-center text-peach">
                <video
                    ref={videoRef}
                    playsInline
                    muted
                    autoPlay
                    className={`absolute inset-0 h-full w-full object-cover transition-opacity ${
                        mode === "live" ? "opacity-100" : "opacity-0"
                    }`}
                />
                {mode !== "live" ? (
                    <span className="relative z-10 text-sm">
                        {mode === "starting"
                            ? t("app.capture.starting")
                            : mode === "error"
                              ? t("app.capture.cameraError")
                              : t("app.capture.tapStart")}
                    </span>
                ) : detection.found && !detection.sharp ? (
                    <span className="absolute bottom-4 left-0 right-0 z-10 text-xs font-semibold text-amber-200">
                        {t("app.capture.holdSteady")}
                    </span>
                ) : !detection.box ? (
                    <span className="absolute bottom-4 left-0 right-0 z-10 px-6 text-xs opacity-80">
                        {t("app.capture.frame")}
                    </span>
                ) : null}

                {mode === "live" && detection.box ? (
                    <div
                        className={`pointer-events-none absolute rounded-lg border-2 ${
                            detection.sharp && detection.stable
                                ? "border-green-400"
                                : "border-amber-300"
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

            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden"
                onChange={(e) => { pick(e.target.files, true); e.target.value = ""; }} />
            <input ref={uploadInputRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { pick(e.target.files, false); e.target.value = ""; }} />

            <button
                type="button"
                aria-label={t("app.capture.shutter")}
                onClick={shutter}
                disabled={outOfCredits}
                className="mx-auto mt-1 block h-[72px] w-[72px] rounded-full border-[6px] border-maroon bg-white active:scale-95 disabled:opacity-40"
            />
            <div className="flex items-center justify-between text-xs">
                <button type="button" onClick={() => uploadInputRef.current?.click()}
                    className="font-medium text-ink underline underline-offset-4">
                    {t("app.capture.upload")}
                </button>
                <button type="button" aria-pressed={autoSnap} onClick={() => setAutoSnap(!autoSnap)}
                    className={`rounded-full px-3 py-1 font-semibold ${autoSnap ? "bg-maroon text-white" : "bg-peach text-ink"}`}>
                    {t("app.capture.autoSnap")}
                    {autoSnap ? " · ON" : ""}
                </button>
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

            {batch.length > 0 ? (
                <p className="text-center text-xs font-semibold text-ink">
                    {fill(t("app.review.progress"), {
                        done: accepted.length,
                        total: batch.length,
                    })}
                </p>
            ) : null}

            <div className="grid gap-2">
                {unaccepted.map((item) =>
                    item.id === currentId ? (
                        <ExpandedCard
                            key={item.id}
                            t={t}
                            item={item}
                            workspace={workspace}
                            onChange={(draft) => updateDraft(item.id, draft)}
                            onAccept={() => acceptItem(item.id)}
                            onRetry={() => retryItem(item.id)}
                            onRemove={() => removeItem(item.id)}
                            onCollapse={() => {
                                const others = unaccepted.filter((i) => i.id !== item.id);
                                setOpen(others[0]?.id ?? null);
                            }}
                        />
                    ) : (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => setOpen(item.id)}
                            className="flex items-center gap-3 rounded-2xl bg-surface p-2 text-left"
                        >
                            {item.thumb ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={item.thumb} alt="" className="h-10 w-10 flex-none rounded-lg object-cover" />
                            ) : (
                                <span className="h-10 w-10 flex-none rounded-lg bg-card" aria-hidden />
                            )}
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium">
                                    {item.receipt?.merchant ?? t("app.queue.ready")}
                                </span>
                                <span className="block text-xs text-muted">
                                    {t("app.review.tapToEdit")}
                                </span>
                            </span>
                        </button>
                    )
                )}
            </div>

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
        </PhoneShell>
    );
}

function ExpandedCard({
    t,
    item,
    workspace,
    onChange,
    onAccept,
    onRetry,
    onRemove,
    onCollapse,
}: {
    t: T;
    item: BatchItem;
    workspace: Workspace | null;
    onChange: (draft: Draft) => void;
    onAccept: () => void;
    onRetry: () => void;
    onRemove: () => void;
    onCollapse: () => void;
}) {
    const draft = item.draft ?? (item.receipt ? toDraft(item.receipt) : null);
    const [showErrors, setShowErrors] = useState(false);

    if (item.status === "failed") {
        return (
            <div className="rounded-2xl bg-surface p-3">
                <p className="text-sm font-semibold text-danger">
                    {item.error ?? t("app.queue.failed")}
                </p>
                <div className="mt-2 flex gap-2">
                    <button type="button" onClick={onRetry}
                        className="rounded-full bg-maroon px-4 py-2 text-sm font-semibold text-white">
                        {t("app.queue.retry")}
                    </button>
                    <button type="button" onClick={onRemove}
                        className="rounded-full bg-mist px-4 py-2 text-sm font-semibold text-ink">
                        {t("app.queue.remove")}
                    </button>
                </div>
                <DebugPanel debug={item.debug} />
            </div>
        );
    }

    if (!draft) {
        return (
            <div className="rounded-2xl bg-surface p-3 text-sm text-muted">
                {t("app.queue.reading")}
            </div>
        );
    }

    const d: Draft = draft;
    const requireStaff = workspace?.template_id === "resto-inventory";
    const requireOutlet = (workspace?.outlets?.length ?? 0) > 1;
    const dateMissing = d.date.trim() === "";
    const staffMissing = requireStaff && d.staff.trim() === "";
    const outletMissing = requireOutlet && d.outlet.trim() === "";
    const noLines = !d.lines.some((l) => l.description.trim() || l.amount.trim());

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
        if (dateMissing || staffMissing || outletMissing || noLines) return;
        onAccept();
    }

    return (
        <div className="rounded-2xl bg-card p-3">
            <p className="mb-2 text-xs font-semibold text-muted">
                {t("app.review.tapToEdit")}
            </p>

            <input
                value={draft.merchant}
                onChange={(e) => patch({ merchant: e.target.value })}
                placeholder={t("app.check.merchantFallback")}
                className={`${INPUT} mb-2 font-head text-xl font-extrabold`}
            />

            <div className="grid grid-cols-2 gap-2">
                <label className="grid gap-1">
                    <span className="text-xs font-semibold">{t("app.check.date")}</span>
                    <input value={draft.date} onChange={(e) => patch({ date: e.target.value })}
                        placeholder="dd/mm/yyyy" className={showErrors && dateMissing ? INPUT_BAD : INPUT} />
                </label>
                <label className="grid gap-1">
                    <span className="text-xs font-semibold">{t("app.check.staff")}</span>
                    <input value={draft.staff} onChange={(e) => patch({ staff: e.target.value })}
                        className={showErrors && staffMissing ? INPUT_BAD : INPUT} />
                </label>
            </div>

            <label className="mt-2 grid gap-1">
                <span className="text-xs font-semibold">
                    {t("app.check.outlet")} ({t("app.check.optional")})
                </span>
                <input value={draft.outlet} onChange={(e) => patch({ outlet: e.target.value })}
                    className={showErrors && outletMissing ? INPUT_BAD : INPUT} />
            </label>

            <div className="mt-2 grid gap-2">
                {draft.lines.map((line, i) => (
                    <div key={i} className="grid gap-2 rounded-xl border-2 border-line p-2">
                        <input value={line.description} onChange={(e) => patchLine(i, { description: e.target.value })}
                            placeholder={t("app.check.item")} className={INPUT} />
                        <div className="flex gap-2">
                            <input value={line.qty} onChange={(e) => patchLine(i, { qty: e.target.value })}
                                placeholder={t("app.check.qty")} inputMode="decimal" className={`${INPUT} w-20`} />
                            <input value={line.amount} onChange={(e) => patchLine(i, { amount: e.target.value })}
                                placeholder={t("app.check.amt")} inputMode="decimal"
                                className={`${INPUT} flex-1 text-right tabular-money`} />
                        </div>
                    </div>
                ))}
                {showErrors && noLines ? (
                    <span className="text-xs font-medium text-danger">{t("app.check.itemsErr")}</span>
                ) : null}
            </div>

            <label className="mt-2 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold">{t("app.check.total")}</span>
                <input value={draft.total} onChange={(e) => patch({ total: e.target.value })}
                    inputMode="decimal" className={`${INPUT} w-32 text-right font-extrabold tabular-money`} />
            </label>

            <div className="mt-3 flex gap-2">
                <button type="button" onClick={tryAccept}
                    className="flex-1 rounded-full bg-maroon px-4 py-3 font-semibold text-white">
                    {t("app.review.accept")}
                </button>
                <button type="button" onClick={onCollapse}
                    className="rounded-full bg-mist px-4 py-3 font-semibold text-ink">
                    {t("app.review.edit")}
                </button>
            </div>
            <DebugPanel debug={item.debug} />
        </div>
    );
}
