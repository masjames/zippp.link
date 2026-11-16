import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { isLocalPreviewAuthEnabled, localPreviewIdentity } from "@/lib/auth/local-preview";

export const runtime = "nodejs";

/** Read the current web identity without creating billing or referral records. */
export async function GET(request: Request) {
    if (isLocalPreviewAuthEnabled()) {
        const preview = localPreviewIdentity(request);
        return NextResponse.json(
            {
                signedIn: Boolean(preview),
                userId: preview?.userId ?? null,
                localPreview: Boolean(preview),
            },
            { headers: { "Cache-Control": "no-store" } }
        );
    }
    const { signedIn, userId } = await currentUser();
    return NextResponse.json({ signedIn, userId }, { headers: { "Cache-Control": "no-store" } });
}
