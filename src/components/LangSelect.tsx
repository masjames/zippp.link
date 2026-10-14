"use client";

import { useRouter } from "next/navigation";
import { COOKIE_MAX_AGE, LANG_COOKIE, type Lang } from "@/lib/region";

/**
 * App language switch. This changes copy only; the region and its currency do
 * not move. Persisted in `LANG_COOKIE`; the app layout reads it and re-renders.
 */
export default function LangSelect({
    lang,
    labels,
}: {
    lang: Lang;
    labels: { label: string; english: string; indonesia: string };
}) {
    const router = useRouter();

    function pick(next: Lang) {
        if (next === lang) return;
        document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
        router.refresh();
    }

    return (
        <div className="flex gap-1" role="group" aria-label={labels.label}>
            {(["en", "id"] as const).map((value) => (
                <button
                    key={value}
                    type="button"
                    onClick={() => pick(value)}
                    aria-pressed={lang === value}
                    className={`flex-1 rounded-full px-3 py-1.5 text-xs font-semibold ${
                        lang === value
                            ? "bg-btn text-btntext"
                            : "border-2 border-line text-muted hover:bg-surface"
                    }`}
                >
                    {value === "en" ? labels.english : labels.indonesia}
                </button>
            ))}
        </div>
    );
}
