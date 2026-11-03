// @implements FEAT-116
import { NextResponse } from "next/server";
import { requestUser } from "@/lib/auth/request-user";
import {
    createLedgerItem,
    listLedger,
    type LedgerKind,
} from "@/lib/space/ledger-store";
import { getSpace } from "@/lib/space/space-store";

export const runtime = "nodejs";

function noStore(data: unknown, status = 200): NextResponse {
    const res = NextResponse.json(data, { status });
    res.headers.set("Cache-Control", "no-store");
    return res;
}

type Ctx = { params: Promise<{ spaceId: string }> };

async function memberRole(spaceId: string, userId: string) {
    const space = await getSpace(spaceId);
    if (!space) return { error: "NOT_FOUND" as const };
    const member = space.members.find((m) => m.user_id === userId);
    if (!member) return { error: "FORBIDDEN" as const };
    return { space, role: member.role };
}

export async function GET(req: Request, ctx: Ctx) {
    const user = await requestUser(req);
    if (!user) return noStore({ ok: false, code: "UNAUTHORIZED" }, 401);
    const { spaceId } = await ctx.params;

    const access = await memberRole(spaceId, user.userId);
    if ("error" in access) {
        return noStore(
            { ok: false, code: access.error },
            access.error === "NOT_FOUND" ? 404 : 403
        );
    }

    const items = await listLedger(spaceId);
    return noStore({ ok: true, items });
}

export async function POST(req: Request, ctx: Ctx) {
    const user = await requestUser(req);
    if (!user) return noStore({ ok: false, code: "UNAUTHORIZED" }, 401);
    const { spaceId } = await ctx.params;

    const access = await memberRole(spaceId, user.userId);
    if ("error" in access) {
        return noStore(
            { ok: false, code: access.error },
            access.error === "NOT_FOUND" ? 404 : 403
        );
    }

    let body: Record<string, unknown>;
    try {
        body = (await req.json()) as Record<string, unknown>;
    } catch {
        return noStore({ ok: false, code: "INVALID_REQUEST" }, 400);
    }

    try {
        const item = await createLedgerItem({
            spaceId,
            userId: user.userId,
            kind: body.kind as LedgerKind,
            name: typeof body.name === "string" ? body.name : "",
            amount: body.amount,
            progress: body.progress,
            note: typeof body.note === "string" ? body.note : null,
        });
        return noStore({ ok: true, item });
    } catch (err) {
        const message = err instanceof Error ? err.message : "SERVER_ERROR";
        if (
            message === "INVALID_NAME" ||
            message === "INVALID_AMOUNT" ||
            message === "INVALID_KIND"
        ) {
            return noStore({ ok: false, code: message }, 400);
        }
        return noStore({ ok: false, code: "SERVER_ERROR" }, 500);
    }
}
