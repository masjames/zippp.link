import { verifyMobileToken } from "./mobile-token";
import { touchDevice } from "./device-store";

export type MobileUser = {
    userId: string;
    email: string | null;
    deviceId: string;
    jti: string;
};

export type MobileAuthResult =
    | { user: MobileUser; error?: never }
    | {
          user: null;
          error:
              | "INVALID_TOKEN"
              | "DEVICE_REVOKED"
              | "SERVER_MISCONFIGURED"
              | "UNAUTHORIZED";
      };

/**
 * Bearer-only resolver. This module deliberately imports no Google modules so
 * it can be used by /api/extract without breaking the data-boundary law.
 */
export async function resolveBearerUser(req: Request): Promise<MobileAuthResult> {
    const header = req.headers.get("authorization");
    if (!header || !header.toLowerCase().startsWith("bearer ")) {
        return { user: null, error: "UNAUTHORIZED" };
    }

    const token = header.slice(7).trim();
    const verification = await verifyMobileToken(token);
    if (!verification.valid) {
        if (verification.error === "DEVICE_REVOKED") {
            return { user: null, error: "DEVICE_REVOKED" };
        }
        if (verification.error === "SERVER_MISCONFIGURED") {
            return { user: null, error: "SERVER_MISCONFIGURED" };
        }
        return { user: null, error: "INVALID_TOKEN" };
    }

    const { claims } = verification;
    void touchDevice(claims.device_id);

    return {
        user: {
            userId: claims.sub,
            email: claims.email,
            deviceId: claims.device_id,
            jti: claims.jti,
        },
    };
}
