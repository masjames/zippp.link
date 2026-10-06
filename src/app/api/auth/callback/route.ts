import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/billing/config";
import {
  createOAuthClient,
  googleOAuthConfigured,
  resolveGoogleUser,
} from "@/lib/google/oauth";
import { applySession } from "@/lib/google/session";
import { saveTokens } from "@/lib/google/token-store";

export const runtime = "nodejs";

const STATE_COOKIE = "zippp_oauth_state";

function redirectHome(
  req: Request,
  auth: "ok" | "error",
  reason?: string,
  path = "/app"
): NextResponse {
  const url = new URL(path, req.url);
  url.searchParams.set("auth", auth);
  if (reason) url.searchParams.set("reason", reason);
  const res = NextResponse.redirect(url);
  res.cookies.set(STATE_COOKIE, "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
  return res;
}

export async function GET(req: Request) {
  if (!googleOAuthConfigured()) {
    return redirectHome(req, "error", "missing_google_oauth_env");
  }

  const incoming = new URL(req.url);
  const err = incoming.searchParams.get("error");
  if (err) {
    return redirectHome(req, "error", err);
  }

  const code = incoming.searchParams.get("code");
  const state = incoming.searchParams.get("state");
  if (!code || !state) {
    return redirectHome(req, "error", "missing_code_or_state");
  }

  const jar = await cookies();
  const expected = jar.get(STATE_COOKIE)?.value;
  if (!expected || expected !== state) {
    return redirectHome(req, "error", "invalid_state");
  }

  try {
    const client = createOAuthClient();
    const { tokens } = await client.getToken(code);
    if (!tokens.refresh_token) {
      return redirectHome(req, "error", "no_refresh_token");
    }
    if (!tokens.access_token) {
      return redirectHome(req, "error", "no_access_token");
    }

    client.setCredentials(tokens);
    const user = await resolveGoogleUser(client, tokens.access_token);

    await saveTokens({
      google_user_id: user.id,
      email: user.email,
      refresh_token: tokens.refresh_token,
      access_token: tokens.access_token,
      expiry_date: tokens.expiry_date ?? null,
    });

    // Bind this browser to the user so tokens/workspace/billing are per-user.
    // Admins land straight on the admin panel.
    const response = redirectHome(
      req,
      "ok",
      undefined,
      isAdmin(user.email) ? "/admin" : "/app"
    );
    applySession(user.id, response);
    return response;
  } catch (e) {
    const message = e instanceof Error ? e.message : "token_exchange_failed";
    console.error("OAuth callback failed:", message);
    return redirectHome(req, "error", "token_exchange_failed");
  }
}
