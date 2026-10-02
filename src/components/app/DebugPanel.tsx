"use client";

import type { ExtractDebug } from "@/types/receipt";

/**
 * Always-on extraction trace. Shows which pipeline stage ran, how long it
 * took, and where it failed. Secrets are never part of the trace.
 */
export default function DebugPanel({
    debug,
    defaultOpen = false,
}: {
    debug?: ExtractDebug | null;
    defaultOpen?: boolean;
}) {
    if (!debug) return null;

    return (
        <details
            open={defaultOpen}
            className="rounded-2xl border-2 border-line bg-card text-xs"
        >
            <summary className="cursor-pointer px-4 py-3 font-semibold">
                Debug · {debug.provider}
                {debug.fallback ? ` → ${debug.fallback}` : ""} · {debug.ocrChars} chars
            </summary>
            <div className="space-y-3 px-4 pb-4">
                <dl className="grid grid-cols-[6rem_1fr] gap-x-2 gap-y-1">
                    <Row label="runId" value={debug.runId} mono />
                    <Row label="provider" value={debug.provider} mono />
                    <Row label="fallback" value={debug.fallback ?? "—"} mono />
                    <Row label="model" value={debug.model ?? "—"} mono />
                    <Row label="finish" value={debug.finish ?? "—"} mono />
                    <Row
                        label="tokens"
                        value={debug.usage?.total_tokens?.toString() ?? "—"}
                        mono
                    />
                    <Row
                        label="ocr"
                        value={`${debug.ocrFormat} · ${debug.ocrChars} chars`}
                        mono
                    />
                </dl>

                <ol className="space-y-1">
                    {debug.stages.map((stage, i) => (
                        <li
                            key={`${stage.stage}-${i}`}
                            className={stage.ok ? "" : "text-danger"}
                        >
                            <span className="font-mono">
                                {stage.ok ? "✓" : "✗"} {stage.stage}
                            </span>{" "}
                            <span className="text-muted">{stage.ms}ms</span>
                            {stage.note ? (
                                <span className="text-muted"> · {stage.note}</span>
                            ) : null}
                        </li>
                    ))}
                </ol>

                {debug.markdownPreview ? (
                    <details>
                        <summary className="cursor-pointer font-semibold text-muted">
                            OCR markdown (preview)
                        </summary>
                        <pre className="mt-1 max-h-56 overflow-auto whitespace-pre-wrap rounded bg-surface p-2 text-[11px]">
                            {debug.markdownPreview}
                        </pre>
                    </details>
                ) : null}

                {debug.modelRaw ? (
                    <details>
                        <summary className="cursor-pointer font-semibold text-muted">
                            Model raw output
                        </summary>
                        <pre className="mt-1 max-h-56 overflow-auto whitespace-pre-wrap rounded bg-surface p-2 text-[11px]">
                            {debug.modelRaw}
                        </pre>
                    </details>
                ) : null}
            </div>
        </details>
    );
}

function Row({
    label,
    value,
    mono,
}: {
    label: string;
    value: string;
    mono?: boolean;
}) {
    return (
        <>
            <dt className="text-muted">{label}</dt>
            <dd className={`break-all ${mono ? "font-mono" : ""}`}>{value}</dd>
        </>
    );
}
