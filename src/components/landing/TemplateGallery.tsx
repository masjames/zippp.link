"use client";

import { useState } from "react";
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

/**
 * All product sheet templates — tabbed SheetPreview mocks.
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

    return (
        <div>
            <div className="flex flex-wrap gap-2">
                {ORDER.map((id) => {
                    const persona = PERSONAS.find((p) => p.id === id)!;
                    const selected = active === id;
                    return (
                        <button
                            key={id}
                            type="button"
                            onClick={() => setActive(id)}
                            className={`rounded-full border-2 px-4 py-2 text-sm font-semibold transition ${
                                selected
                                    ? "border-maroon bg-maroon text-white"
                                    : "border-line bg-card text-body hover:border-brand"
                            }`}
                        >
                            {t(`landing.who.${persona.whoKey}.template`)}
                        </button>
                    );
                })}
            </div>

            <div className="mt-5">
                <SheetPreview kind={active} t={t} lang={lang} />
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {ORDER.map((id) => {
                    const persona = PERSONAS.find((p) => p.id === id)!;
                    return (
                        <a
                            key={id}
                            href={personaHref(id, region)}
                            className="rounded-panel border-2 border-line bg-card px-4 py-3 transition hover:border-brand"
                        >
                            <p className="font-head text-lg font-extrabold tracking-tight">
                                {t(`landing.who.${persona.whoKey}.title`)}
                            </p>
                            <p className="mt-1 text-sm text-muted leading-relaxed">
                                {t(`landing.who.${persona.whoKey}.template`)}
                                {" →"}
                            </p>
                        </a>
                    );
                })}
            </div>
        </div>
    );
}
