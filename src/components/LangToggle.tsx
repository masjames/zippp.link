"use client";

import { useRouter } from "next/navigation";
import { COOKIE_MAX_AGE, LANG_COOKIE, type Lang } from "@/lib/region";

/**
 * EN / ID switch shared by the landing, the footer, and the app.
 *
 * The choice is language only; pricing stays with the detected region. It is
 * persisted in `LANG_COOKIE`. With `onChange` the caller owns the new state
 * (the app); without it the toggle refreshes the server tree (landing, legal
 * pages) so the new language is rendered.
 */
export default function LangToggle({
    lang,
    onChange,
    label,
    tone = "light",
}: {
    lang: Lang;
    onChange?: (lang: Lang) => void;
    /** Accessible group name, from wording. */
    label: string;
    tone?: "light" | "dark";
}) {
    const router = useRouter();

    function pick(next: Lang) {
        if (next === lang) return;
        document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
        if (onChange) onChange(next);
        else router.refresh();
    }

    return (
        <div className="flex gap-1" role="group" aria-label={label}>
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
