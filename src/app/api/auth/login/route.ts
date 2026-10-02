import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  buildConsentUrl,
  createOAuthClient,
  googleOAuthConfigured,
} from "@/lib/google/oauth";

export const runtime = "nodejs";

const STATE_COOKIE = "zippp_oauth_state";

export async function GET(req: Request) {
  if (!googleOAuthConfigured()) {
    const url = new URL("/app", req.url);
    url.searchParams.set("auth", "error");
    url.searchParams.set(
      "reason",
      "missing_google_oauth_env"
    );
    return NextResponse.redirect(url);
  }

  const state = randomBytes(24).toString("hex");
  const client = createOAuthClient();
  const consentUrl = buildConsentUrl(client, state);

  const jar = await cookies();
  jar.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });

  return NextResponse.redirect(consentUrl);
}
