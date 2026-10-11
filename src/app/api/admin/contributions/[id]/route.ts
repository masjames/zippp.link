import { promises as fs } from "node:fs";
import { get as blobGet } from "@vercel/blob";
import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getContribution } from "@/lib/contribute-store";

export const runtime = "nodejs";

/** Stream a donated image to an admin. Private Blob, or the local .data file. */
export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await currentUser();
    if (!user.admin) {
        return new NextResponse("Not found", { status: 404 });
    }
    const { id } = await params;
    const record = await getContribution(id);
    if (!record) {
        return new NextResponse("Not found", { status: 404 });
    }

    const headers = {
        "Content-Type": record.type,
        "Cache-Control": "private, max-age=60",
    };

    if (record.pathname.startsWith("local:")) {
        try {
            const bytes = await fs.readFile(record.pathname.slice("local:".length));
            return new NextResponse(bytes, { headers });
        } catch {
            return new NextResponse("Not found", { status: 404 });
        }
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
        return new NextResponse("Not found", { status: 404 });
    }
    const result = await blobGet(record.pathname, {
        access: "private",
        useCache: false,
    });
    if (!result || result.statusCode !== 200 || !result.stream) {
        return new NextResponse("Not found", { status: 404 });
    }
    return new NextResponse(result.stream, { headers });
}
