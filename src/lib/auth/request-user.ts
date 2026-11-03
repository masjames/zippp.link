import { mobileApiEnabled } from "@/lib/mobile/config";
import { resolveBearerUser } from "./mobile-auth";
import { currentUser } from "../auth";

export type RequestUser = {
    userId: string;
    email: string | null;
    admin: boolean;
    source: "web" | "mobile";
    deviceId?: string;
    scope?: "mobile_scan";
};

export type ResolveUserResult =
    | { user: RequestUser; error?: never }
    | {
          user: null;
          error:
              | "UNAUTHORIZED"
              | "DEVICE_REVOKED"
              | "INVALID_TOKEN"
              | "SERVER_MISCONFIGURED";
      };

export async function resolveRequestUser(req: Request): Promise<ResolveUserResult> {
    const authHeader = req.headers.get("authorization");
    const hasBearer = Boolean(authHeader?.toLowerCase().startsWith("bearer "));

    if (hasBearer) {
        if (!mobileApiEnabled()) {
            return { user: null, error: "INVALID_TOKEN" };
        }

        const mobile = await resolveBearerUser(req);
        if (!mobile.user) {
            return { user: null, error: mobile.error };
        }

        return {
            user: {
                userId: mobile.user.userId,
                email: mobile.user.email,
                admin: false,
                source: "mobile",
                deviceId: mobile.user.deviceId,
                scope: "mobile_scan",
            },
        };
    }

    // Fall back to the existing web cookie session.
    const webUser = await currentUser();
    if (webUser.signedIn && webUser.userId) {
        return {
            user: {
                userId: webUser.userId,
                email: webUser.email,
                admin: webUser.admin,
                source: "web",
            },
        };
    }

    return { user: null, error: "UNAUTHORIZED" };
}

/** Convenience helper returning RequestUser or null. */
export async function requestUser(req: Request): Promise<RequestUser | null> {
    const res = await resolveRequestUser(req);
    return res.user;
}
