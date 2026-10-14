"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LOW_CREDITS_WARN } from "@/lib/billing/config";
import { fill } from "@/lib/t";
import LangToggle from "../LangToggle";
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
    const { t, auth, authChecked, workspace, balance, lang, setLang, region } =
        useApp();
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
        const onTopup = pathname === "/app/topup";
        const inSettings = pathname.startsWith("/app/settings");
        if (noCredits && !onTopup && !inSettings) {
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
                <div className="mx-auto flex w-full max-w-[430px] items-center justify-between gap-3 px-4 pb-1 pt-3">
                    <LangToggle
                        lang={lang}
                        onChange={setLang}
                        label={t("lang.label")}
                    />
                    <div className="flex items-center gap-3">
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
                            {fill(t("app.credits.pill"), { count: balance.credits })}
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
            {children}
        </div>
    );
}
