import { NextResponse, type NextRequest } from "next/server";
import {
    COOKIE_MAX_AGE,
    REGION_COOKIE,
    regionFromAcceptLanguage,
    regionFromCountry,
} from "@/lib/region";

/**
 * Stamp the visitor's region once. Vercel sets `x-vercel-ip-country` on every
 * request; locally we fall back to Accept-Language. The region is written to
 * both the response (so it persists) and the forwarded request (so the very
 * first render already uses it). It never flips under a returning visitor
 * because the existing cookie wins.
 */
export function middleware(request: NextRequest) {
    const existing = request.cookies.get(REGION_COOKIE)?.value;
    // ?region=id|intl lets you preview a market locally; otherwise the
    // detected country (Vercel) or Accept-Language (local) decides.
    const override = request.nextUrl.searchParams.get("region");
    const region =
        override === "id" || override === "intl"
            ? override
            : existing === "id" || existing === "intl"
              ? existing
              : request.headers.get("x-vercel-ip-country")
                ? regionFromCountry(request.headers.get("x-vercel-ip-country"))
                : regionFromAcceptLanguage(request.headers.get("accept-language"));

    const headers = new Headers(request.headers);
    const cookieHeader = headers.get("cookie") ?? "";
    if (existing !== region) {
        headers.set(
            "cookie",
            cookieHeader
                ? `${cookieHeader}; ${REGION_COOKIE}=${region}`
                : `${REGION_COOKIE}=${region}`
        );
    }

    const response = NextResponse.next({ request: { headers } });
    if (existing !== region) {
        response.cookies.set(REGION_COOKIE, region, {
            path: "/",
            maxAge: COOKIE_MAX_AGE,
            sameSite: "lax",
        });
    }

    return response;
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|api|.*\\..*).*)"],
};
