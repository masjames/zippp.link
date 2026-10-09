"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { makeT, type Wording } from "@/lib/t";
import { downscaleImage, makeThumb } from "@/lib/image";
import {
    addScore,
    emptyTotals,
    percent,
    sameNumber,
    scoreCase,
    type CaseScore,
    type EvalCase,
    type EvalItem,
    type Totals,
} from "@/lib/eval-score";
import {
    allEvalImages,
    clearEvalImages,
    deleteEvalImage,
    putEvalImage,
    type EvalImageRecord,
    type EvalLabelDraft,
} from "@/lib/eval-db";
import DebugPanel from "@/components/app/DebugPanel";
import type { ExtractDebug, Receipt } from "@/types/receipt";

type Provider = "paddle" | "gemini";

type Config = {
    id: string;
    provider: Provider;
    ocrModel: string;
    deepseekModel: string;
    geminiModel: string;
};

type LabelDraft = EvalLabelDraft;

type ImageItem = {
    id: string;
    name: string;
    file: File;
    thumb: string;
    label: LabelDraft;
};

type ConfigResult = {
    configId: string;
    imageId: string;
    provider: string;
    ocrModel: string;
    deepseekModel: string;
    geminiModel: string;
    ok: boolean;
    receipt: Receipt | null;
    error: string | null;
    debug: ExtractDebug | null;
    model_ms: number;
    wallMs: number;
    ocrCached: boolean;
};

const EMPTY_LABEL: LabelDraft = {
    merchant: "",
    date: "",
    total: "",
    itemsJson: "",
};

const PRESETS: Config[] = [
    {
        id: "paddle-flash",
        provider: "paddle",
        ocrModel: "PP-OCRv6",
        deepseekModel: "deepseek-flash",
        geminiModel: "",
    },
    {
        id: "paddle-pro",
        provider: "paddle",
        ocrModel: "PP-OCRv6",
        deepseekModel: "deepseek-v4-pro",
        geminiModel: "",
    },
    {
        id: "paddle-vl",
        provider: "paddle",
        ocrModel: "PaddleOCR-VL-1.6",
        deepseekModel: "deepseek-flash",
        geminiModel: "",
    },
    {
        id: "gemini-flash",
        provider: "gemini",
        ocrModel: "PP-OCRv6",
        deepseekModel: "",
        geminiModel: "gemini-2.5-flash",
    },
];

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

export default function EvalClient({ wording }: { wording: Wording }) {
    const t = makeT(wording, "en");
    const fileRef = useRef<HTMLInputElement>(null);
    const captureRef = useRef<HTMLInputElement>(null);
    const labelRef = useRef<HTMLInputElement>(null);

    // Start with one config so a phone run stays cheap; add more to compare.
    const [configs, setConfigs] = useState<Config[]>(PRESETS.slice(0, 1));
    const [images, setImages] = useState<ImageItem[]>([]);
    const [results, setResults] = useState<ConfigResult[]>([]);
    const [forceVisionRetry, setForceVisionRetry] = useState(false);
    const [hedgeMs, setHedgeMs] = useState(0);
    const [busy, setBusy] = useState(false);
    const [progress, setProgress] = useState("");
    const [message, setMessage] = useState<string | null>(null);
    const [openResult, setOpenResult] = useState<string | null>(null);
    const [bestByImage, setBestByImage] = useState<Record<string, string>>({});
    const [correctionByImage, setCorrectionByImage] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState<string | null>(null);
    const [saved, setSaved] = useState<Record<string, boolean>>({});

    const comparison = useMemo(() => {
        return configs.map((config) => {
            const totals: Totals = emptyTotals();
            const scores: (CaseScore & { imageId: string })[] = [];
            for (const image of images) {
                const result = results.find(
                    (r) => r.configId === config.id && r.imageId === image.id
                );
                if (!result || !result.ok || !result.receipt) continue;
                const score = scoreCase(
                    toEvalCase(image.name, image.label),
                    result.receipt
                );
                addScore(totals, score);
                scores.push({ ...score, imageId: image.id });
            }
            return { config, totals, scores };
        });
    }, [configs, images, results]);

    // Restore a phone session after a refresh.
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

    function patchConfig(id: string, patch: Partial<Config>) {
        setConfigs((list) =>
            list.map((c) => (c.id === id ? { ...c, ...patch } : c))
        );
    }

    function removeConfig(id: string) {
        setConfigs((list) => list.filter((c) => c.id !== id));
        setResults((list) => list.filter((r) => r.configId !== id));
    }

    function addConfig() {
        const id = `config-${Date.now()}`;
        setConfigs((list) => [
            ...list,
            {
                id,
                provider: "paddle",
                ocrModel: "PP-OCRv6",
                deepseekModel: "deepseek-flash",
                geminiModel: "",
            },
        ]);
    }

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
        setResults([]);
        void clearEvalImages();
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
                            total:
                                match.total == null ? "" : String(match.total),
                            itemsJson: match.items
                                ? JSON.stringify(match.items)
                                : "",
                        },
                    };
                })
            );
        } catch {
            setMessage("Could not parse labels.json.");
        }
    }

    function patchLabel(id: string, patch: Partial<LabelDraft>) {
        setImages((list) =>
            list.map((image) => {
                if (image.id !== id) return image;
                const label = { ...image.label, ...patch };
                const record: EvalImageRecord = {
                    id: image.id,
                    name: image.name,
                    blob: image.file,
                    thumb: image.thumb,
                    label,
                };
                void putEvalImage(record);
                return { ...image, label };
            })
        );
    }

    async function run() {
        if (images.length === 0 || configs.length === 0) return;
        setBusy(true);
        setMessage(null);
        setResults([]);
        const collected: ConfigResult[] = [];
        try {
            for (let i = 0; i < images.length; i++) {
                const image = images[i];
                setProgress(`${i + 1}/${images.length}: ${image.name}`);
                const form = new FormData();
                form.append("image", image.file, image.name);
                form.append(
                    "configs",
                    JSON.stringify(
                        configs.map((c) => ({
                            id: c.id,
                            provider: c.provider,
                            ocrModel: c.ocrModel || undefined,
                            deepseekModel: c.deepseekModel || undefined,
                            geminiModel: c.geminiModel || undefined,
                        }))
                    )
                );
                form.append(
                    "exercise",
                    JSON.stringify({ hedgeMs, forceVisionRetry })
                );
                const res = await fetch("/api/admin/eval", {
                    method: "POST",
                    body: form,
                });
                const data = await res.json();
                if (!data.ok) {
                    setMessage(data.error ?? "Eval failed.");
                    break;
                }
                for (const r of data.results as Omit<
                    ConfigResult,
                    "imageId"
                >[]) {
                    collected.push({ ...r, imageId: image.id });
                }
                setResults([...collected]);
            }
        } catch (err) {
            setMessage(err instanceof Error ? err.message : "Eval failed.");
        } finally {
            setBusy(false);
            setProgress("");
        }
    }

    async function saveFeedback(image: ImageItem) {
        setSaving(image.id);
        try {
            const imageResults = results.filter((r) => r.imageId === image.id);
            const best = bestByImage[image.id] ?? null;
            const allWrong = best === "all_wrong";
            const res = await fetch("/api/admin/feedback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    file: image.name,
                    chosenConfigId: allWrong ? null : best,
                    allWrong,
                    correction: correctionByImage[image.id] ?? "",
                    configs: imageResults.map((r) => ({
                        configId: r.configId,
                        provider: r.provider,
                        ocrModel: r.ocrModel,
                        deepseekModel: r.deepseekModel,
                        geminiModel: r.geminiModel,
                        merchant: r.receipt?.merchant ?? null,
                        date: r.receipt?.date ?? null,
                        total: r.receipt?.total ?? null,
                        items: r.receipt?.line_items.length ?? 0,
                        flags: (r.receipt?.flags ?? []).map(
                            (f) => `${f.path}:${f.reason}`
                        ),
                    })),
                }),
            });
            const data = await res.json();
            if (data.ok) {
                setSaved((all) => ({ ...all, [image.id]: true }));
            } else {
                setMessage(data.error ?? "Failed.");
            }
        } catch (err) {
            setMessage(err instanceof Error ? err.message : "Failed.");
        } finally {
            setSaving(null);
        }
    }

    function resultKey(configId: string, imageId: string) {
        return `${configId}:${imageId}`;
    }

    return (
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-5 sm:py-10">
            <div className="flex items-center justify-between">
                <a
                    href="/admin"
                    className="text-sm font-semibold text-muted hover:text-body"
                >
                    &larr; {t("admin.back")}
                </a>
                <a
                    href="/admin"
                    className="rounded-full bg-surface px-4 py-2 text-sm font-semibold"
                >
                    {t("admin.eval.orders")}
                </a>
            </div>

            <h1 className="mt-2 font-head text-3xl font-extrabold tracking-tight sm:text-4xl">
                {t("admin.eval.title")}
            </h1>
            <p className="mt-1 max-w-3xl text-sm text-muted">
                {t("admin.eval.subtitle")}
            </p>

            <section className="mt-8">
                <h2 className="font-head text-2xl font-extrabold">
                    {t("admin.eval.models")}
                </h2>
                <div className="mt-3 grid gap-3">
                    {configs.map((config) => (
                        <div
                            key={config.id}
                            className="grid gap-2 rounded-2xl border-2 border-line bg-card p-3 sm:grid-cols-[1fr_auto]"
                        >
                            <div className="grid gap-2 sm:grid-cols-4">
                                <label className="grid gap-1 text-xs font-semibold">
                                    {t("admin.eval.field.provider")}
                                    <select
                                        value={config.provider}
                                        onChange={(e) =>
                                            patchConfig(config.id, {
                                                provider: e.target
                                                    .value as Provider,
                                            })
                                        }
                                        className="rounded-lg border-2 border-line bg-surface px-2 py-1"
                                    >
                                        <option value="paddle">paddle</option>
                                        <option value="gemini">gemini</option>
                                    </select>
                                </label>
                                <label className="grid gap-1 text-xs font-semibold">
                                    {t("admin.eval.field.ocr")}
                                    <input
                                        value={config.ocrModel}
                                        onChange={(e) =>
                                            patchConfig(config.id, {
                                                ocrModel: e.target.value,
                                            })
                                        }
                                        className="rounded-lg border-2 border-line bg-surface px-2 py-1"
                                    />
                                </label>
                                <label className="grid gap-1 text-xs font-semibold">
                                    {t("admin.eval.field.deepseek")}
                                    <input
                                        value={config.deepseekModel}
                                        onChange={(e) =>
                                            patchConfig(config.id, {
                                                deepseekModel:
                                                    e.target.value,
                                            })
                                        }
                                        className="rounded-lg border-2 border-line bg-surface px-2 py-1"
                                    />
                                </label>
                                <label className="grid gap-1 text-xs font-semibold">
                                    {t("admin.eval.field.gemini")}
                                    <input
                                        value={config.geminiModel}
                                        onChange={(e) =>
                                            patchConfig(config.id, {
                                                geminiModel: e.target.value,
                                            })
                                        }
                                        className="rounded-lg border-2 border-line bg-surface px-2 py-1"
                                    />
                                </label>
                            </div>
                            <button
                                type="button"
                                onClick={() => removeConfig(config.id)}
                                className="self-start rounded-full bg-mist px-3 py-1 text-xs font-semibold text-ink"
                            >
                                {t("admin.eval.remove")}
                            </button>
                        </div>
                    ))}
                </div>
                <button
                    type="button"
                    onClick={addConfig}
                    className="mt-3 rounded-full bg-surface px-4 py-2 text-sm font-semibold"
                >
                    {t("admin.eval.addModel")}
                </button>
            </section>

            <section className="mt-8">
                <h2 className="font-head text-2xl font-extrabold">
                    {t("admin.eval.images")}
                </h2>
                <div className="mt-3 flex flex-wrap gap-3">
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
                        onClick={() => labelRef.current?.click()}
                        className="rounded-full bg-surface px-5 py-3 text-base font-semibold"
                    >
                        {t("admin.eval.importLabels")}
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
                <p className="mt-2 text-xs text-muted">
                    {t("admin.eval.labelsHint")}
                </p>

                <div className="mt-4 grid gap-3">
                    {images.map((image) => (
                        <div
                            key={image.id}
                            className="grid gap-3 rounded-2xl border-2 border-line bg-card p-3 sm:grid-cols-[80px_1fr]"
                        >
                            {image.thumb ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={image.thumb}
                                    alt=""
                                    className="h-20 w-20 rounded-lg object-cover"
                                />
                            ) : (
                                <span className="h-20 w-20 rounded-lg bg-surface" />
                            )}
                            <div className="grid gap-2">
                                <p className="truncate text-xs font-semibold">
                                    {image.name}
                                </p>
                                <div className="grid gap-2 sm:grid-cols-3">
                                    <input
                                        value={image.label.merchant}
                                        onChange={(e) =>
                                            patchLabel(image.id, {
                                                merchant: e.target.value,
                                            })
                                        }
                                        placeholder="merchant"
                                        className="rounded-lg border-2 border-line bg-surface px-2 py-1 text-sm"
                                    />
                                    <input
                                        value={image.label.date}
                                        onChange={(e) =>
                                            patchLabel(image.id, {
                                                date: e.target.value,
                                            })
                                        }
                                        placeholder="date YYYY-MM-DD"
                                        className="rounded-lg border-2 border-line bg-surface px-2 py-1 text-sm"
                                    />
                                    <input
                                        value={image.label.total}
                                        onChange={(e) =>
                                            patchLabel(image.id, {
                                                total: e.target.value,
                                            })
                                        }
                                        placeholder="total"
                                        className="rounded-lg border-2 border-line bg-surface px-2 py-1 text-sm"
                                    />
                                </div>
                                <textarea
                                    value={image.label.itemsJson}
                                    onChange={(e) =>
                                        patchLabel(image.id, {
                                            itemsJson: e.target.value,
                                        })
                                    }
                                    placeholder='[{"description":"Beras","qty":1,"amount":75000}]'
                                    rows={2}
                                    className="rounded-lg border-2 border-line bg-surface px-2 py-1 font-mono text-xs"
                                />
                                <button
                                    type="button"
                                    onClick={() => removeImage(image.id)}
                                    className="justify-self-start text-xs font-semibold text-danger"
                                >
                                    {t("admin.eval.remove")}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="mt-8">
                <h2 className="font-head text-2xl font-extrabold">
                    {t("admin.eval.exercise")}
                </h2>
                <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
                    <label className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={forceVisionRetry}
                            onChange={(e) =>
                                setForceVisionRetry(e.target.checked)
                            }
                        />
                        {t("admin.eval.forceRetry")}
                    </label>
                    <label className="flex items-center gap-2">
                        {t("admin.eval.hedge")}
                        <input
                            type="number"
                            value={hedgeMs}
                            onChange={(e) => setHedgeMs(Number(e.target.value))}
                            className="w-24 rounded-lg border-2 border-line bg-surface px-2 py-1"
                        />
                        {t("admin.eval.ms")}
                    </label>
                </div>
                <button
                    type="button"
                    disabled={busy || images.length === 0 || configs.length === 0}
                    onClick={run}
                    className="mt-4 rounded-full bg-btn px-6 py-3 font-semibold text-btntext disabled:opacity-60"
                >
                    {busy ? t("admin.eval.running") : t("admin.eval.run")}
                </button>
                <p className="mt-2 text-xs text-muted">
                    {t("admin.eval.costHint")}
                </p>
                {progress ? (
                    <p className="mt-2 text-sm font-medium">{progress}</p>
                ) : null}
                {message ? (
                    <p className="mt-2 text-sm font-medium text-danger">
                        {message}
                    </p>
                ) : null}
            </section>

            <section className="mt-10">
                <h2 className="font-head text-2xl font-extrabold">
                    {t("admin.eval.results")}
                </h2>
                {results.length === 0 ? (
                    <p className="mt-2 text-sm text-muted">
                        {t("admin.eval.noResults")}
                    </p>
                ) : (
                    <div className="mt-3 overflow-x-auto rounded-2xl border-2 border-line bg-card">
                        <table className="w-full text-sm">
                            <thead className="bg-surface text-left">
                                <tr>
                                    <th className="px-3 py-2">
                                        {t("admin.eval.col.config")}
                                    </th>
                                    <th className="px-3 py-2">
                                        {t("admin.eval.col.merchant")}
                                    </th>
                                    <th className="px-3 py-2">
                                        {t("admin.eval.col.date")}
                                    </th>
                                    <th className="px-3 py-2">
                                        {t("admin.eval.col.total")}
                                    </th>
                                    <th className="px-3 py-2">
                                        {t("admin.eval.col.itemAmount")}
                                    </th>
                                    <th className="px-3 py-2">
                                        {t("admin.eval.col.itemCount")}
                                    </th>
                                    <th className="px-3 py-2 text-danger">
                                        {t("admin.eval.col.wrongUnflagged")}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {comparison.map(({ config, totals }) => (
                                    <tr
                                        key={config.id}
                                        className="border-t border-line"
                                    >
                                        <td className="px-3 py-2 font-mono text-xs">
                                            {config.id}
                                        </td>
                                        <td className="px-3 py-2">
                                            {percent(totals.merchant)}
                                        </td>
                                        <td className="px-3 py-2">
                                            {percent(totals.date)}
                                        </td>
                                        <td className="px-3 py-2">
                                            {percent(totals.total)}
                                        </td>
                                        <td className="px-3 py-2">
                                            {percent(totals.itemAmount)}
                                        </td>
                                        <td className="px-3 py-2">
                                            {percent(totals.itemCount)}
                                        </td>
                                        <td className="px-3 py-2 font-semibold text-danger">
                                            {totals.wrongUnflagged}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="mt-4 grid gap-4">
                    {images.map((image) => {
                        const imageResults = results.filter(
                            (r) => r.imageId === image.id
                        );
                        if (imageResults.length === 0) return null;
                        const best = bestByImage[image.id] ?? "";
                        const label = toEvalCase(image.name, image.label);
                        return (
                            <div
                                key={image.id}
                                className="rounded-2xl border-2 border-line bg-card p-3"
                            >
                                <p className="text-sm font-semibold">
                                    {image.name}
                                </p>
                                <div className="mt-2 grid gap-2">
                                    {imageResults.map((result) => {
                                        const key = resultKey(
                                            result.configId,
                                            result.imageId
                                        );
                                        const open = openResult === key;
                                        return (
                                            <div
                                                key={key}
                                                className="rounded-xl border-2 border-line bg-surface p-2"
                                            >
                                                <label className="flex items-start gap-2">
                                                    <input
                                                        type="radio"
                                                        name={`best-${image.id}`}
                                                        checked={
                                                            best ===
                                                            result.configId
                                                        }
                                                        onChange={() =>
                                                            setBestByImage(
                                                                (all) => ({
                                                                    ...all,
                                                                    [image.id]:
                                                                        result.configId,
                                                                })
                                                            )
                                                        }
                                                        className="mt-1"
                                                    />
                                                    <span className="min-w-0 flex-1">
                                                        <span className="block font-mono text-xs">
                                                            {result.configId}
                                                        </span>
                                                        {result.ok ? (
                                                            <span className="block text-xs">
                                                                {result.receipt?.merchant ?? "(null)"} ·{" "}
                                                                {result.receipt?.date ?? "(null)"} ·{" "}
                                                                {result.receipt?.total ?? "(null)"} ·{" "}
                                                                {result.receipt?.line_items.length ?? 0}{" "}
                                                                {t("admin.eval.items")} ·{" "}
                                                                {result.receipt?.flags?.length ?? 0}{" "}
                                                                {t("admin.eval.flags")}
                                                            </span>
                                                        ) : (
                                                            <span className="block text-xs text-danger">
                                                                {result.error}
                                                            </span>
                                                        )}
                                                    </span>
                                                </label>
                                                <div className="mt-1 grid gap-2 text-xs sm:grid-cols-3">
                                                    <Field
                                                        label="merchant"
                                                        value={
                                                            result.receipt?.merchant ??
                                                            "(null)"
                                                        }
                                                        ok={
                                                            label.merchant === undefined
                                                                ? null
                                                                : sameText(
                                                                      result.receipt?.merchant,
                                                                      label.merchant
                                                                  )
                                                        }
                                                    />
                                                    <Field
                                                        label="date"
                                                        value={
                                                            result.receipt?.date ?? "(null)"
                                                        }
                                                        ok={
                                                            label.date === undefined
                                                                ? null
                                                                : result.receipt?.date ===
                                                                  label.date
                                                        }
                                                    />
                                                    <Field
                                                        label="total"
                                                        value={String(
                                                            result.receipt?.total ??
                                                                "(null)"
                                                        )}
                                                        ok={
                                                            label.total === undefined
                                                                ? null
                                                                : sameNumber(
                                                                      result.receipt?.total,
                                                                      label.total
                                                                  )
                                                        }
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setOpenResult(
                                                            open ? null : key
                                                        )
                                                    }
                                                    className="mt-1 text-xs font-semibold underline"
                                                >
                                                    {t("admin.eval.trace")}
                                                </button>
                                                {open ? (
                                                    <DebugPanel
                                                        debug={result.debug}
                                                        defaultOpen
                                                    />
                                                ) : null}
                                            </div>
                                        );
                                    })}
                                </div>

                                <label className="mt-2 flex items-center gap-2 text-sm">
                                    <input
                                        type="radio"
                                        name={`best-${image.id}`}
                                        checked={best === "all_wrong"}
                                        onChange={() =>
                                            setBestByImage((all) => ({
                                                ...all,
                                                [image.id]: "all_wrong",
                                            }))
                                        }
                                    />
                                    {t("admin.eval.allWrong")}
                                </label>
                                <textarea
                                    value={correctionByImage[image.id] ?? ""}
                                    onChange={(e) =>
                                        setCorrectionByImage((all) => ({
                                            ...all,
                                            [image.id]: e.target.value,
                                        }))
                                    }
                                    rows={2}
                                    placeholder={t("admin.eval.correctionPlaceholder")}
                                    className="mt-2 w-full rounded-lg border-2 border-line bg-surface px-2 py-1 text-sm"
                                />
                                <button
                                    type="button"
                                    disabled={
                                        saving === image.id ||
                                        (!best &&
                                            !(
                                                correctionByImage[image.id] ?? ""
                                            ).trim())
                                    }
                                    onClick={() => void saveFeedback(image)}
                                    className="mt-2 rounded-full bg-btn px-5 py-2 text-sm font-semibold text-btntext disabled:opacity-60"
                                >
                                    {saving === image.id
                                        ? t("admin.eval.saving")
                                        : t("admin.eval.saveFeedback")}
                                </button>
                                {saved[image.id] ? (
                                    <p className="mt-1 text-xs font-medium text-green-700">
                                        {t("admin.eval.feedbackSaved")}
                                    </p>
                                ) : null}
                            </div>
                        );
                    })}
                </div>
            </section>
        </div>
    );
}

function sameText(
    a: string | null | undefined,
    b: string | null | undefined
): boolean {
    const x = (a ?? "").toLowerCase().trim();
    const y = (b ?? "").toLowerCase().trim();
    if (!x || !y) return x === y;
    return x === y || x.includes(y) || y.includes(x);
}

function Field({
    label,
    value,
    ok,
}: {
    label: string;
    value: string;
    ok: boolean | null;
}) {
    return (
        <div className="rounded-lg border-2 border-line bg-surface px-2 py-1">
            <span className="font-semibold text-muted">{label}</span>
            <div
                className={
                    ok === null
                        ? ""
                        : ok
                          ? "text-green-700"
                          : "font-semibold text-danger"
                }
            >
                {value}
            </div>
        </div>
    );
}
