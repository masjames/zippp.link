import { remoteTextStore } from "./kv";

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
            refresh_token: refreshToken,
            updated_at: new Date().toISOString(),
        })
    );
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
        return parsed.refresh_token || null;
    } catch {
        return null;
    }
}
