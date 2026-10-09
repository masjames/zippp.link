import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import {
    createRelease,
    listFeedback,
    listLessons,
    listReleases,
    triggerDeploy,
    updateLesson,
    updateRelease,
} from "@/lib/admin/eval-store";

export const runtime = "nodejs";

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

    // Approve: record the release and trigger the deploy hook.
    const lesson = await updateLesson(id, { title, detail });
    if (!lesson) {
        return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
    }
    const release = await createRelease({
        title: lesson.title,
        summary: lesson.detail,
        lessonIds: [lesson.id],
    });
    const deploy = await triggerDeploy();
    await updateRelease(release.id, deploy);
    await updateLesson(id, {
        status: "approved",
        decidedAt: Date.now(),
        releaseId: release.id,
    });
    return NextResponse.json({
        ok: true,
        lesson: { ...lesson, status: "approved", releaseId: release.id },
        release: { ...release, deploy },
        deploy,
    });
}
