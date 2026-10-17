import { decryptSecret, encryptSecret } from "./crypto";
import { remoteTextStore } from "./kv";
import { loadTokens } from "./token-store";

/**
 * Dedicated refresh token for donation Drive uploads.
 *
 * The admin's normal session token is deleted on logout, so donations need a
 * copy that survives sign-out. On the admin's OAuth callback we copy their
 * refresh token here. `DONATION_GOOGLE_REFRESH_TOKEN` still wins when set, for
 * a separate donation account.
 */

const KEY = "donation/refresh-token.json";

export async function saveDonationRefreshToken(
    refreshToken: string
): Promise<void> {
    const remote = remoteTextStore();
    if (!remote) return;
    await remote.writeText(
        KEY,
        JSON.stringify({
            refresh_token: encryptSecret(refreshToken),
            updated_at: new Date().toISOString(),
        })
    );
}

/**
 * Copy the signed-in admin's session refresh token if no donation token exists.
 * Runs on the admin page, so a deploy does not require another sign-in.
 */
export async function ensureDonationTokenFromSession(): Promise<boolean> {
    if (await loadDonationRefreshToken()) return true;
    const tokens = await loadTokens();
    if (!tokens?.refresh_token) return false;
    await saveDonationRefreshToken(tokens.refresh_token);
    return true;
}

export async function loadDonationRefreshToken(): Promise<string | null> {
    const fromEnv = process.env.DONATION_GOOGLE_REFRESH_TOKEN;
    if (fromEnv) return fromEnv;
    const remote = remoteTextStore();
    if (!remote) return null;
    try {
        const raw = await remote.readText(KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as { refresh_token?: string };
        if (!parsed.refresh_token) return null;
        return decryptSecret(parsed.refresh_token);
    } catch {
        return null;
    }
}
