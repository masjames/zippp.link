"use client";

import { COOKIE_MAX_AGE, LANG_COOKIE, type Lang } from "@/lib/region";

/** EN / ID switch shared by the landing page and the app. */
export default function LangToggle({
    lang,
    onChange,
    tone = "light",
}: {
    lang: Lang;
    onChange: (lang: Lang) => void;
    tone?: "light" | "dark";
}) {
    function pick(next: Lang) {
        onChange(next);
        document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
    }

    return (
        <div className="flex gap-1" role="group" aria-label="Language">
            {(["en", "id"] as const).map((value) => (
                <button
                    key={value}
                    type="button"
                    onClick={() => pick(value)}
                    aria-pressed={lang === value}
                    className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${
                        lang === value
                            ? tone === "dark"
                                ? "bg-ink text-peach"
                                : "bg-btn text-btntext"
                            : "text-muted hover:bg-surface"
                    }`}
                >
                    {value}
                </button>
            ))}
        </div>
    );
}
