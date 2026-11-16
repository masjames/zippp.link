import { NextResponse } from "next/server";
import { resolveRequestUser } from "@/lib/auth/request-user";
import { matchesAppendOwner } from "@/lib/auth/append-owner";
import { dateInTimeZone, summarizeLegacyReceipts } from "@/lib/cashflow/legacy-summary";
import { readSheetValues, SheetsAuthError } from "@/lib/google/sheets";
import { loadWorkspaceForUser } from "@/lib/google/workspace-store";

export const runtime = "nodejs";

function failure(code: string, status: number) {
    return NextResponse.json({ ok: false, code }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(req: Request) {
    const { user } = await resolveRequestUser(req);
    if (!user) return failure("UNAUTHORIZED", 401);
    if (user.source !== "web") return failure("UNSUPPORTED_CLIENT", 403);
    if (!matchesAppendOwner(user, new URL(req.url).searchParams.get("expectedUserId"))) {
        return failure("OWNER_MISMATCH", 403);
    }

    const timeZone = new URL(req.url).searchParams.get("timeZone");
    if (!timeZone) return failure("INVALID_TIMEZONE", 400);
    let today: string;
    try {
        today = dateInTimeZone(new Date(), timeZone);
    } catch {
        return failure("INVALID_TIMEZONE", 400);
    }

    try {
        const workspace = await loadWorkspaceForUser(user.userId);
        if (!workspace || workspace.google_user_id !== user.userId) return failure("NO_WORKSPACE", 404);
        if (workspace.template_id !== "personal-expense") return failure("UNSUPPORTED_TEMPLATE", 422);
        const values = await readSheetValues(workspace.spreadsheet_id, workspace.sheet_tab, user.userId);
        const summary = summarizeLegacyReceipts(values, workspace.column_map, today);
        return NextResponse.json({ ok: true, summary }, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
        if (error instanceof SheetsAuthError) return failure("GOOGLE_RECONSENT", 401);
        return failure("SUMMARY_UNAVAILABLE", 503);
    }
}
