"use client";

import { fill, type T } from "@/lib/t";
import type { QueueItem } from "./queue";

const STATUS_KEY: Record<QueueItem["status"], string> = {
    queued: "app.queue.queued",
    reading: "app.queue.reading",
    ready: "app.queue.ready",
    failed: "app.queue.failed",
    sending: "app.queue.sending",
    sent: "app.queue.sent",
};

/**
 * The snap queue, shown under the viewfinder. Each item keeps its own status;
 * processing is sequential and happens off the capture screen.
 */
export default function QueueStrip({
    t,
    queue,
    onReview,
    onRetry,
    onRemove,
}: {
    t: T;
    queue: QueueItem[];
    onReview: (id: string) => void;
    onRetry: (id: string) => void;
    onRemove: (id: string) => void;
}) {
    if (queue.length === 0) return null;

    return (
        <div className="grid gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                {fill(t("app.queue.title"), { count: queue.length })}
            </p>
            <ul className="grid gap-2">
                {queue.map((item) => (
                    <li
                        key={item.id}
                        className="flex items-center gap-3 rounded-2xl bg-surface p-2"
                    >
                        {item.thumb ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                                src={item.thumb}
                                alt=""
                                className="h-11 w-11 flex-none rounded-lg object-cover"
                            />
                        ) : (
                            <span
                                aria-hidden
                                className="h-11 w-11 flex-none rounded-lg bg-card"
                            />
                        )}
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                                {item.receipt?.merchant ??
                                    t(STATUS_KEY[item.status])}
                            </p>
                            <p className="truncate text-xs text-muted">
                                {t(STATUS_KEY[item.status])}
                                {item.error ? ` · ${item.error}` : ""}
                            </p>
                        </div>
                        {item.status === "ready" ? (
                            <button
                                type="button"
                                onClick={() => onReview(item.id)}
                                className="rounded-full bg-btn px-3 py-1.5 text-xs font-semibold text-btntext"
                            >
                                {t("app.queue.check")}
                            </button>
                        ) : null}
                        {item.status === "failed" ? (
                            <button
                                type="button"
                                onClick={() => onRetry(item.id)}
                                className="rounded-full bg-mist px-3 py-1.5 text-xs font-semibold text-ink"
                            >
                                {t("app.queue.retry")}
                            </button>
                        ) : null}
                        {item.status === "sent" ? (
                            <span className="text-xs font-semibold text-accent">
                                ✓
                            </span>
                        ) : null}
                        <button
                            type="button"
                            aria-label={t("app.queue.remove")}
                            onClick={() => onRemove(item.id)}
                            className="flex-none px-1 text-lg leading-none text-muted"
                        >
                            ×
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
}
