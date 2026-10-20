/** WhatsApp channel. Off unless explicitly enabled. */

export type WaProvider = "meta" | "twilio" | "mock";

export function waChannelEnabled(): boolean {
    return process.env.WA_CHANNEL_ENABLED === "true";
}

/** UI mock playground — no Meta/Twilio secrets. Safe for Preview. */
export function waMockMode(): boolean {
    if (process.env.WA_MOCK === "true") return true;
    return waProviderRaw() === "mock";
}

/**
 * Active live transport. Precedence:
 * 1) WA_PROVIDER=meta|twilio|mock
 * 2) WA_TWILIO_ENABLED=true → twilio
 * 3) default meta
 */
export function waProvider(): WaProvider {
    const raw = waProviderRaw();
    if (raw === "mock" || raw === "twilio" || raw === "meta") return raw;
    if (process.env.WA_TWILIO_ENABLED === "true") return "twilio";
    return "meta";
}

function waProviderRaw(): string | undefined {
    const v = process.env.WA_PROVIDER?.trim().toLowerCase();
    return v || undefined;
}

/** Settings panel / mock entry when live channel OR mock is on. */
export function waUiEnabled(): boolean {
    return waChannelEnabled() || waMockMode();
}

export function waConfigured(): boolean {
    return waProvider() === "twilio" ? waTwilioConfigured() : waMetaConfigured();
}

export function waMetaConfigured(): boolean {
    return Boolean(
        process.env.META_WA_ACCESS_TOKEN &&
            process.env.META_WA_PHONE_NUMBER_ID &&
            process.env.META_WA_VERIFY_TOKEN &&
            process.env.META_WA_APP_SECRET
    );
}

export function waTwilioConfigured(): boolean {
    return Boolean(
        process.env.TWILIO_ACCOUNT_SID &&
            process.env.TWILIO_AUTH_TOKEN &&
            process.env.TWILIO_WHATSAPP_FROM
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

export function twilioAccountSid(): string {
    return process.env.TWILIO_ACCOUNT_SID ?? "";
}

export function twilioAuthToken(): string {
    return process.env.TWILIO_AUTH_TOKEN ?? "";
}

/** e.g. whatsapp:+14155238886 */
export function twilioWhatsAppFrom(): string {
    return process.env.TWILIO_WHATSAPP_FROM ?? "";
}

/** Optional Content SID for review quick-replies (Sandbox may use freeform). */
export function twilioContentSidReview(): string {
    return process.env.TWILIO_CONTENT_SID_REVIEW ?? "";
}

/** Soft cap on outbound service messages per calendar month (UTC). */
export function waServiceMsgSoftCap(): number {
    const n = Number(process.env.WA_SERVICE_MSG_SOFT_CAP ?? "800");
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 800;
}

/** Digits-only display number for wa.me deep links. */
export function waDisplayNumber(): string {
    const meta = process.env.META_WA_DISPLAY_NUMBER?.replace(/\D/g, "");
    if (meta) return meta;
    const from = twilioWhatsAppFrom().replace(/^whatsapp:/i, "");
    return from.replace(/\D/g, "");
}

export const WA_GRAPH_BASE = "https://graph.facebook.com/v21.0";
