"use client";

import { useState } from "react";
import {
    ClipboardList,
    Receipt,
    ShoppingBasket,
    WalletCards,
    type LucideIcon,
} from "lucide-react";
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

const ICONS: Record<PersonaId, LucideIcon> = {
    purchasing: ShoppingBasket,
    expenses: WalletCards,
    sales: Receipt,
    reimbursement: ClipboardList,
};

/**
 * All product sheet templates — icon cards + live SheetPreview.
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
            <div className="grid gap-3 sm:grid-cols-2">
                {ORDER.map((id) => {
                    const persona = PERSONAS.find((p) => p.id === id)!;
                    const selected = active === id;
                    const Icon = ICONS[id];
                    return (
                        <div
                            key={id}
                            className={`rounded-panel border-2 p-5 transition ${
                                selected
                                    ? "border-maroon bg-card shadow-sm"
                                    : "border-line bg-card hover:border-brand"
                            }`}
                        >
                            <button
                                type="button"
                                onClick={() => setActive(id)}
                                className="flex w-full items-start gap-4 text-left"
                            >
                                <span
                                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                                        selected
                                            ? "bg-maroon text-white"
                                            : "bg-peach text-maroon"
                                    }`}
                                >
                                    <Icon
                                        className="h-6 w-6"
                                        strokeWidth={2.25}
                                    />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block font-head text-lg font-extrabold tracking-tight">
                                        {t(
                                            `landing.who.${persona.whoKey}.title`
                                        )}
                                    </span>
                                    <span className="mt-1 block text-sm text-muted leading-relaxed">
                                        {t(
                                            `landing.who.${persona.whoKey}.body`
                                        )}
                                    </span>
                                </span>
                            </button>
                            <a
                                href={personaHref(id, region)}
                                className="mt-3 ml-16 inline-flex text-sm font-semibold text-brand hover:underline"
                            >
                                {t(`landing.who.${persona.whoKey}.template`)}
                                {" →"}
                            </a>
                        </div>
                    );
                })}
            </div>

            <div className="mt-6">
                <SheetPreview kind={active} t={t} lang={lang} />
            </div>
        </div>
    );
}
