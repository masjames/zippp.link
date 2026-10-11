"use client";

import { useEffect, useRef, useState } from "react";
import { fill, makeT, type Wording } from "@/lib/t";
import { downscaleImage, makeThumb } from "@/lib/image";
import {
    sameNumber,
    sameText,
    type EvalCase,
    type EvalItem,
} from "@/lib/eval-score";
import {
    EXTRACT_METHODS,
    type ExtractMethodId,
} from "@/lib/admin/methods";
import { METHOD_LABEL_KEYS as METHOD_LABEL_KEY } from "@/lib/admin/method-labels";
import {
    allEvalImages,
    clearEvalImages,
    deleteEvalImage,
    putEvalImage,
    type EvalLabelDraft,
} from "@/lib/eval-db";
import DebugPanel from "@/components/app/DebugPanel";
import type { ExtractDebug, Receipt } from "@/types/receipt";

type LabelDraft = EvalLabelDraft;

type ImageItem = {
    id: string;
    name: string;
    file: File;
    thumb: string;
    label: LabelDraft;
};

type MethodResult = {
    method: ExtractMethodId;
    ok: boolean;
    error: string | null;
    receipt: Receipt | null;
    debug: ExtractDebug | null;
    model_ms: number;
    wallMs: number;
    ocrError: string | null;
};

type OcrTest = {
    ok: boolean;
    ocrModel?: string;
    pages?: number;
    chars?: number;
    error?: string;
    tokens?: string[];
    markdownPreview?: string;
};

type EvalSummary = {
    runs: number;
    scored: number;
    rows: {
        method: ExtractMethodId;
        cases: number;
        failures: number;
        accuracy: {
            merchant: string;
            date: string;
            total: string;
            itemAmount: string;
            itemCount: string;
        };
        wrongUnflagged: number;
    }[];
};

const EMPTY_LABEL: LabelDraft = {
    merchant: "",
    date: "",
    total: "",
    itemsJson: "",
};

function toEvalCase(name: string, draft: LabelDraft): EvalCase {
    const total = draft.total.trim() === "" ? undefined : Number(draft.total);
    let items: EvalItem[] | undefined;
    if (draft.itemsJson.trim()) {
        try {
            const parsed = JSON.parse(draft.itemsJson) as EvalItem[];
            if (Array.isArray(parsed)) items = parsed;
        } catch {
            /* leave items undefined */
        }
    }
    return {
        file: name,
        merchant: draft.merchant.trim() === "" ? undefined : draft.merchant,
        date: draft.date.trim() === "" ? undefined : draft.date,
        total: total !== undefined && Number.isFinite(total) ? total : undefined,
        items,
    };
}

function hasLabel(label: EvalCase): boolean {
    return (
        label.merchant !== undefined ||
        label.date !== undefined ||
        label.total !== undefined ||
        (label.items?.length ?? 0) > 0
    );
}

function flagsOf(receipt: Receipt | null): string[] {
    return (receipt?.flags ?? []).map((flag) => `${flag.path}:${flag.reason}`);
}

export default function EvalClient({ wording }: { wording: Wording }) {
    const t = makeT(wording, "en");
    const fileRef = useRef<HTMLInputElement>(null);
    const captureRef = useRef<HTMLInputElement>(null);
    const labelRef = useRef<HTMLInputElement>(null);

    const [images, setImages] = useState<ImageItem[]>([]);
    const [results, setResults] = useState<Record<string, MethodResult[]>>({});
    const [ocrTests, setOcrTests] = useState<Record<string, OcrTest>>({});
    const [winner, setWinner] = useState<Record<string, string>>({});
    const [correction, setCorrection] = useState<Record<string, string>>({});
    const [saved, setSaved] = useState<Record<string, boolean>>({});

    const [advanced, setAdvanced] = useState(false);
    const [ocrModel, setOcrModel] = useState("PP-OCRv6");
    const [deepseekModel, setDeepseekModel] = useState("deepseek-flash");
    const [geminiModel, setGeminiModel] = useState("gemini-2.5-flash");
    const [hedgeMs, setHedgeMs] = useState(0);
    const [forceVisionRetry, setForceVisionRetry] = useState(false);

    const [busy, setBusy] = useState<string | null>(null);
    const [testing, setTesting] = useState<string | null>(null);
    const [progress, setProgress] = useState("");
    const [message, setMessage] = useState<string | null>(null);
    const [zoom, setZoom] = useState<{ src: string; name: string } | null>(null);
    const [summary, setSummary] = useState<EvalSummary | null>(null);

    async function refreshSummary() {
        try {
            const res = await fetch("/api/admin/eval", { cache: "no-store" });
            const data = await res.json();
            if (data.ok) setSummary(data.summary as EvalSummary);
        } catch {
            /* ignore */
        }
    }

    useEffect(() => {
        void refreshSummary();
    }, []);

    useEffect(() => {
        let alive = true;
        void (async () => {
            try {
                const records = await allEvalImages();
                if (!alive || records.length === 0) return;
                setImages(
                    records.map((rec) => ({
                        id: rec.id,
                        name: rec.name,
                        file: new File([rec.blob], rec.name, {
                            type: rec.blob.type || "image/jpeg",
                        }),
                        thumb: rec.thumb,
                        label: rec.label,
                    }))
                );
            } catch {
                /* ignore */
            }
        })();
        return () => {
            alive = false;
        };
    }, []);

    async function addFiles(files: FileList | null) {
        if (!files) return;
        const next: ImageItem[] = [];
        for (const file of Array.from(files)) {
            const blob = await downscaleImage(file);
            const thumb = await makeThumb(blob);
            const item: ImageItem = {
                id: crypto.randomUUID(),
                name: file.name,
                file: new File([blob], file.name, {
                    type: blob.type || "image/jpeg",
                }),
                thumb,
                label: { ...EMPTY_LABEL },
            };
            await putEvalImage({
                id: item.id,
                name: item.name,
                blob: item.file,
                thumb: item.thumb,
                label: item.label,
            });
            next.push(item);
        }
        setImages((list) => [...list, ...next]);
    }

    function removeImage(id: string) {
        setImages((list) => list.filter((image) => image.id !== id));
        void deleteEvalImage(id);
    }

    function clearAll() {
        setImages([]);
        setResults({});
        setOcrTests({});
        void clearEvalImages();
    }

    function patchLabel(id: string, patch: Partial<LabelDraft>) {
        setImages((list) =>
            list.map((image) => {
                if (image.id !== id) return image;
                const label = { ...image.label, ...patch };
                void putEvalImage({
                    id: image.id,
                    name: image.name,
                    blob: image.file,
                    thumb: image.thumb,
                    label,
                });
                return { ...image, label };
            })
        );
    }

    async function importLabels(files: FileList | null) {
        const file = files?.[0];
        if (!file) return;
        try {
            const parsed = JSON.parse(await file.text()) as
                | EvalCase[]
                | { cases?: EvalCase[] };
            const cases = Array.isArray(parsed) ? parsed : (parsed.cases ?? []);
            setImages((list) =>
                list.map((image) => {
                    const match = cases.find((c) => c.file === image.name);
                    if (!match) return image;
                    return {
                        ...image,
                        label: {
                            merchant: match.merchant ?? "",
                            date: match.date ?? "",
                            total: match.total == null ? "" : String(match.total),
                            itemsJson: match.items ? JSON.stringify(match.items) : "",
                        },
                    };
                })
            );
            setMessage(t("admin.eval.labelsImported"));
        } catch {
            setMessage(t("admin.eval.labelsBad"));
        }
    }

    function exercisePayload() {
        return {
            ocrModel,
            deepseekModel,
            geminiModel,
            hedgeMs,
            forceVisionRetry,
        };
    }

    async function runImage(image: ImageItem) {
        setBusy(image.id);
        setMessage(null);
        try {
            const form = new FormData();
            form.append("image", image.file, image.name);
            form.append("methods", JSON.stringify(EXTRACT_METHODS.map((m) => m.id)));
            form.append("exercise", JSON.stringify(exercisePayload()));
            form.append(
                "expected",
                JSON.stringify(toEvalCase(image.name, image.label))
            );
            const res = await fetch("/api/admin/eval", { method: "POST", body: form });
            const data = await res.json();
            if (!data.ok) {
                setMessage(data.error ?? t("admin.eval.runFailed"));
                return;
            }
            setResults((prev) => ({ ...prev, [image.id]: data.results as MethodResult[] }));
            void refreshSummary();
        } catch (err) {
            setMessage(err instanceof Error ? err.message : t("admin.eval.runFailed"));
        } finally {
            setBusy(null);
        }
    }

    async function runAll() {
        for (let i = 0; i < images.length; i++) {
            setProgress(`${i + 1}/${images.length}: ${images[i].name}`);
            await runImage(images[i]);
        }
        setProgress("");
    }

    async function testOcr(image: ImageItem) {
        setTesting(image.id);
        setMessage(null);
        try {
            const form = new FormData();
            form.append("image", image.file, image.name);
            form.append("action", "ocr");
            form.append("exercise", JSON.stringify({ ocrModel }));
            const res = await fetch("/api/admin/eval", { method: "POST", body: form });
            const data = (await res.json()) as OcrTest;
            setOcrTests((prev) => ({ ...prev, [image.id]: data }));
        } catch (err) {
            setOcrTests((prev) => ({
                ...prev,
                [image.id]: {
                    ok: false,
                    error: err instanceof Error ? err.message : "failed",
                },
            }));
        } finally {
            setTesting(null);
        }
    }

    function openZoom(image: ImageItem) {
        setZoom({ src: URL.createObjectURL(image.file), name: image.name });
    }

    function closeZoom() {
        if (zoom) URL.revokeObjectURL(zoom.src);
        setZoom(null);
    }

    async function saveFeedback(image: ImageItem) {
        const imageResults = results[image.id] ?? [];
        const best = winner[image.id] ?? null;
        const allWrong = best === "all_wrong";
        if (!best && !(correction[image.id] ?? "").trim()) return;
        setBusy(image.id);
        try {
            const res = await fetch("/api/admin/feedback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    file: image.name,
                    chosenConfigId: allWrong ? null : best,
                    allWrong,
                    correction: correction[image.id] ?? "",
                    configs: imageResults.map((r) => ({
                        configId: r.method,
                        provider:
                            EXTRACT_METHODS.find((m) => m.id === r.method)?.provider ??
                            "deepseek",
                        ocrModel:
                            EXTRACT_METHODS.find((m) => m.id === r.method)?.needsOcr
                                ? ocrModel
                                : "",
                        deepseekModel:
                            EXTRACT_METHODS.find((m) => m.id === r.method)?.provider ===
                            "deepseek"
                                ? deepseekModel
                                : "",
                        geminiModel:
                            EXTRACT_METHODS.find((m) => m.id === r.method)?.provider ===
                            "gemini"
                                ? geminiModel
                                : "",
                        merchant: r.receipt?.merchant ?? null,
                        date: r.receipt?.date ?? null,
                        total: r.receipt?.total ?? null,
                        items: r.receipt?.line_items.length ?? 0,
                        flags: flagsOf(r.receipt),
                    })),
                }),
            });
            const data = await res.json();
            if (data.ok) setSaved((all) => ({ ...all, [image.id]: true }));
            else setMessage(data.error ?? t("admin.eval.runFailed"));
        } catch (err) {
            setMessage(err instanceof Error ? err.message : t("admin.eval.runFailed"));
        } finally {
            setBusy(null);
        }
    }

    return (
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-5 sm:py-10">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <a href="/admin" className="text-sm font-semibold text-muted hover:text-body">
                    &larr; {t("admin.back")}
                </a>
                <div className="flex gap-2">
                    <a href="/admin/lessons" className="rounded-full bg-surface px-4 py-2 text-sm font-semibold">
                        {t("admin.lessons.link")}
                    </a>
                    <a href="/admin/releases" className="rounded-full bg-surface px-4 py-2 text-sm font-semibold">
                        {t("admin.releases.link")}
                    </a>
                </div>
            </div>

            <h1 className="mt-2 font-head text-3xl font-extrabold tracking-tight sm:text-4xl">
                {t("admin.eval.title")}
            </h1>
            <p className="mt-1 max-w-3xl text-sm text-muted">
                {t("admin.eval.subtitle")}
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
                <button
                    type="button"
                    onClick={() => captureRef.current?.click()}
                    className="rounded-full bg-btn px-5 py-3 text-base font-semibold text-btntext"
                >
                    {t("admin.eval.takePhoto")}
                </button>
                <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="rounded-full bg-surface px-5 py-3 text-base font-semibold"
                >
                    {t("admin.eval.upload")}
                </button>
                <button
                    type="button"
                    disabled={images.length === 0 || busy !== null}
                    onClick={() => void runAll()}
                    className="rounded-full bg-btn px-5 py-3 text-base font-semibold text-btntext disabled:opacity-60"
                >
                    {t("admin.eval.runAll")}
                </button>
                {images.length > 0 ? (
                    <button
                        type="button"
                        onClick={clearAll}
                        className="rounded-full bg-surface px-5 py-3 text-base font-semibold text-danger"
                    >
                        {t("admin.eval.clearAll")}
                    </button>
                ) : null}
                <button
                    type="button"
                    onClick={() => labelRef.current?.click()}
                    className="rounded-full bg-surface px-5 py-3 text-base font-semibold"
                >
                    {t("admin.eval.importLabels")}
                </button>
                <input
                    ref={captureRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                        void addFiles(e.target.files);
                        e.target.value = "";
                    }}
                />
                <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                        void addFiles(e.target.files);
                        e.target.value = "";
                    }}
                />
                <input
                    ref={labelRef}
                    type="file"
                    accept="application/json"
                    className="hidden"
                    onChange={(e) => {
                        void importLabels(e.target.files);
                        e.target.value = "";
                    }}
                />
            </div>

            <details
                open={advanced}
                onToggle={(e) => setAdvanced((e.target as HTMLDetailsElement).open)}
                className="mt-4 rounded-2xl border-2 border-line bg-card p-3 text-sm"
            >
                <summary className="cursor-pointer font-semibold">
                    {t("admin.eval.advanced")}
                </summary>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    <label className="grid gap-1 text-xs font-semibold">
                        {t("admin.eval.ocrModel")}
                        <input
                            value={ocrModel}
                            onChange={(e) => setOcrModel(e.target.value)}
                            className="rounded-lg border-2 border-line bg-surface px-2 py-1"
                        />
                    </label>
                    <label className="grid gap-1 text-xs font-semibold">
                        {t("admin.eval.deepseekModel")}
                        <input
                            value={deepseekModel}
                            onChange={(e) => setDeepseekModel(e.target.value)}
                            className="rounded-lg border-2 border-line bg-surface px-2 py-1"
                        />
                    </label>
                    <label className="grid gap-1 text-xs font-semibold">
                        {t("admin.eval.geminiModel")}
                        <input
                            value={geminiModel}
                            onChange={(e) => setGeminiModel(e.target.value)}
                            className="rounded-lg border-2 border-line bg-surface px-2 py-1"
                        />
                    </label>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
                    <label className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={forceVisionRetry}
                            onChange={(e) => setForceVisionRetry(e.target.checked)}
                        />
                        {t("admin.eval.forceRetry")}
                    </label>
                    <label className="flex items-center gap-2">
                        {t("admin.eval.hedge")}
                        <input
                            type="number"
                            value={hedgeMs}
                            onChange={(e) => setHedgeMs(Number(e.target.value))}
                            className="w-20 rounded-lg border-2 border-line bg-surface px-2 py-1"
                        />
                        {t("admin.eval.ms")}
                    </label>
                    <span className="text-muted">{t("admin.eval.exerciseHint")}</span>
                </div>
            </details>

            <p className="mt-2 text-xs text-muted">{t("admin.eval.costHint")}</p>
            {progress ? <p className="mt-2 text-sm font-medium">{progress}</p> : null}
            {message ? <p className="mt-2 text-sm font-medium text-danger">{message}</p> : null}

            {summary && summary.runs > 0 ? (
                <section className="mt-6">
                    <h2 className="font-head text-2xl font-extrabold">
                        {t("admin.eval.summaryTitle")}
                    </h2>
                    <p className="mt-1 text-xs text-muted">
                        {t("admin.eval.summarySubtitle")}
                    </p>
                    <p className="mt-1 text-xs font-semibold">
                        {fill(t("admin.eval.summaryScored"), {
                            scored: summary.scored,
                            runs: summary.runs,
                        })}
                    </p>
                    <div className="mt-3 overflow-x-auto rounded-2xl border-2 border-line bg-card">
                        <table className="w-full text-sm">
                            <thead className="bg-surface text-left">
                                <tr>
                                    <th className="px-3 py-2">{t("admin.eval.col.method")}</th>
                                    <th className="px-3 py-2">{t("admin.eval.col.cases")}</th>
                                    <th className="px-3 py-2">{t("admin.eval.col.merchant")}</th>
                                    <th className="px-3 py-2">{t("admin.eval.col.date")}</th>
                                    <th className="px-3 py-2">{t("admin.eval.col.total")}</th>
                                    <th className="px-3 py-2">{t("admin.eval.col.itemAmount")}</th>
                                    <th className="px-3 py-2">{t("admin.eval.col.itemCount")}</th>
                                    <th className="px-3 py-2 text-danger">
                                        {t("admin.eval.col.wrongUnflagged")}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {summary.rows.map((row) => (
                                    <tr key={row.method} className="border-t border-line">
                                        <td className="px-3 py-2 font-semibold">
                                            {t(METHOD_LABEL_KEY[row.method])}
                                        </td>
                                        <td className="px-3 py-2">
                                            {row.cases}
                                            {row.failures > 0
                                                ? ` (${row.failures} failed)`
                                                : ""}
                                        </td>
                                        <td className="px-3 py-2">
                                            {row.accuracy.merchant}
                                        </td>
                                        <td className="px-3 py-2">{row.accuracy.date}</td>
                                        <td className="px-3 py-2">{row.accuracy.total}</td>
                                        <td className="px-3 py-2">
                                            {row.accuracy.itemAmount}
                                        </td>
                                        <td className="px-3 py-2">
                                            {row.accuracy.itemCount}
                                        </td>
                                        <td className="px-3 py-2 font-semibold text-danger">
                                            {row.wrongUnflagged}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            ) : null}

            <div className="mt-6 grid gap-6">
                {images.map((image) => {
                    const imageResults = results[image.id] ?? [];
                    const label = toEvalCase(image.name, image.label);
                    const scored = hasLabel(label);
                    const ocrTest = ocrTests[image.id];
                    const best = winner[image.id] ?? "";
                    return (
                        <div
                            key={image.id}
                            className="rounded-2xl border-2 border-line bg-card p-3"
                        >
                            <div className="grid gap-4 lg:grid-cols-[minmax(0,340px)_1fr]">
                                <div>
                                    <PhotoPreview
                                        file={image.file}
                                        alt={image.name}
                                        onZoom={() => openZoom(image)}
                                    />
                                    <p className="mt-1 truncate text-xs text-muted">
                                        {image.name}
                                    </p>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            disabled={busy === image.id}
                                            onClick={() => void runImage(image)}
                                            className="rounded-full bg-btn px-4 py-2 text-sm font-semibold text-btntext disabled:opacity-60"
                                        >
                                            {busy === image.id
                                                ? t("admin.eval.running")
                                                : t("admin.eval.run")}
                                        </button>
                                        <button
                                            type="button"
                                            disabled={testing === image.id}
                                            onClick={() => void testOcr(image)}
                                            className="rounded-full bg-surface px-4 py-2 text-sm font-semibold disabled:opacity-60"
                                        >
                                            {t("admin.eval.testOcr")}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => removeImage(image.id)}
                                            className="rounded-full bg-surface px-4 py-2 text-sm font-semibold text-danger"
                                        >
                                            {t("admin.eval.remove")}
                                        </button>
                                    </div>
                                    {ocrTest ? <OcrTestBox t={t} test={ocrTest} /> : null}
                                </div>

                                <div className="grid gap-3">
                                    <ExpectedBox
                                        t={t}
                                        label={image.label}
                                        onChange={(patch) => patchLabel(image.id, patch)}
                                    />

                                    {imageResults.length === 0 ? (
                                        <p className="text-sm text-muted">
                                            {t("admin.eval.notRun")}
                                        </p>
                                    ) : (
                                        <div className="grid gap-2">
                                            {imageResults.map((result) => (
                                                <MethodRow
                                                    key={result.method}
                                                    t={t}
                                                    group={`winner-${image.id}`}
                                                    result={result}
                                                    label={scored ? label : null}
                                                    best={best}
                                                    ocrModel={ocrModel}
                                                    deepseekModel={deepseekModel}
                                                    geminiModel={geminiModel}
                                                    onPick={(id) =>
                                                        setWinner((all) => ({
                                                            ...all,
                                                            [image.id]: id,
                                                        }))
                                                    }
                                                />
                                            ))}
                                        </div>
                                    )}

                                    <label className="flex items-center gap-2 text-sm">
                                        <input
                                            type="radio"
                                            name={`winner-${image.id}`}
                                            checked={best === "all_wrong"}
                                            onChange={() =>
                                                setWinner((all) => ({
                                                    ...all,
                                                    [image.id]: "all_wrong",
                                                }))
                                            }
                                        />
                                        {t("admin.eval.allWrong")}
                                    </label>
                                    <textarea
                                        value={correction[image.id] ?? ""}
                                        onChange={(e) =>
                                            setCorrection((all) => ({
                                                ...all,
                                                [image.id]: e.target.value,
                                            }))
                                        }
                                        rows={2}
                                        placeholder={t("admin.eval.correctionPlaceholder")}
                                        className="w-full rounded-lg border-2 border-line bg-surface px-2 py-1 text-sm"
                                    />
                                    <button
                                        type="button"
                                        disabled={
                                            busy === image.id ||
                                            (!best &&
                                                !(correction[image.id] ?? "").trim())
                                        }
                                        onClick={() => void saveFeedback(image)}
                                        className="justify-self-start rounded-full bg-btn px-5 py-2 text-sm font-semibold text-btntext disabled:opacity-60"
                                    >
                                        {saved[image.id]
                                            ? t("admin.eval.feedbackSaved")
                                            : t("admin.eval.saveFeedback")}
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {zoom ? (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
                    onClick={closeZoom}
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={zoom.src}
                        alt={zoom.name}
                        className="max-h-full max-w-full object-contain"
                    />
                </div>
            ) : null}
        </div>
    );
}

function PhotoPreview({
    file,
    alt,
    onZoom,
}: {
    file: Blob;
    alt: string;
    onZoom: () => void;
}) {
    const [url, setUrl] = useState("");
    useEffect(() => {
        const objectUrl = URL.createObjectURL(file);
        setUrl(objectUrl);
        return () => URL.revokeObjectURL(objectUrl);
    }, [file]);
    if (!url) return null;
    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src={url}
            alt={alt}
            onClick={onZoom}
            className="max-h-[420px] w-full cursor-zoom-in rounded-xl border-2 border-line bg-surface object-contain"
        />
    );
}

function ExpectedBox({
    t,
    label,
    onChange,
}: {
    t: ReturnType<typeof makeT>;
    label: LabelDraft;
    onChange: (patch: Partial<LabelDraft>) => void;
}) {
    return (
        <details className="rounded-xl border-2 border-line bg-surface p-2 text-sm">
            <summary className="cursor-pointer font-semibold">
                {t("admin.eval.expected")}
            </summary>
            <p className="mt-1 text-xs text-muted">{t("admin.eval.expectedHint")}</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
                <input
                    value={label.merchant}
                    onChange={(e) => onChange({ merchant: e.target.value })}
                    placeholder={t("admin.eval.merchantPlaceholder")}
                    className="rounded-lg border-2 border-line bg-card px-2 py-1"
                />
                <input
                    value={label.date}
                    onChange={(e) => onChange({ date: e.target.value })}
                    placeholder="YYYY-MM-DD"
                    className="rounded-lg border-2 border-line bg-card px-2 py-1"
                />
                <input
                    value={label.total}
                    onChange={(e) => onChange({ total: e.target.value })}
                    placeholder={t("admin.eval.totalPlaceholder")}
                    className="rounded-lg border-2 border-line bg-card px-2 py-1"
                />
            </div>
            <textarea
                value={label.itemsJson}
                onChange={(e) => onChange({ itemsJson: e.target.value })}
                rows={2}
                placeholder="[]"
                className="mt-2 w-full rounded-lg border-2 border-line bg-card px-2 py-1 font-mono text-xs"
            />
        </details>
    );
}

function MethodRow({
    t,
    group,
    result,
    label,
    best,
    ocrModel,
    deepseekModel,
    geminiModel,
    onPick,
}: {
    t: ReturnType<typeof makeT>;
    group: string;
    result: MethodResult;
    label: EvalCase | null;
    best: string;
    ocrModel: string;
    deepseekModel: string;
    geminiModel: string;
    onPick: (id: string) => void;
}) {
    const methodInfo = EXTRACT_METHODS.find((m) => m.id === result.method);
    const models =
        methodInfo?.kind === "structuring"
            ? `${methodInfo.provider === "deepseek" ? deepseekModel : geminiModel} on ${ocrModel}`
            : methodInfo?.provider === "deepseek"
              ? deepseekModel
              : geminiModel;
    const flags = flagsOf(result.receipt);
    const items = result.receipt?.line_items ?? [];

    return (
        <div
            className={`rounded-xl border-2 p-2 ${
                best === result.method ? "border-brand bg-card" : "border-line bg-surface"
            }`}
        >
            <div className="flex items-start justify-between gap-2">
                <label className="flex items-center gap-2">
                    <input
                        type="radio"
                        name={group}
                        checked={best === result.method}
                        onChange={() => onPick(result.method)}
                    />
                    <span className="text-sm font-semibold">
                        {t(METHOD_LABEL_KEY[result.method])}
                    </span>
                </label>
                <span className="text-xs text-muted">{models}</span>
            </div>

            {result.ok && result.receipt ? (
                <div className="mt-2 grid gap-1 text-xs">
                    <Field
                        name={t("admin.eval.field.merchant")}
                        value={result.receipt.merchant ?? "(null)"}
                        ok={label?.merchant === undefined ? null : sameText(result.receipt.merchant, label.merchant)}
                    />
                    <Field
                        name={t("admin.eval.field.date")}
                        value={result.receipt.date ?? "(null)"}
                        ok={label?.date === undefined ? null : result.receipt.date === label.date}
                    />
                    <Field
                        name={t("admin.eval.field.total")}
                        value={String(result.receipt.total ?? "(null)")}
                        ok={label?.total === undefined ? null : sameNumber(result.receipt.total, label.total)}
                    />
                    <span className="text-muted">
                        {items.length} {t("admin.eval.items")}
                        {items.length > 0
                            ? ` · ${items
                                  .map((i) => i.amount ?? "?")
                                  .join(", ")}`
                            : ""}
                    </span>
                    {flags.length > 0 ? (
                        <span className="font-medium text-amber-700">
                            {flags.length} {t("admin.eval.flags")}: {flags.join(", ")}
                        </span>
                    ) : (
                        <span className="font-medium text-green-700">
                            {t("admin.eval.noFlags")}
                        </span>
                    )}
                </div>
            ) : (
                <p className="mt-2 text-xs text-danger">
                    {result.ocrError ?? result.error ?? t("admin.eval.runFailed")}
                </p>
            )}

            {result.debug ? (
                <details className="mt-2 text-xs">
                    <summary className="cursor-pointer font-semibold text-muted">
                        {t("admin.eval.trace")}
                    </summary>
                    {result.debug.ocrTokens?.length ? (
                        <p className="mt-1 break-words text-muted">
                            {t("admin.eval.ocrTokens")}:{" "}
                            <span className="font-mono">
                                {result.debug.ocrTokens.slice(0, 40).join(" | ")}
                            </span>
                        </p>
                    ) : null}
                    <DebugPanel debug={result.debug} />
                </details>
            ) : null}
        </div>
    );
}

function Field({
    name,
    value,
    ok,
}: {
    name: string;
    value: string;
    ok: boolean | null;
}) {
    const color = ok === null ? "" : ok ? "text-green-700" : "font-semibold text-danger";
    return (
        <span className="flex gap-2">
            <span className="w-20 shrink-0 text-muted">{name}</span>
            <span className={`break-words ${color}`}>{value}</span>
        </span>
    );
}

function OcrTestBox({
    t,
    test,
}: {
    t: ReturnType<typeof makeT>;
    test: OcrTest;
}) {
    return (
        <div className="mt-2 rounded-xl border-2 border-line bg-surface p-2 text-xs">
            <p className="font-semibold">{t("admin.eval.ocrResult")}</p>
            {test.ok ? (
                <>
                    <p className="text-muted">
                        {test.ocrModel}: {test.pages} {t("admin.eval.pages")},{" "}
                        {test.chars} {t("admin.eval.chars")}
                    </p>
                    {test.tokens?.length ? (
                        <p className="mt-1 break-words font-mono">
                            {test.tokens.slice(0, 60).join(" | ")}
                        </p>
                    ) : null}
                </>
            ) : (
                <p className="font-medium text-danger">
                    {t("admin.eval.ocrFailed")}: {test.error}
                </p>
            )}
        </div>
    );
}
