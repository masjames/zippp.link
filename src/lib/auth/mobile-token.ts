import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { mobileJwtSecret } from "@/lib/mobile/config";
import { isDeviceRevoked } from "./device-store";

export type MobileTokenClaims = {
    sub: string; // google_user_id
    email: string | null;
    device_id: string;
    jti: string;
    aud: "zippp-mobile";
    iss: "zippp.link";
    ver: 1;
    scope: "mobile_scan";
    iat: number;
    exp: number;
};

/** 30 days. Revocation is checked on every request, so this is not a free pass. */
const TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

function base64UrlEncode(strOrBuffer: string | Buffer): string {
    const buf = typeof strOrBuffer === "string" ? Buffer.from(strOrBuffer, "utf8") : strOrBuffer;
    return buf
        .toString("base64")
        .replace(/=/g, "")
        .replace(/\+/g, "-")
        .replace(/\//g, "_");
}

function base64UrlDecode(str: string): string {
    let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4 !== 0) {
        base64 += "=";
    }
    return Buffer.from(base64, "base64").toString("utf8");
}

function decodeBase64UrlBuffer(str: string): Buffer {
    let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4 !== 0) {
        base64 += "=";
    }
    return Buffer.from(base64, "base64");
}

export function signMobileToken(params: {
    userId: string;
    email: string | null;
    deviceId: string;
    jti?: string;
    ttlSeconds?: number;
}): { token: string; claims: MobileTokenClaims } {
    const secret = mobileJwtSecret();
    if (!secret) {
        throw new Error("MOBILE_JWT_SECRET is required in production.");
    }

    const now = Math.floor(Date.now() / 1000);
    const exp = now + (params.ttlSeconds ?? TOKEN_TTL_SECONDS);
    const jti = params.jti || randomUUID();

    const header = { alg: "HS256", typ: "JWT" };
    const claims: MobileTokenClaims = {
        sub: params.userId,
        email: params.email ?? null,
        device_id: params.deviceId,
        jti,
        aud: "zippp-mobile",
        iss: "zippp.link",
        ver: 1,
        scope: "mobile_scan",
        iat: now,
        exp,
    };

    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(claims));
    const message = `${encodedHeader}.${encodedPayload}`;
    const signature = createHmac("sha256", secret).update(message).digest();
    const token = `${message}.${base64UrlEncode(signature)}`;
    return { token, claims };
}

export type VerifyMobileTokenResult =
    | { valid: true; claims: MobileTokenClaims }
    | {
          valid: false;
          error:
              | "MALFORMED"
              | "EXPIRED"
              | "INVALID_SIGNATURE"
              | "INVALID_CLAIMS"
              | "DEVICE_REVOKED"
              | "SERVER_MISCONFIGURED";
      };

export async function verifyMobileToken(token: string): Promise<VerifyMobileTokenResult> {
    const secret = mobileJwtSecret();
    if (!secret) {
        return { valid: false, error: "SERVER_MISCONFIGURED" };
    }
    if (!token || typeof token !== "string") {
        return { valid: false, error: "MALFORMED" };
    }

    const parts = token.trim().split(".");
    if (parts.length !== 3) {
        return { valid: false, error: "MALFORMED" };
    }

    const [encodedHeader, encodedPayload, encodedSignature] = parts;

    let header: { alg?: string; typ?: string };
    try {
        header = JSON.parse(base64UrlDecode(encodedHeader)) as { alg?: string; typ?: string };
    } catch {
        return { valid: false, error: "MALFORMED" };
    }
    if (header.alg !== "HS256") {
        return { valid: false, error: "INVALID_SIGNATURE" };
    }

    const message = `${encodedHeader}.${encodedPayload}`;
    const expectedSig = createHmac("sha256", secret).update(message).digest();
    const actualSig = decodeBase64UrlBuffer(encodedSignature);
    if (actualSig.length !== expectedSig.length || !timingSafeEqual(actualSig, expectedSig)) {
        return { valid: false, error: "INVALID_SIGNATURE" };
    }

    let claims: MobileTokenClaims;
    try {
        claims = JSON.parse(base64UrlDecode(encodedPayload)) as MobileTokenClaims;
    } catch {
        return { valid: false, error: "INVALID_CLAIMS" };
    }

    if (
        !claims ||
        typeof claims.sub !== "string" ||
        !claims.sub ||
        typeof claims.device_id !== "string" ||
        !claims.device_id ||
        typeof claims.jti !== "string" ||
        !claims.jti ||
        claims.aud !== "zippp-mobile" ||
        claims.iss !== "zippp.link" ||
        claims.ver !== 1 ||
        claims.scope !== "mobile_scan"
    ) {
        return { valid: false, error: "INVALID_CLAIMS" };
    }

    const now = Math.floor(Date.now() / 1000);
    if (typeof claims.exp !== "number" || claims.exp <= now) {
        return { valid: false, error: "EXPIRED" };
    }
    if (typeof claims.iat !== "number" || claims.iat > now + 60) {
        return { valid: false, error: "INVALID_CLAIMS" };
    }

    const revoked = await isDeviceRevoked(claims.device_id, claims.jti, claims.sub);
    if (revoked) {
        return { valid: false, error: "DEVICE_REVOKED" };
    }

    return { valid: true, claims };
}
