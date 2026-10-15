"use client";

import { useEffect, useRef, useState } from "react";
import RegionSelect from "../RegionSelect";
import { COMPETITORS, competitorHref } from "@/lib/competitors";
import { PERSONAS, personaHref } from "@/lib/personas";
import type { Region } from "@/lib/region";
import type { T } from "@/lib/t";

/**
 * Master landing nav: Use cases + Compare dropdowns, Proof anchor.
 * Pricing lives only on the pricing page; How it works is not linked.
 */
export default function LandingNav({
    t,
    region,
}: {
    t: T;
    region: Region;
}) {
    return (
        <nav className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-line bg-card/95 px-6 py-4 backdrop-blur">
            <a
                href={region === "id" ? "/id" : "/"}
                className="font-head text-3xl font-black leading-none tracking-tight text-brand"
            >
                zippp
            </a>
            <div className="hidden items-center gap-1 md:flex">
                <NavDropdown label={t("nav.useCases")}>
                    {PERSONAS.map((p) => (
                        <a
                            key={p.id}
                            href={personaHref(p.id, region)}
                            className="block px-3 py-2 text-sm font-semibold text-body hover:bg-surface"
                        >
                            {t(`landing.who.${p.whoKey}.title`)}
                        </a>
                    ))}
                </NavDropdown>
                <NavDropdown label={t("nav.compare")}>
                    {COMPETITORS.map((c) => (
                        <a
                            key={c.id}
                            href={competitorHref(c.id, region)}
                            className="block px-3 py-2 text-sm font-semibold text-body hover:bg-surface"
                        >
                            zippp vs {c.shortName}
                        </a>
                    ))}
                </NavDropdown>
                <a
                    href="#proof"
                    className="rounded-lg px-3 py-2 font-semibold text-body hover:text-brand"
                >
                    {t("nav.proof")}
                </a>
            </div>
            <div className="flex items-center gap-3">
                <RegionSelect
                    region={region}
                    labels={{
                        label: t("region.label"),
                        worldwide: t("region.worldwide"),
                        indonesia: t("region.indonesia"),
                    }}
                />
                <a
                    href="/api/auth/login"
                    className="inline-flex items-center rounded-full bg-btn px-5 py-2.5 text-sm font-semibold text-btntext"
                >
                    {t("nav.signin")}
                </a>
            </div>
        </nav>
    );
}

function NavDropdown({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function onPointerDown(event: MouseEvent) {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", onPointerDown);
        return () => document.removeEventListener("mousedown", onPointerDown);
    }, []);

    return (
        <div className="relative" ref={ref}>
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={open}
                className="flex items-center gap-1 rounded-lg px-3 py-2 font-semibold text-body hover:text-brand"
            >
                {label}
                <Chevron open={open} />
            </button>
            {open ? (
                <div
                    role="menu"
                    className="absolute left-0 top-full z-30 mt-1 min-w-[220px] rounded-xl border-2 border-line bg-card py-1 shadow-lg"
                >
                    {children}
                </div>
            ) : null}
        </div>
    );
}

function Chevron({ open }: { open: boolean }) {
    return (
        <svg
            viewBox="0 0 24 24"
            className={`h-3.5 w-3.5 transition ${open ? "rotate-180" : ""}`}
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
