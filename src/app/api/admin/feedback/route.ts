import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import {
    appendFeedback,
    listFeedback,
    type FeedbackConfig,
} from "@/lib/admin/eval-store";

export const runtime = "nodejs";

function asString(value: unknown, max = 500): string {
    return typeof value === "string" ? value.slice(0, max) : "";
}

function parseConfigs(raw: unknown): FeedbackConfig[] {
    if (!Array.isArray(raw)) return [];
    return raw.slice(0, 20).map((item) => {
        const o = (item ?? {}) as Record<string, unknown>;
        return {
            configId: asString(o.configId, 100),
            provider: asString(o.provider, 20),
            ocrModel: asString(o.ocrModel, 100),
            deepseekModel: asString(o.deepseekModel, 100),
            geminiModel: asString(o.geminiModel, 100),
            merchant: typeof o.merchant === "string" ? o.merchant.slice(0, 200) : null,
            date: typeof o.date === "string" ? o.date.slice(0, 40) : null,
            total: typeof o.total === "number" && Number.isFinite(o.total) ? o.total : null,
            items: typeof o.items === "number" ? o.items : 0,
            flags: Array.isArray(o.flags)
                ? o.flags.slice(0, 50).map((f) => asString(f, 120))
                : [],
        };
    });
}

export async function GET() {
    const user = await currentUser();
    if (!user.admin) {
        return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, feedback: await listFeedback() });
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

    const chosenConfigId = body.chosenConfigId
        ? asString(body.chosenConfigId, 100)
        : null;
    const record = await appendFeedback({
        file: asString(body.file, 300),
        chosenConfigId,
        allWrong: body.allWrong === true || (!chosenConfigId && body.allWrong !== false),
        correction: asString(body.correction, 4000),
        configs: parseConfigs(body.configs),
    });
    return NextResponse.json({ ok: true, feedback: record });
}
