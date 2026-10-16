"use client";

import GoogleIntegrations from "./GoogleIntegrations";
import GoogleSignInButton from "./GoogleSignInButton";
import ImpactProof from "./ImpactProof";
import LandingNav from "./LandingNav";
import PersonaSheetHero from "./PersonaSheetHero";
import SiteFooter from "./SiteFooter";
import type { BusinessInfo } from "@/lib/business";
import {
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
    const others = personasForRegion(region).filter((p) => p.id !== persona.id);

    return (
        <div className="min-h-screen overflow-x-clip bg-page">
            <div className="mx-auto w-full max-w-[1180px] px-4 pb-16 pt-6 sm:px-5 sm:pt-8">
                <main className="min-w-0 overflow-x-clip rounded-phone border-0 bg-card">
                    <LandingNav t={t} region={region} />

                    <section className="bg-[aliceblue] text-ink">
                        <div className="mx-auto grid w-full max-w-[980px] items-center gap-8 px-4 py-12 sm:gap-10 sm:px-6 sm:py-16 lg:grid-cols-[1.1fr_0.9fr]">
                            <div className="order-2 min-w-0 lg:order-1">
                                <p className="text-sm font-semibold uppercase tracking-wide opacity-80">
                                    {t(`landing.who.${key}.template`)}
                                </p>
                                <h1 className="mt-3 break-words font-head text-[2rem] font-extrabold leading-[1.1] tracking-tight sm:text-[3.4rem]">
                                    <RichText
                                        text={t(`landing.persona.${key}.title1`)}
                                    />
                                </h1>
                                <p className="mt-5 max-w-[48ch] text-base leading-relaxed sm:text-xl">
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
                            <div className="relative order-1 flex w-full min-w-0 justify-center lg:order-2 lg:justify-end">
                                <PersonaSheetHero
                                    kind={persona.id}
                                    t={t}
                                    lang={lang}
                                />
                            </div>
                        </div>
                        <GoogleIntegrations t={t} />
                    </section>

                    <section
                        id="testimonials"
                        className="mx-auto w-full min-w-0 max-w-[980px] px-4 pb-14 pt-16 sm:px-6 sm:pt-20"
                    >
                        <ImpactProof t={t} />
                    </section>

                    <section className="mx-auto w-full min-w-0 max-w-[980px] px-4 py-14 sm:px-6">
                        <h2 className="break-words font-head text-2xl font-extrabold tracking-tight sm:text-3xl">
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
                </main>

                <SiteFooter
                    t={t}
                    lang={lang}
                    business={business}
                    region={region}
                />
            </div>
        </div>
    );
}
