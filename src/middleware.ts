import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_MAX_AGE, REGION_COOKIE } from "@/lib/region";
import { isLocalPreviewAuthEnabled } from "@/lib/auth/local-preview";

const REF_COOKIE = "zippp_ref";
const INVITE_COOKIE = "zippp_invite";

/**
 * Region and referral.
 *
 * - `/` is international (English, USD); `/id` is Indonesian (IDR).
 * - Indonesian IPs are redirected `/` -> `/id` by the redirect rule in
 *   `next.config.ts` (one-time: it is skipped when the region cookie is set).
 * - `?ref=CODE` is stored for 30 days (used at first sign-in).
 * - The region is forwarded on the request so the first render is correct.
 */
export function middleware(request: NextRequest) {
    const { nextUrl } = request;
    const path = nextUrl.pathname;

    if (isLocalPreviewAuthEnabled()) {
        if (path.startsWith("/api/")) {
            const authBootstrap =
                request.method === "GET" &&
                (path === "/api/auth/me" || path === "/api/auth/session");
            if (authBootstrap) return NextResponse.next();
            return NextResponse.json(
                { ok: false, code: "LOCAL_PREVIEW_READ_ONLY" },
                { status: 403 }
            );
        }
        if (request.method !== "GET" && request.method !== "HEAD") {
            return NextResponse.json(
                { ok: false, code: "LOCAL_PREVIEW_READ_ONLY" },
                { status: 403 }
            );
        }
        if (
            path === "/" ||
            path === "/id" ||
            path === "/app" ||
            path === "/app/home" ||
            path.startsWith("/app/settings") ||
            path.startsWith("/app/topup") ||
            path.startsWith("/admin")
        ) {
            return NextResponse.redirect(new URL("/app/inbox", request.url));
        }
    }

    if (path.startsWith("/api/")) return NextResponse.next();

    const existing = request.cookies.get(REGION_COOKIE)?.value;
    const ref = nextUrl.searchParams.get("ref");
    const invite = nextUrl.searchParams.get("invite");

    // Keep the URL and the region in sync. A visitor already in the Indonesian
    // region who lands on the worldwide route goes to `/id`. The geo case with
    // no cookie is handled by the redirect in next.config.ts.
    if (path === "/" && existing === "id") {
        const url = nextUrl.clone();
        url.pathname = "/id";
        const res = NextResponse.redirect(url);
        res.cookies.set(REGION_COOKIE, "id", { path: "/", maxAge: COOKIE_MAX_AGE, sameSite: "lax" });
        if (ref) {
            res.cookies.set(REF_COOKIE, ref, { path: "/", maxAge: COOKIE_MAX_AGE, sameSite: "lax" });
        }
        if (invite) {
            res.cookies.set(INVITE_COOKIE, invite, {
                path: "/",
                maxAge: COOKIE_MAX_AGE,
                sameSite: "lax",
            });
        }
        return res;
    }

    let region: "id" | "intl" = existing === "id" ? "id" : "intl";
    if (path === "/id" || path.startsWith("/id/")) region = "id";
    else if (path === "/" && !existing) region = "intl";
    else if (
        path.startsWith("/for-") &&
        existing !== "id"
    ) {
        region = "intl";
    }

    const headers = new Headers(request.headers);
    if (existing !== region) {
        const cookieHeader = headers.get("cookie") ?? "";
        headers.set(
            "cookie",
            cookieHeader
                ? `${cookieHeader}; ${REGION_COOKIE}=${region}`
                : `${REGION_COOKIE}=${region}`
        );
    }

    const response = NextResponse.next({ request: { headers } });
    if (existing !== region) {
        response.cookies.set(REGION_COOKIE, region, { path: "/", maxAge: COOKIE_MAX_AGE, sameSite: "lax" });
    }
    if (ref) {
        response.cookies.set(REF_COOKIE, ref, { path: "/", maxAge: COOKIE_MAX_AGE, sameSite: "lax" });
    }
    if (invite) {
        response.cookies.set(INVITE_COOKIE, invite, {
            path: "/",
            maxAge: COOKIE_MAX_AGE,
            sameSite: "lax",
        });
    }
    return response;
}

export const config = {
    matcher: [
        "/api/:path*",
        "/((?!_next/static|_next/image|api|.*\\..*).*)",
    ],
};
