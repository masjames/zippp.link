"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LOW_CREDITS_WARN, MIN_TOPUP_IDR } from "@/lib/billing/config";
import { fill } from "@/lib/t";
import { useApp } from "./AppProvider";

/** Small gear for the Settings entry point. */
function GearIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
        >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
    );
}

/** Home glyph for the back-to-app control. */
function HomeIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
        >
            <path d="M3 10.5 12 3l9 7.5" />
            <path d="M5 10v11h14V10" />
        </svg>
    );
}

/** Small lightning bolt for the credit pill. */
function BoltIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            className="h-3.5 w-3.5"
            fill="currentColor"
            aria-hidden
        >
            <path d="M13 2 4.5 13.5H11l-1 8.5L18.5 10H12z" />
        </svg>
    );
}

/**
 * Guard + chrome for the /app routes.
 *
 * Guard order (stop at first failure): loading -> no session -> landing
 * (`/` or `/id`); no sheet -> /app/settings/sheet; ready -> /app/snap. Bare
 * /app also lands on /app/snap.
 */
export default function AppShell({ children }: { children: ReactNode }) {
    const { t, auth, authChecked, workspace, balance, region } = useApp();
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        if (!authChecked) return;
        const onSheet = pathname === "/app/settings/sheet";

        if (!auth?.signedIn) {
            router.replace(region === "id" ? "/id" : "/");
            return;
        }
        if (!workspace && !onSheet) {
            router.replace("/app/settings/sheet");
            return;
        }
        // No credits: send to Top up (settings stays reachable).
        const noCredits = balance?.configured === true && balance.credits <= 0;
        // The order page lives under /app/topup/order/[id]; keep the whole
        // top-up flow reachable while the user still has 0 credits.
        const onTopup = pathname.startsWith("/app/topup");
        const inSettings = pathname.startsWith("/app/settings");
        const onWaMock = pathname.startsWith("/app/wa-mock");
        if (noCredits && !onTopup && !inSettings && !onWaMock) {
            router.replace("/app/topup");
            return;
        }
        // Admins land on the admin panel from the app entry point.
        if (pathname === "/app") {
            router.replace(balance?.admin ? "/admin" : "/app/snap");
        }
    }, [authChecked, auth, workspace, balance, pathname, router, region]);

    if (!authChecked) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-page">
                <span
                    className="h-8 w-8 animate-spin rounded-full border-4 border-line border-t-brand"
                    aria-hidden
                />
            </div>
        );
    }

    const signedIn = auth?.signedIn === true;

    return (
        <div className="flex min-h-screen flex-col bg-page sm:py-8">
            {signedIn ? (
                <div className="mx-auto flex w-full max-w-[430px] items-center justify-between gap-3 px-4 pb-5 pt-4">
                    <button
                        type="button"
                        onClick={() =>
                            router.push(workspace ? "/app/snap" : "/app/settings/sheet")
                        }
                        className="font-head text-2xl font-black tracking-tight text-brand"
                        aria-label="zippp"
                    >
                        zippp
                    </button>
                    <div className="flex items-center gap-3">
                        {pathname !== "/app/snap" && workspace ? (
                            <button
                                type="button"
                                onClick={() => router.push("/app/snap")}
                                className="flex items-center gap-2 text-sm font-semibold text-muted hover:text-body"
                            >
                                <HomeIcon />
                                {t("app.nav.home")}
                            </button>
                        ) : null}
                        {balance?.configured ? (
                            <button
                                type="button"
                                onClick={() => router.push("/app/topup")}
                                aria-label={fill(t("app.credits.pillAria"), {
                                    count: balance.credits,
                                })}
                                title={
                                    balance.credits < LOW_CREDITS_WARN
                                        ? t("app.credits.low")
                                        : undefined
                                }
                                className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                                    balance.credits <= 0
                                        ? "bg-card text-danger"
                                        : balance.credits < LOW_CREDITS_WARN
                                          ? "bg-amber-100 text-amber-900"
                                          : "bg-mist text-ink"
                                }`}
                            >
                                <BoltIcon />
                                {fill(t("app.credits.pill"), {
                                    count: balance.credits,
                                })}
                            </button>
                        ) : null}
                        {!pathname.startsWith("/app/settings") ? (
                            <button
                                type="button"
                                onClick={() => router.push("/app/settings")}
                                className="flex items-center gap-2 text-sm font-semibold text-muted hover:text-body"
                            >
                                <GearIcon />
                                {t("app.settings.title")}
                            </button>
                        ) : null}
                        {balance?.admin ? (
                            <button
                                type="button"
                                onClick={() => router.push("/admin")}
                                className="rounded-full bg-brand px-3 py-1 text-xs font-semibold text-ink"
                            >
                                {t("app.settings.admin")}
                            </button>
                        ) : null}
                    </div>
                </div>
            ) : null}
            {signedIn && balance?.invite ? (
                <div className="mx-auto w-full max-w-[430px] px-4 pb-2">
                    <div className="rounded-xl bg-brand px-3 py-2 text-xs font-semibold text-ink">
                        <p>
                            {fill(t("app.invite.banner"), {
                                email: balance.invite.email,
                            })}
                        </p>
                        <p className="mt-0.5">
                            {fill(t("app.invite.price"), {
                                min: balance.invite.minTopupIdr.toLocaleString(
                                    "id-ID"
                                ),
                                normal: MIN_TOPUP_IDR.toLocaleString("id-ID"),
                            })}
                        </p>
                    </div>
                </div>
            ) : null}
            {children}
        </div>
    );
}
