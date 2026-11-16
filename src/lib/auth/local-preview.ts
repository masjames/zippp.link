export const LOCAL_PREVIEW_USER_ID = "local-preview-user";
const LOCAL_PREVIEW_EMAIL = "local-preview@example.invalid";

export type LocalPreviewIdentity = {
    userId: string;
    googleUserId: string;
    email: string;
    localPreview: true;
};

type LocalPreviewEnvironment = Readonly<{
    NODE_ENV?: string;
    ZIPPP_LOCAL_DUMMY_AUTH?: string;
    ZIPPP_LOCAL_DUMMY_HOST?: string;
    VERCEL?: string;
}>;

/** The preview identity exists only in an explicitly enabled local dev server. */
export function isLocalPreviewAuthEnabled(
    environment: LocalPreviewEnvironment = process.env
): boolean {
    return (
        environment.NODE_ENV === "development" &&
        environment.ZIPPP_LOCAL_DUMMY_AUTH === "1" &&
        !environment.VERCEL
    );
}

export function localPreviewIdentity(
    request: Request,
    environment: LocalPreviewEnvironment = process.env
): LocalPreviewIdentity | null {
    if (!isLocalPreviewAuthEnabled(environment)) return null;
    const hostname = new URL(request.url).hostname;
    if (
        hostname !== "localhost" &&
        hostname !== "127.0.0.1" &&
        hostname !== "[::1]" &&
        hostname !== environment.ZIPPP_LOCAL_DUMMY_HOST &&
        !isTailscaleIpv4(hostname)
    ) {
        return null;
    }
    return {
        userId: LOCAL_PREVIEW_USER_ID,
        googleUserId: LOCAL_PREVIEW_USER_ID,
        email: LOCAL_PREVIEW_EMAIL,
        localPreview: true,
    };
}

function isTailscaleIpv4(hostname: string): boolean {
    const octets = hostname.split(".").map(Number);
    return (
        octets.length === 4 &&
        octets.every((octet) => Number.isInteger(octet) && octet >= 0 && octet <= 255) &&
        octets[0] === 100 &&
        octets[1] >= 64 &&
        octets[1] <= 127
    );
}
