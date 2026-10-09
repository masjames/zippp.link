"use client";

import { useEffect, useState } from "react";
import { makeT, type Wording } from "@/lib/t";

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

export default function ReleasesClient({ wording }: { wording: Wording }) {
    const t = makeT(wording, "en");
    const [releases, setReleases] = useState<Release[]>([]);

    useEffect(() => {
        void (async () => {
            const res = await fetch("/api/admin/releases", { cache: "no-store" });
            const data = await res.json();
            if (data.ok) setReleases(data.releases as Release[]);
        })();
    }, []);

    return (
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-5 sm:py-10">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <a href="/admin" className="text-sm font-semibold text-muted hover:text-body">
                    &larr; {t("admin.back")}
                </a>
                <div className="flex gap-2">
                    <a href="/admin/eval" className="rounded-full bg-surface px-4 py-2 text-sm font-semibold">
                        {t("admin.eval.link")}
                    </a>
                    <a href="/admin/lessons" className="rounded-full bg-surface px-4 py-2 text-sm font-semibold">
                        {t("admin.lessons.link")}
                    </a>
                </div>
            </div>

            <h1 className="mt-2 font-head text-3xl font-extrabold tracking-tight sm:text-4xl">
                {t("admin.releases.title")}
            </h1>
            <p className="mt-1 max-w-3xl text-sm text-muted">
                {t("admin.releases.subtitle")}
            </p>

            {releases.length === 0 ? (
                <p className="mt-6 text-sm text-muted">{t("admin.releases.empty")}</p>
            ) : (
                <ul className="mt-6 grid gap-3">
                    {releases.map((release) => (
                        <li key={release.id} className="rounded-2xl border-2 border-line bg-card p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="font-head text-xl font-extrabold">
                                    {release.version}
                                </span>
                                <span className="text-xs text-muted">
                                    {new Date(release.createdAt).toLocaleString()}
                                </span>
                            </div>
                            <p className="mt-1 font-semibold">{release.title}</p>
                            <p className="mt-1 whitespace-pre-wrap text-sm text-muted">
                                {release.summary}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-3 text-xs">
                                <span>
                                    {t("admin.releases.commit")}:{" "}
                                    <span className="font-mono">
                                        {release.commit ? release.commit.slice(0, 8) : "(local)"}
                                    </span>
                                </span>
                                <span>
                                    {t("admin.releases.lessonsCount")}: {release.lessonIds.length}
                                </span>
                                <span
                                    className={
                                        release.deploy.ok
                                            ? "text-green-700"
                                            : release.deploy.attempted
                                              ? "text-danger"
                                              : "text-muted"
                                    }
                                >
                                    {t("admin.releases.deploy")}:{" "}
                                    {release.deploy.attempted
                                        ? release.deploy.ok
                                            ? t("admin.releases.deployed")
                                            : `${t("admin.releases.deployFailed")} (${release.deploy.error ?? ""})`
                                        : t("admin.releases.deploySkipped")}
                                </span>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
