"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
    COOKIE_MAX_AGE,
    LANG_COOKIE,
    REGION_COOKIE,
    type Region,
} from "@/lib/region";

/** Globe for the international option. */
function GlobeIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            className="h-4 w-4 flex-none"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
        >
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" />
        </svg>
    );
}

/** Indonesia flag for the local option. */
function FlagIdIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            className="h-4 w-4 flex-none rounded-[1.5px]"
            aria-hidden
        >
            <rect width="24" height="12" fill="#CE1126" />
            <rect y="12" width="24" height="12" fill="#FFFFFF" />
            <rect
                width="24"
                height="24"
                fill="none"
                stroke="rgba(0,0,0,0.15)"
                strokeWidth="1"
            />
        </svg>
    );
}

function ChevronIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            className="h-3.5 w-3.5 flex-none"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
        >
            <path d="M6 9l6 6 6-6" />
        </svg>
    );
}

/**
 * Region chooser for the public pages. Picking Indonesia moves to `/id` with
 * IDR and Indonesian; picking Worldwide stays on `/` with USD and English.
 * Both cookies are written so the choice sticks.
 */
export default function RegionSelect({
    region,
    labels,
    tone = "light",
}: {
    region: Region;
    labels: { label: string; worldwide: string; indonesia: string };
    tone?: "light" | "dark";
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const router = useRouter();

    useEffect(() => {
        function onPointerDown(event: MouseEvent) {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", onPointerDown);
        return () => document.removeEventListener("mousedown", onPointerDown);
    }, []);

    function pick(next: Region) {
        setOpen(false);
        if (next === region) return;
        const lang = next === "id" ? "id" : "en";
        document.cookie = `${REGION_COOKIE}=${next}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
        document.cookie = `${LANG_COOKIE}=${lang}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
        router.push(next === "id" ? "/id" : "/");
        router.refresh();
    }

    const current = region === "id" ? "indonesia" : "worldwide";
    const options: { value: Region; key: "worldwide" | "indonesia" }[] = [
        { value: "intl", key: "worldwide" },
        { value: "id", key: "indonesia" },
    ];

    return (
        <div className="relative" ref={ref}>
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-label={labels.label}
                className={`flex items-center gap-2 rounded-full border-2 px-3 py-1.5 text-xs font-semibold ${
                    tone === "dark"
                        ? "border-white/30 bg-white/10 text-white hover:bg-white/20"
                        : "border-line bg-card text-body hover:bg-surface"
                }`}
            >
                {region === "id" ? <FlagIdIcon /> : <GlobeIcon />}
                <span>{labels[current]}</span>
                <ChevronIcon />
            </button>

            {open ? (
                <ul
                    role="listbox"
                    aria-label={labels.label}
                    className="absolute right-0 z-30 mt-2 w-48 overflow-hidden rounded-2xl border-2 border-line bg-card py-1 text-left shadow-xl"
                >
                    {options.map((option) => {
                        const selected = option.value === region;
                        return (
                            <li key={option.value} role="option" aria-selected={selected}>
                                <button
                                    type="button"
                                    onClick={() => pick(option.value)}
                                    className={`flex w-full items-center gap-3 px-3 py-2 text-sm ${
                                        selected
                                            ? "bg-surface font-semibold text-body"
                                            : "text-body hover:bg-surface"
                                    }`}
                                >
                                    {option.value === "id" ? (
                                        <FlagIdIcon />
                                    ) : (
                                        <GlobeIcon />
                                    )}
                                    <span>{labels[option.key]}</span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            ) : null}
        </div>
    );
}
