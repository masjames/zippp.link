"use client";

import { useEffect, useRef, useState } from "react";
import SheetPreview from "./SheetPreview";
import {
    PERSONAS,
    personaHref,
    type PersonaId,
} from "@/lib/personas";
import type { Lang, Region } from "@/lib/region";
import type { T } from "@/lib/t";

const ORDER: PersonaId[] = [
    "purchasing",
    "expenses",
    "sales",
    "reimbursement",
];

const SLIDE_MS = 6500;

/**
 * Pill nav (auto slideshow) + SheetPreview with smooth horizontal table scroll.
 */
export default function TemplateGallery({
    t,
    lang,
    region,
}: {
    t: T;
    lang: Lang;
    region: Region;
}) {
    const [active, setActive] = useState<PersonaId>(
        region === "id" ? "purchasing" : "expenses"
    );
    const [paused, setPaused] = useState(false);
    const pillRefs = useRef<Record<string, HTMLButtonElement | null>>({});
    const pillsTrackRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (paused) return;
        const i = window.setInterval(() => {
            setActive((prev) => {
                const idx = ORDER.indexOf(prev);
                return ORDER[(idx + 1) % ORDER.length];
            });
        }, SLIDE_MS);
        return () => window.clearInterval(i);
    }, [paused]);

    // Horizontal-only — never scroll the page window.
    useEffect(() => {
        const el = pillRefs.current[active];
        const track = pillsTrackRef.current;
        if (!el || !track) return;
        const left =
            el.offsetLeft - track.clientWidth / 2 + el.clientWidth / 2;
        track.scrollTo({
            left: Math.max(0, left),
            behavior: "smooth",
        });
    }, [active]);

    const persona = PERSONAS.find((p) => p.id === active)!;

    return (
        <div
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocusCapture={() => setPaused(true)}
            onBlurCapture={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setPaused(false);
                }
            }}
        >
            <div
                ref={pillsTrackRef}
                className="template-pills -mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
            >
                {ORDER.map((id) => {
                    const p = PERSONAS.find((x) => x.id === id)!;
                    const selected = active === id;
                    return (
                        <button
                            key={id}
                            ref={(node) => {
                                pillRefs.current[id] = node;
                            }}
                            type="button"
                            onClick={() => setActive(id)}
                            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-500 ${
                                selected
                                    ? "bg-maroon text-white"
                                    : "bg-card text-body ring-1 ring-line hover:bg-peach/50"
                            }`}
                        >
                            {t(`landing.who.${p.whoKey}.title`)}
                        </button>
                    );
                })}
            </div>

            <div className="mt-5">
                <p className="max-w-[52ch] text-sm leading-relaxed text-muted">
                    {t(`landing.who.${persona.whoKey}.body`)}
                </p>
                <a
                    href={personaHref(active, region)}
                    className="mt-2 inline-flex text-sm font-semibold text-brand hover:underline"
                >
                    {t(`landing.who.${persona.whoKey}.template`)}
                    {" →"}
                </a>
            </div>

            <div className="mt-5">
                <SheetPreview kind={active} t={t} lang={lang} />
            </div>
        </div>
    );
}
