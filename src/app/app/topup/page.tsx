import { Suspense } from "react";
import { cookies } from "next/headers";
import TopUpClient from "@/components/app/screens/TopUpClient";
import {
    gopayConfigured,
    IDR_PER_CREDIT,
    MIN_TOPUP_IDR,
} from "@/lib/billing/config";
import { paddleConfig, paddleConfigured } from "@/lib/billing/paddle";
import { billingConfigured } from "@/lib/billing/redis";
import { claimInvite, getUserInvite, type Invite } from "@/lib/billing/invites";
import { currentUser } from "@/lib/auth";
import { getLocale } from "@/lib/server-locale";

export default async function TopUpPage() {
    const { region } = await getLocale();
    const paddle = { ...paddleConfig(), configured: paddleConfigured() };

    let invite: Invite | null = null;
    if (billingConfigured()) {
        const user = await currentUser();
        if (user.signedIn && user.userId) {
            const jar = await cookies();
            const code = jar.get("zippp_invite")?.value;
            if (code) {
                try {
                    invite = await claimInvite(code, user.userId, user.email);
                } catch {
                    /* ignore */
                }
            }
            if (!invite) invite = await getUserInvite(user.userId);
        }
    }
    const claimed = invite?.status === "claimed";
    const minIdr = claimed && invite ? invite.minTopupIdr : MIN_TOPUP_IDR;

    return (
        <Suspense>
            <TopUpClient
                region={region}
                paddle={paddle}
                gopay={gopayConfigured()}
                minIdr={minIdr}
                invited={claimed}
                idrPerCredit={IDR_PER_CREDIT}
            />
        </Suspense>
    );
}
