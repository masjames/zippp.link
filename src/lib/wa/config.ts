/** WhatsApp Cloud API channel. Off unless explicitly enabled. */

export function waChannelEnabled(): boolean {
    return process.env.WA_CHANNEL_ENABLED === "true";
}

/** UI mock playground — no Meta secrets. Safe for Preview. */
export function waMockMode(): boolean {
    return process.env.WA_MOCK === "true";
}

/** Settings panel / mock entry when live channel OR mock is on. */
export function waUiEnabled(): boolean {
    return waChannelEnabled() || waMockMode();
}

export function waConfigured(): boolean {
    return Boolean(
        process.env.META_WA_ACCESS_TOKEN &&
            process.env.META_WA_PHONE_NUMBER_ID &&
            process.env.META_WA_VERIFY_TOKEN &&
            process.env.META_WA_APP_SECRET
    );
}

export function waAccessToken(): string {
    return process.env.META_WA_ACCESS_TOKEN ?? "";
}

export function waPhoneNumberId(): string {
    return process.env.META_WA_PHONE_NUMBER_ID ?? "";
}

export function waVerifyToken(): string {
    return process.env.META_WA_VERIFY_TOKEN ?? "";
}

export function waAppSecret(): string {
    return process.env.META_WA_APP_SECRET ?? "";
}

/** Soft cap on outbound service messages per calendar month (UTC). */
export function waServiceMsgSoftCap(): number {
    const n = Number(process.env.WA_SERVICE_MSG_SOFT_CAP ?? "800");
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 800;
}

export const WA_GRAPH_BASE = "https://graph.facebook.com/v21.0";
