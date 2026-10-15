"use client";

import AppFlowPreview from "./AppFlowPreview";
import GoogleIntegrations from "./GoogleIntegrations";
import GoogleSignInButton from "./GoogleSignInButton";
import ImpactProof from "./ImpactProof";
import PersonaSheetHero from "./PersonaSheetHero";
import SiteFooter from "./SiteFooter";
import RegionSelect from "../RegionSelect";
import type { BusinessInfo } from "@/lib/business";
import {
    masterHref,
    type PersonaDef,
    personasForRegion,
    personaHref,
} from "@/lib/personas";
import { RichText } from "@/lib/rich-text";
import { makeT, type Wording } from "@/lib/t";
import type { Lang, Region } from "@/lib/region";

/**
 * Use-case landing for one persona. Soft-launch pages show a note; CTA still
 * signs in so the route is shareable before the full month-tab flywheel ships.
 */
export default function PersonaLanding({
    persona,
    wording,
    lang,
    region,
    business,
}: {
    persona: PersonaDef;
    wording: Wording;
    lang: Lang;
    region: Region;
    business: BusinessInfo;
}) {
    const t = makeT(wording, lang);
    const key = persona.whoKey;
    const home = masterHref(region);
    const others = personasForRegion(region).filter((p) => p.id !== persona.id);

    return (
        <div className="min-h-screen bg-page">
            <div className="mx-auto max-w-[1180px] px-5 pb-16 pt-8">
                <main className="overflow-hidden rounded-phone border-2 border-line bg-card">
                    <nav className="mx-auto flex max-w-[980px] flex-wrap items-center justify-between gap-3 px-6 py-5">
                        <a
                            href={home}
                            className="font-head text-3xl font-black leading-none tracking-tight text-brand"
                        >
                            zippp
                        </a>
                        <div className="flex items-center gap-4">
                            <a
                                href={home}
                                className="hidden text-sm font-semibold text-body hover:text-brand sm:inline"
                            >
                                {t("landing.persona.back")}
                            </a>
                            <RegionSelect
                                region={region}
                                labels={{
                                    label: t("region.label"),
                                    worldwide: t("region.worldwide"),
                                    indonesia: t("region.indonesia"),
                                }}
                            />
                        </div>
                    </nav>

                    <section className="bg-brand text-ink">
                        <div className="mx-auto grid max-w-[980px] items-center gap-10 px-6 py-14 sm:py-16 lg:grid-cols-[1.1fr_0.9fr]">
                            <div>
                                <p className="text-sm font-semibold uppercase tracking-wide opacity-80">
                                    {t(`landing.who.${key}.template`)}
                                </p>
                                <h1 className="mt-3 font-head text-[2.2rem] font-extrabold leading-[1.08] tracking-tight sm:text-[3.4rem]">
                                    <RichText
                                        text={t(`landing.persona.${key}.title1`)}
                                    />
                                </h1>
                                <p className="mt-5 max-w-[48ch] text-lg leading-relaxed sm:text-xl">
                                    <RichText
                                        text={t(`landing.persona.${key}.body`)}
                                    />
                                </p>
                                {persona.softLaunch ? (
                                    <p className="mt-4 max-w-[48ch] rounded-panel bg-peach/80 px-4 py-3 text-sm font-semibold">
                                        {t("landing.persona.softNote")}
                                    </p>
                                ) : null}
                                <div className="mt-8">
                                    <GoogleSignInButton t={t} />
                                </div>
                            </div>
                            <div className="relative flex justify-center lg:justify-end">
                                <PersonaSheetHero
                                    kind={persona.id}
                                    t={t}
                                    lang={lang}
                                />
                            </div>
                        </div>
                        <GoogleIntegrations t={t} />
                    </section>

                    <section id="how" className="mx-auto max-w-[980px] px-6 py-14">
                        <h2 className="font-head text-3xl font-extrabold tracking-tight sm:text-4xl">
                            <RichText text={t("landing.how.title")} />
                        </h2>
                        <div className="mt-8">
                            <AppFlowPreview t={t} />
                        </div>
                    </section>

                    <section className="mx-auto max-w-[980px] px-6 pb-14">
                        <ImpactProof t={t} />
                    </section>

                    <section className="mx-auto max-w-[980px] px-6 pb-14">
                        <h2 className="font-head text-2xl font-extrabold tracking-tight sm:text-3xl">
                            {t("landing.persona.otherTitle")}
                        </h2>
                        <div className="mt-6 grid gap-4 sm:grid-cols-3">
                            {others.map((p) => (
                                <a
                                    key={p.id}
                                    href={personaHref(p.id, region)}
                                    className="rounded-panel bg-surface p-5 transition hover:bg-peach/40"
                                >
                                    <h3 className="font-head text-xl font-extrabold tracking-tight">
                                        {t(`landing.who.${p.whoKey}.title`)}
                                    </h3>
                                    <p className="mt-2 text-sm text-muted">
                                        {t(`landing.who.${p.whoKey}.body`)}
                                    </p>
                                </a>
                            ))}
                        </div>
                    </section>

                    <footer className="bg-maroon px-6 py-14 text-center text-white">
                        <h2 className="mx-auto max-w-[980px] font-head text-3xl font-extrabold tracking-tight sm:text-4xl">
                            <RichText
                                text={t(`landing.persona.${key}.foot`)}
                            />
                        </h2>
                        <a
                            href="/api/auth/login"
                            className="mt-6 inline-flex items-center rounded-full bg-brand px-7 py-4 font-semibold text-ink"
                        >
                            {t("landing.foot.cta")}
                        </a>
                    </footer>
                    <SiteFooter
                        t={t}
                        lang={lang}
                        business={business}
                        region={region}
                    />
                </main>
            </div>
        </div>
    );
}
