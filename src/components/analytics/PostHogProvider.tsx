"use client";

import { PostHogProvider } from "@posthog/react";
import type { ReactNode } from "react";

/**
 * PostHog provider for the App Router. Renders children unchanged when the
 * project token is unset. The project token is public by design
 * (`phc_...`), so `NEXT_PUBLIC_` is correct; never put a personal key here.
 */
export default function AppPostHogProvider({
    children,
}: {
    children: ReactNode;
}) {
    const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!apiKey) return <>{children}</>;

    return (
        <PostHogProvider
            apiKey={apiKey}
            options={{
                api_host:
                    process.env.NEXT_PUBLIC_POSTHOG_HOST ||
                    "https://us.i.posthog.com",
                defaults: "2026-05-30",
                // Page views only. Autocapture would ship the text of the
                // review card (merchant, amounts) and session replay would
                // record it. Neither is worth a privacy claim we cannot keep.
                autocapture: false,
                capture_pageview: true,
                disable_session_recording: true,
            }}
        >
            {children}
        </PostHogProvider>
    );
}
