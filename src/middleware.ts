import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_MAX_AGE, REGION_COOKIE } from "@/lib/region";

const REF_COOKIE = "zippp_ref";

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
    const existing = request.cookies.get(REGION_COOKIE)?.value;
    const ref = nextUrl.searchParams.get("ref");

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
        return res;
    }

    let region: "id" | "intl" = existing === "id" ? "id" : "intl";
    if (path === "/id") region = "id";
    else if (path === "/" && !existing) region = "intl";

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
    return response;
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|api|.*\\..*).*)"],
};
