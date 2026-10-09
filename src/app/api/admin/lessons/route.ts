import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { sendTelegram } from "@/lib/telegram";
import { githubConfigured, openChangeRequest } from "@/lib/admin/github";
import {
    createRelease,
    listFeedback,
    listLessons,
    listReleases,
    updateLesson,
    type EvalFeedback,
    type Lesson,
} from "@/lib/admin/eval-store";

export const runtime = "nodejs";

function dossier(lesson: Lesson, feedback: EvalFeedback | undefined): string {
    const lines = [
        `# Lesson: ${lesson.title}`,
        "",
        `- Lesson id: ${lesson.id}`,
        `- File: ${lesson.file}`,
        `- Created: ${new Date(lesson.createdAt).toISOString()}`,
        "",
        "## What was wrong",
        "",
        lesson.detail,
        "",
        "## What zippp read",
        "",
    ];
    for (const config of feedback?.configs ?? []) {
        lines.push(
            `- ${config.configId} (${config.provider} ${config.ocrModel} ${config.deepseekModel} ${config.geminiModel}): merchant ${config.merchant ?? "(null)"}, date ${config.date ?? "(null)"}, total ${config.total ?? "(null)"}, ${config.items} item(s), flags [${config.flags.join(", ")}]`
        );
    }
    lines.push(
        "",
        "## Next step",
        "",
        "Implement the fix on this branch, run `npm test` and `npm run build`, then merge.",
        "Merging deploys through the Vercel GitHub integration.",
        ""
    );
    return lines.join("\n");
}

export async function GET() {
    const user = await currentUser();
    if (!user.admin) {
        return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
    }
    const [lessons, feedback, releases] = await Promise.all([
        listLessons(),
        listFeedback(),
        listReleases(),
    ]);
    return NextResponse.json({ ok: true, lessons, feedback, releases });
}

export async function POST(req: Request) {
    const user = await currentUser();
    if (!user.admin) {
        return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
    }
    let body: Record<string, unknown>;
    try {
        body = (await req.json()) as Record<string, unknown>;
    } catch {
        return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
    }

    const id = typeof body.id === "string" ? body.id : "";
    const action = typeof body.action === "string" ? body.action : "";
    if (!id || (action !== "approve" && action !== "reject" && action !== "update")) {
        return NextResponse.json({ ok: false, error: "Bad request." }, { status: 400 });
    }

    const title = typeof body.title === "string" ? body.title.slice(0, 200) : undefined;
    const detail = typeof body.detail === "string" ? body.detail.slice(0, 4000) : undefined;

    if (action === "update") {
        const lesson = await updateLesson(id, { title, detail });
        if (!lesson) {
            return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
        }
        return NextResponse.json({ ok: true, lesson });
    }

    if (action === "reject") {
        const lesson = await updateLesson(id, { status: "rejected", decidedAt: Date.now() });
        if (!lesson) {
            return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
        }
        return NextResponse.json({ ok: true, lesson });
    }

    // Approve: open a change request (branch + dossier + PR) and notify Telegram.
    const lesson = await updateLesson(id, { title, detail });
    if (!lesson) {
        return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
    }

    const feedback = (await listFeedback()).find((f) => f.id === lesson.feedbackId);
    const branchName = `zippp/lesson/${lesson.id.slice(0, 8)}`;

    let branch: string | null = null;
    let prUrl: string | null = null;
    let githubError: string | null = null;
    if (githubConfigured()) {
        try {
            const cr = await openChangeRequest({
                branch: branchName,
                title: `Lesson: ${lesson.title}`,
                body: `${lesson.detail}\n\nOpened from /admin/lessons on zippp.`,
                path: `eval/lessons/${lesson.id}.md`,
                content: dossier(lesson, feedback),
            });
            branch = cr.branch;
            prUrl = cr.prUrl;
        } catch (err) {
            githubError = err instanceof Error ? err.message : "GitHub failed";
        }
    } else {
        githubError = "GitHub not configured";
    }

    const notified = Boolean(
        process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID
    );
    const lines = [
        `zippp change request: ${lesson.title}`,
        prUrl ? `PR: ${prUrl}` : `No PR: ${githubError ?? "unknown"}`,
        `File: ${lesson.file}`,
    ];
    await sendTelegram(lines.join("\n"));

    const release = await createRelease({
        title: lesson.title,
        summary: lesson.detail,
        lessonIds: [lesson.id],
        branch,
        prUrl,
        notified,
    });

    const updated = await updateLesson(id, {
        status: "approved",
        decidedAt: Date.now(),
        releaseId: release.id,
    });

    return NextResponse.json({
        ok: true,
        lesson: updated,
        release,
        branch,
        prUrl,
        githubError,
        notified,
    });
}
