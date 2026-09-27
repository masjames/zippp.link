import { NextResponse } from "next/server";
import { googleOAuthConfigured } from "@/lib/google/oauth";
import { hasTokens, peekGoogleUserId } from "@/lib/google/token-store";

export const runtime = "nodejs";

export async function GET() {
  const signedIn = await hasTokens();
  const googleUserId = signedIn ? await peekGoogleUserId() : null;
  return NextResponse.json({
    signedIn,
    googleUserId,
    oauthConfigured: googleOAuthConfigured(),
  });
}
