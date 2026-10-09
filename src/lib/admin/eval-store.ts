import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { remoteTextStore } from "@/lib/google/kv";

/**
 * Server store for the admin eval loop: feedback, lessons and releases.
 *
 * Uses the same durable backends as the session store (Vercel Blob or Upstash
 * Redis REST) and falls back to the local `.data` filesystem. Records are small
 * JSON arrays under one key each, read and rewritten whole. This is an
 * admin-only, low-volume tool, so that is acceptable.
 */

export type FeedbackConfig = {
    configId: string;
    provider: string;
    ocrModel: string;
    deepseekModel: string;
    geminiModel: string;
    merchant: string | null;
    date: string | null;
    total: number | null;
    items: number;
    flags: string[];
};

export type EvalFeedback = {
    id: string;
    createdAt: number;
    file: string;
    chosenConfigId: string | null;
    allWrong: boolean;
    correction: string;
    configs: FeedbackConfig[];
};

export type LessonStatus = "pending" | "approved" | "rejected";

export type Lesson = {
    id: string;
    createdAt: number;
    feedbackId: string;
    file: string;
    title: string;
    detail: string;
    status: LessonStatus;
    decidedAt?: number;
    releaseId?: string;
};

export type DeployResult = {
    attempted: boolean;
    ok: boolean;
    error?: string;
    at: number;
};

export type Release = {
    id: string;
    version: string;
    createdAt: number;
    title: string;
    summary: string;
    lessonIds: string[];
    commit: string | null;
    /** Change request opened from the lesson, when GitHub is configured. */
    branch?: string | null;
    prUrl?: string | null;
    notified?: boolean;
    deploy: DeployResult;
};

const KEYS = {
    feedback: "admin-eval/feedback.json",
    lessons: "admin-eval/lessons.json",
    releases: "admin-eval/releases.json",
    version: "admin-eval/version.json",
};

const DATA_DIR = process.env.ZIPPP_DATA_DIR || path.join(process.cwd(), ".data");

async function readJson<T>(key: string, fallback: T): Promise<T> {
    const remote = remoteTextStore();
    try {
        const raw = remote
            ? await remote.readText(key)
            : await fs.readFile(path.join(DATA_DIR, key), "utf8").catch(() => null);
        if (!raw) return fallback;
        return JSON.parse(raw) as T;
    } catch {
        return fallback;
    }
}

async function writeJson(key: string, value: unknown): Promise<void> {
    const raw = JSON.stringify(value);
    const remote = remoteTextStore();
    if (remote) {
        await remote.writeText(key, raw);
        return;
    }
    const file = path.join(DATA_DIR, key);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, raw, "utf8");
}

/* --------------------------------- feedback -------------------------------- */

export function listFeedback(): Promise<EvalFeedback[]> {
    return readJson<EvalFeedback[]>(KEYS.feedback, []);
}

export async function appendFeedback(
    input: Omit<EvalFeedback, "id" | "createdAt">
): Promise<EvalFeedback> {
    const record: EvalFeedback = {
        ...input,
        id: randomUUID(),
        createdAt: Date.now(),
    };
    const all = await listFeedback();
    all.unshift(record);
    await writeJson(KEYS.feedback, all.slice(0, 500));

    // An all-wrong correction becomes a lesson to review.
    if (record.allWrong && record.correction.trim()) {
        const lesson: Lesson = {
            id: randomUUID(),
            createdAt: Date.now(),
            feedbackId: record.id,
            file: record.file,
            title: `Correction: ${record.file}`,
            detail: record.correction.trim(),
            status: "pending",
        };
        const lessons = await listLessons();
        lessons.unshift(lesson);
        await writeJson(KEYS.lessons, lessons.slice(0, 500));
    }
    return record;
}

/* --------------------------------- lessons --------------------------------- */

export function listLessons(): Promise<Lesson[]> {
    return readJson<Lesson[]>(KEYS.lessons, []);
}

export async function updateLesson(
    id: string,
    patch: Partial<Pick<Lesson, "title" | "detail" | "status" | "decidedAt" | "releaseId">>
): Promise<Lesson | null> {
    const lessons = await listLessons();
    const index = lessons.findIndex((lesson) => lesson.id === id);
    if (index === -1) return null;
    lessons[index] = { ...lessons[index], ...patch };
    await writeJson(KEYS.lessons, lessons);
    return lessons[index];
}

/* -------------------------------- releases --------------------------------- */

export function listReleases(): Promise<Release[]> {
    return readJson<Release[]>(KEYS.releases, []);
}

async function nextVersion(): Promise<string> {
    const current = await readJson<{ n: number }>(KEYS.version, { n: 0 });
    const n = (current.n ?? 0) + 1;
    await writeJson(KEYS.version, { n });
    return `eval.${n}`;
}

/**
 * Trigger a Vercel Deploy Hook. Set VERCEL_DEPLOY_HOOK_URL on the server. The
 * URL is never logged or returned.
 */
export async function triggerDeploy(): Promise<DeployResult> {
    const at = Date.now();
    const url = process.env.VERCEL_DEPLOY_HOOK_URL;
    if (!url) {
        return { attempted: false, ok: false, error: "not configured", at };
    }
    try {
        const res = await fetch(url, { method: "POST" });
        return {
            attempted: true,
            ok: res.ok,
            error: res.ok ? undefined : `HTTP ${res.status}`,
            at,
        };
    } catch (err) {
        return {
            attempted: true,
            ok: false,
            error: err instanceof Error ? err.message : "request failed",
            at,
        };
    }
}

export async function createRelease(input: {
    title: string;
    summary: string;
    lessonIds: string[];
    branch?: string | null;
    prUrl?: string | null;
    notified?: boolean;
}): Promise<Release> {
    const release: Release = {
        id: randomUUID(),
        version: await nextVersion(),
        createdAt: Date.now(),
        title: input.title,
        summary: input.summary,
        lessonIds: input.lessonIds,
        commit: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
        branch: input.branch ?? null,
        prUrl: input.prUrl ?? null,
        notified: input.notified ?? false,
        deploy: { attempted: false, ok: false, at: Date.now() },
    };
    const releases = await listReleases();
    releases.unshift(release);
    await writeJson(KEYS.releases, releases.slice(0, 200));
    return release;
}

export async function updateRelease(id: string, deploy: DeployResult): Promise<void> {
    const releases = await listReleases();
    const index = releases.findIndex((release) => release.id === id);
    if (index === -1) return;
    releases[index] = { ...releases[index], deploy };
    await writeJson(KEYS.releases, releases);
}
