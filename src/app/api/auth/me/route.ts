import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ensureUser } from "@/lib/billing/ledger";
import { billingConfigured } from "@/lib/billing/redis";
import { googleOAuthConfigured } from "@/lib/google/oauth";
import { mobileApiEnabled } from "@/lib/mobile/config";
import { hasTokens, peekGoogleEmail, peekGoogleUserId } from "@/lib/google/token-store";
import { isLocalPreviewAuthEnabled, localPreviewIdentity } from "@/lib/auth/local-preview";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (isLocalPreviewAuthEnabled()) {
    const preview = localPreviewIdentity(request);
    return NextResponse.json(
      {
        signedIn: Boolean(preview),
        googleUserId: preview?.googleUserId ?? null,
        email: preview?.email ?? null,
        oauthConfigured: false,
        mobileApiEnabled: false,
        localPreview: Boolean(preview),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  const signedIn = await hasTokens();
  const userId = signedIn ? await peekGoogleUserId() : null;
  const email = signedIn ? await peekGoogleEmail() : null;

  // Create the billing user record on first load (ref code + referral lock).
  if (signedIn && userId && billingConfigured()) {
    try {
      const jar = await cookies();
      await ensureUser({
        userId,
        email,
        refCode: jar.get("zippp_ref")?.value ?? null,
      });
    } catch (err) {
      console.error(
        JSON.stringify({
          event: "billing.ensureUser.failed",
          error: err instanceof Error ? err.message : String(err),
        })
      );
    }
  }

  return NextResponse.json({
    signedIn,
    googleUserId: userId,
    email,
    oauthConfigured: googleOAuthConfigured(),
    mobileApiEnabled: mobileApiEnabled(),
  });
}
