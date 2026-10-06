import { REFERRED_BONUS_CREDITS, REFERRER_PCT } from "./config";
import { grant, loadUser, updateUser, userIdForCode } from "./ledger";

/**
 * Run after any approved/completed top-up.
 *
 * - The referred user gets REFERRED_BONUS_CREDITS once, on their first top-up.
 * - The referrer gets floor(REFERRER_PCT% of the granted credits) every time.
 *
 * Idempotent: grants are keyed on `idemBase`, which is the order/transaction id.
 */
export async function onTopupApproved(
    userId: string,
    credits: number,
    idemBase: string
): Promise<void> {
    const user = await loadUser(userId);
    if (!user) return;

    if (!user.firstTopupDone) {
        // The bonus is only for users who arrived through a referral; without a
        // referrer there is no free credit (no trial, no free tier).
        if (user.referredBy) {
            await grant({
                userId,
                credits: REFERRED_BONUS_CREDITS,
                source: "referral_bonus",
                idem: `${idemBase}:bonus`,
            });
        }
        await updateUser(userId, { firstTopupDone: true });
    }

    if (user.referredBy) {
        const referrerId = await userIdForCode(user.referredBy);
        if (referrerId && referrerId !== userId) {
            const reward = Math.floor((credits * REFERRER_PCT) / 100);
            if (reward > 0) {
                await grant({
                    userId: referrerId,
                    credits: reward,
                    source: "referral_reward",
                    idem: `${idemBase}:ref`,
                });
            }
        }
    }
}
