import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import {
  claimInvite,
  getInvite,
  getUserInvite,
  type Invite,
} from "@/lib/billing/invites";
import {
  gopayConfigured,
  IDR_PER_CREDIT,
  IDR_TOPUP_PRESETS,
  MAX_TOPUP_IDR,
  MIN_TOPUP_IDR,
} from "@/lib/billing/config";
import { billingConfigured } from "@/lib/billing/redis";
import { kaseraConfigured } from "@/lib/billing/kasera";
import { paddleClientConfig, paddleConfig } from "@/lib/billing/paddle";
import { getLocale } from "@/lib/server-locale";

export const runtime = "nodejs";

function noStore(data: unknown, status = 200): NextResponse {
  const response = NextResponse.json(data, { status });
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET() {
  const user = await currentUser();
  if (!user.signedIn || !user.userId) {
    return noStore({ ok: false, code: "UNAUTHORIZED" }, 401);
  }
  const billingReady = billingConfigured();

  let invite: Invite | null = null;
  let inviteMismatch: string | null = null;
  if (billingReady) {
    const jar = await cookies();
    const code = jar.get("zippp_invite")?.value;
    if (code) {
      try {
        invite = await claimInvite(code, user.userId, user.email);
      } catch {
        // Keep the existing TopUp behavior: a failed claim does not block the page.
      }
      if (!invite && user.email) {
        try {
          const pending = await getInvite(code);
          if (
            pending &&
            pending.status !== "revoked" &&
            pending.email.toLowerCase() !== user.email.toLowerCase()
          ) {
            inviteMismatch = pending.email;
          }
        } catch {
          // The server remains authoritative for the eventual order minimum.
        }
      }
    }
    if (!invite) invite = await getUserInvite(user.userId);
  }

  const { region } = await getLocale();
  const paddle = paddleConfig();
  return noStore({
    ok: true,
    region,
    gopay: gopayConfigured() && billingReady,
    qris: kaseraConfigured() && billingReady,
    minIdr: invite?.status === "claimed" ? invite.minTopupIdr : MIN_TOPUP_IDR,
    maxIdr: MAX_TOPUP_IDR,
    idrPerCredit: IDR_PER_CREDIT,
    presets: IDR_TOPUP_PRESETS,
    inviteMismatch,
    paddle: {
      configured: billingReady && Boolean(paddle.clientToken && paddle.priceId),
      ...paddleClientConfig(paddle),
    },
  });
}
