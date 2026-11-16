import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";

export const runtime = "nodejs";

/** Read the current web identity without creating billing or referral records. */
export async function GET() {
    const { signedIn, userId } = await currentUser();
    return NextResponse.json({ signedIn, userId }, { headers: { "Cache-Control": "no-store" } });
}
