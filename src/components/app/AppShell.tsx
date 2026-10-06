"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import LangToggle from "@/components/LangToggle";
import { fill } from "@/lib/t";
import { useApp } from "./AppProvider";

/**
 * Guard + chrome for the /app routes.
 *
 * Guard order (stop at first failure): loading -> no session -> /app/start;
 * no sheet -> /app/settings/sheet; (credits: stub until Task 4); ready ->
 * /app/snap. Bare /app also lands on /app/snap.
 */
export default function AppShell({ children }: { children: ReactNode }) {
    const { t, lang, setLang, auth, authChecked, workspace, balance, queue, signOut } =
        useApp();
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        if (!authChecked) return;
        const onStart = pathname === "/app/start";
        const onSheet = pathname === "/app/settings/sheet";

        if (!auth?.signedIn) {
            if (!onStart) router.replace("/app/start");
            return;
        }
        if (onStart) {
            router.replace("/app/snap");
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
        if (pathname === "/app") router.replace("/app/snap");
    }, [authChecked, auth, workspace, balance, pathname, router]);

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
    const onSnap = pathname === "/app/snap";
    const showBack = signedIn && !onSnap && pathname !== "/app/start";
    const ready = queue.filter((item) => item.status === "ready");

    return (
        <div className="flex min-h-screen flex-col bg-page sm:py-8">
            {signedIn ? (
                <div className="mx-auto flex w-full max-w-[430px] items-center justify-between gap-3 px-4 pb-2">
                    <div className="flex items-center gap-3">
                        {showBack ? (
                            <button
                                type="button"
                                onClick={() => router.push("/app/snap")}
                                className="text-xs font-semibold text-muted hover:text-body"
                            >
                                &larr; {t("app.nav.back")}
                            </button>
                        ) : (
                            <LangToggle lang={lang} onChange={setLang} />
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        {ready.length > 0 ? (
                            <button
                                type="button"
                                onClick={() =>
                                    router.push(`/app/check/${ready[0].id}`)
                                }
                                className="rounded-full bg-brand px-3 py-1 text-xs font-semibold text-ink"
                            >
                                {fill(t("app.queue.reviewNext"), {
                                    count: ready.length,
                                })}
                            </button>
                        ) : null}
                        <button
                            type="button"
                            onClick={() => void signOut()}
                            className="text-xs font-semibold text-muted hover:text-body"
                        >
                            {t("app.auth.signout")}
                        </button>
                    </div>
                </div>
            ) : null}
            {children}
        </div>
    );
}
