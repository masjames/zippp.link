"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import posthog from "posthog-js";

/**
 * PostHog page views. Inert when NEXT_PUBLIC_POSTHOG_KEY is unset. The project
 * API key is public by design, so it belongs in NEXT_PUBLIC_*; never put a
 * personal API key here.
 */
let initialized = false;

export default function PostHogAnalytics() {
    const pathname = usePathname();

    useEffect(() => {
        const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
        if (!key || initialized) return;
        posthog.init(key, {
            api_host:
                process.env.NEXT_PUBLIC_POSTHOG_HOST ||
                "https://us.i.posthog.com",
            capture_pageview: false,
            person_profiles: "identified_only",
        });
        initialized = true;
    }, []);

    useEffect(() => {
        if (!initialized) return;
        posthog.capture("$pageview");
    }, [pathname]);

    return null;
}
