"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { makeT, type Wording } from "@/lib/t";

type FeedbackConfig = {
    configId: string;
    ocrModel: string;
    deepseekModel: string;
    geminiModel: string;
    provider: string;
    merchant: string | null;
    date: string | null;
    total: number | null;
    items: number;
    flags: string[];
};

type EvalFeedback = {
    id: string;
    createdAt: number;
    file: string;
    chosenConfigId: string | null;
    allWrong: boolean;
    correction: string;
    configs: FeedbackConfig[];
};

type Lesson = {
    id: string;
    createdAt: number;
    feedbackId: string;
    file: string;
    title: string;
    detail: string;
    status: "pending" | "approved" | "rejected";
    decidedAt?: number;
    releaseId?: string;
};

type Release = {
    id: string;
    version: string;
    createdAt: number;
    title: string;
    summary: string;
    lessonIds: string[];
    commit: string | null;
    deploy: { attempted: boolean; ok: boolean; error?: string; at: number };
};

function configLabel(c: FeedbackConfig): string {
    const parts = [c.provider, c.ocrModel, c.deepseekModel, c.geminiModel].filter(
        Boolean
    );
    return parts.join(" / ");
}

export default function LessonsClient({ wording }: { wording: Wording }) {
    const t = makeT(wording, "en");
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [feedback, setFeedback] = useState<EvalFeedback[]>([]);
    const [releases, setReleases] = useState<Release[]>([]);
    const [drafts, setDrafts] = useState<Record<string, { title: string; detail: string }>>({});
    const [busy, setBusy] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const load = useCallback(async () => {
        const res = await fetch("/api/admin/lessons", { cache: "no-store" });
        const data = await res.json();
        if (!data.ok) return;
        setLessons(data.lessons as Lesson[]);
        setFeedback(data.feedback as EvalFeedback[]);
        setReleases(data.releases as Release[]);
        const next: Record<string, { title: string; detail: string }> = {};
        for (const lesson of data.lessons as Lesson[]) {
            next[lesson.id] = { title: lesson.title, detail: lesson.detail };
        }
        setDrafts(next);
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    const wins = useMemo(() => {
        const counts = new Map<string, number>();
        for (const item of feedback) {
            if (!item.chosenConfigId) continue;
            counts.set(item.chosenConfigId, (counts.get(item.chosenConfigId) ?? 0) + 1);
        }
        return [...counts.entries()].sort((a, b) => b[1] - a[1]);
    }, [feedback]);

    const latestByConfig = useMemo(() => {
        const map = new Map<string, FeedbackConfig>();
        for (const item of feedback) {
            for (const config of item.configs) {
                if (!map.has(config.configId)) map.set(config.configId, config);
            }
        }
        return map;
    }, [feedback]);

    function draftOf(lesson: Lesson) {
        return drafts[lesson.id] ?? { title: lesson.title, detail: lesson.detail };
    }

    function setDraft(id: string, patch: Partial<{ title: string; detail: string }>) {
        setDrafts((all) => ({
            ...all,
            [id]: { ...(all[id] ?? { title: "", detail: "" }), ...patch },
        }));
    }

    async function act(lesson: Lesson, action: "approve" | "reject" | "update") {
        setBusy(lesson.id);
        setMessage(null);
        try {
            const draft = draftOf(lesson);
            const res = await fetch("/api/admin/lessons", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: lesson.id, action, ...draft }),
            });
            const data = await res.json();
            if (!data.ok) {
                setMessage(data.error ?? "Failed.");
                return;
            }
            if (action === "approve") {
                const prUrl = typeof data.prUrl === "string" ? data.prUrl : null;
                const githubError =
                    typeof data.githubError === "string" ? data.githubError : "";
                setMessage(
                    prUrl
                        ? `${t("admin.lessons.opened")} ${prUrl}`
                        : `${t("admin.lessons.openedNoPr")} ${githubError}`
                );
            } else if (action === "reject") {
                setMessage(t("admin.lessons.rejected"));
            } else {
                setMessage(t("admin.lessons.saved"));
            }
            await load();
        } finally {
            setBusy(null);
        }
    }

    const pending = lessons.filter((lesson) => lesson.status === "pending");
    const decided = lessons.filter((lesson) => lesson.status !== "pending");

    return (
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-5 sm:py-10">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <a href="/admin" className="text-sm font-semibold text-muted hover:text-body">
                    &larr; {t("admin.back")}
                </a>
                <div className="flex gap-2">
                    <a href="/admin/eval" className="rounded-full bg-surface px-4 py-2 text-sm font-semibold">
                        {t("admin.eval.link")}
                    </a>
                    <a href="/admin/releases" className="rounded-full bg-surface px-4 py-2 text-sm font-semibold">
                        {t("admin.releases.link")}
                    </a>
                </div>
            </div>

            <h1 className="mt-2 font-head text-3xl font-extrabold tracking-tight sm:text-4xl">
                {t("admin.lessons.title")}
            </h1>
            <p className="mt-1 max-w-3xl text-sm text-muted">
                {t("admin.lessons.subtitle")}
            </p>
            {message ? <p className="mt-3 text-sm font-medium">{message}</p> : null}

            <section className="mt-8">
                <h2 className="font-head text-2xl font-extrabold">
                    {t("admin.lessons.wins")}
                </h2>
                {wins.length === 0 ? (
                    <p className="mt-2 text-sm text-muted">
                        {t("admin.lessons.winsEmpty")}
                    </p>
                ) : (
                    <ul className="mt-2 grid gap-1 text-sm">
                        {wins.map(([configId, count]) => {
                            const config = latestByConfig.get(configId);
                            return (
                                <li key={configId} className="flex justify-between gap-3 rounded-lg bg-surface px-3 py-1">
                                    <span className="truncate font-mono text-xs">
                                        {config ? configLabel(config) : configId}
                                    </span>
                                    <span className="font-semibold">{count}</span>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </section>

            <section className="mt-8">
                <h2 className="font-head text-2xl font-extrabold">
                    {t("admin.lessons.pending")}
                </h2>
                {pending.length === 0 ? (
                    <p className="mt-2 text-sm text-muted">
                        {t("admin.lessons.empty")}
                    </p>
                ) : (
                    <div className="mt-3 grid gap-3">
                        {pending.map((lesson) => (
                            <div key={lesson.id} className="rounded-2xl border-2 border-line bg-card p-3">
                                <input
                                    value={draftOf(lesson).title}
                                    onChange={(e) => setDraft(lesson.id, { title: e.target.value })}
                                    className="w-full rounded-lg border-2 border-line bg-surface px-2 py-1 font-semibold"
                                />
                                <p className="mt-1 text-xs text-muted">{lesson.file}</p>
                                <textarea
                                    value={draftOf(lesson).detail}
                                    onChange={(e) => setDraft(lesson.id, { detail: e.target.value })}
                                    rows={3}
                                    className="mt-2 w-full rounded-lg border-2 border-line bg-surface px-2 py-1 text-sm"
                                />
                                <OriginalFeedback feedback={feedback} lesson={lesson} t={t} />
                                <div className="mt-2 flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        disabled={busy === lesson.id}
                                        onClick={() => act(lesson, "approve")}
                                        className="rounded-full bg-btn px-5 py-2 text-sm font-semibold text-btntext disabled:opacity-60"
                                    >
                                        {t("admin.lessons.approve")}
                                    </button>
                                    <button
                                        type="button"
                                        disabled={busy === lesson.id}
                                        onClick={() => act(lesson, "reject")}
                                        className="rounded-full bg-surface px-5 py-2 text-sm font-semibold disabled:opacity-60"
                                    >
                                        {t("admin.lessons.reject")}
                                    </button>
                                    <button
                                        type="button"
                                        disabled={busy === lesson.id}
                                        onClick={() => act(lesson, "update")}
                                        className="rounded-full bg-surface px-5 py-2 text-sm font-semibold disabled:opacity-60"
                                    >
                                        {t("admin.lessons.save")}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {decided.length > 0 ? (
                <section className="mt-8">
                    <h2 className="font-head text-2xl font-extrabold">
                        {t("admin.lessons.decided")}
                    </h2>
                    <ul className="mt-2 grid gap-2 text-sm">
                        {decided.map((lesson) => (
                            <li key={lesson.id} className="rounded-xl border-2 border-line bg-card p-3">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="font-semibold">{lesson.title}</span>
                                    <span className="text-xs uppercase text-muted">
                                        {lesson.status}
                                    </span>
                                </div>
                                <p className="mt-1 text-xs text-muted">{lesson.detail}</p>
                                {lesson.releaseId ? (
                                    <p className="mt-1 text-xs">
                                        {t("admin.lessons.release")}:{" "}
                                        {releases.find((r) => r.id === lesson.releaseId)?.version ?? lesson.releaseId}
                                    </p>
                                ) : null}
                            </li>
                        ))}
                    </ul>
                </section>
            ) : null}
        </div>
    );
}

function OriginalFeedback({
    feedback,
    lesson,
    t,
}: {
    feedback: EvalFeedback[];
    lesson: Lesson;
    t: ReturnType<typeof makeT>;
}) {
    const source = feedback.find((item) => item.id === lesson.feedbackId);
    if (!source) return null;
    return (
        <details className="mt-2 rounded-lg border-2 border-line bg-surface p-2 text-xs">
            <summary className="cursor-pointer font-semibold text-muted">
                {t("admin.lessons.original")}
            </summary>
            <p className="mt-1 whitespace-pre-wrap">{source.correction}</p>
            <ul className="mt-1 grid gap-0.5 font-mono text-[11px]">
                {source.configs.map((c) => (
                    <li key={c.configId}>
                        {configLabel(c)} · total {c.total ?? "(null)"} · {c.items}{" "}
                        {t("admin.eval.items")} · {c.flags.length}{" "}
                        {t("admin.eval.flags")}
                    </li>
                ))}
            </ul>
        </details>
    );
}
