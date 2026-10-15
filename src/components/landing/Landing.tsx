"use client";

import AppFlowPreview from "./AppFlowPreview";
import DoodleArrow from "./DoodleArrow";
import GoogleIntegrations from "./GoogleIntegrations";
import HeroPhone from "./HeroPhone";
import ImpactProof from "./ImpactProof";
import MediaPlaceholder from "./MediaPlaceholder";
import SheetPreview from "./SheetPreview";
import SiteFooter from "./SiteFooter";
import RegionSelect from "../RegionSelect";
import type { BusinessInfo } from "@/lib/business";
import type { LandingAssets } from "@/lib/landing-assets";
import { legalHref } from "@/lib/legal";
import { personasForRegion, personaHref } from "@/lib/personas";
import { RichText } from "@/lib/rich-text";
import { makeT, type Wording } from "@/lib/t";
import type { Lang, Region } from "@/lib/region";

/**
 * Public master landing. Region follows the route (`/` USD, `/id` IDR).
 * Hero and product sections always show UI mocks when media files are missing.
 */
export default function Landing({
    wording,
    lang,
    region,
    business,
    assets,
}: {
    wording: Wording;
    lang: Lang;
    region: Region;
    business: BusinessInfo;
    assets: LandingAssets;
}) {
    const t = makeT(wording, lang);

    return (
        <div className="min-h-screen bg-page">
            <div className="mx-auto max-w-[1180px] px-5 pb-16 pt-8">
                <main className="overflow-hidden rounded-phone border-2 border-line bg-card">
                    <nav className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-line bg-card/95 px-6 py-4 backdrop-blur">
                        <span className="font-head text-3xl font-black leading-none tracking-tight text-brand">
                            zippp
                        </span>
                        <div className="hidden items-center gap-5 font-semibold md:flex">
                            <a href="#how" className="text-body hover:text-brand">
                                {t("nav.how")}
                            </a>
                            <a href="#who" className="text-body hover:text-brand">
                                {t("nav.useCases")}
                            </a>
                            <a href="#proof" className="text-body hover:text-brand">
                                {t("nav.proof")}
                            </a>
                            <a href="#pricing" className="text-body hover:text-brand">
                                {t("nav.pricing")}
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

                    <section className="bg-brand text-ink">
                        <div className="mx-auto grid max-w-[980px] items-center gap-10 px-6 py-14 sm:py-16 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
                            <div>
                                <h1 className="font-head text-[2.6rem] font-extrabold leading-[1.05] tracking-tight sm:text-[3.75rem]">
                                    <RichText text={t("landing.hero.title")} />
                                </h1>
                                <p className="mt-5 max-w-[42ch] text-lg leading-relaxed sm:text-xl">
                                    <RichText text={t("landing.hero.body")} />
                                </p>
                                <div className="mt-8 flex flex-wrap gap-3">
                                    <a
                                        href="/api/auth/login"
                                        className="inline-flex items-center rounded-full bg-maroon px-7 py-4 font-semibold text-white"
                                    >
                                        {t("landing.hero.cta")}
                                    </a>
                                    <a
                                        href="#how"
                                        className="inline-flex items-center rounded-full bg-peach px-7 py-4 font-semibold text-ink"
                                    >
                                        {t("landing.hero.cta2")}
                                    </a>
                                </div>
                                <div className="mt-7">
                                    <GoogleIntegrations t={t} />
                                </div>
                            </div>
                            <div className="relative flex justify-center lg:justify-end">
                                <DoodleArrow
                                    variant="curve-left"
                                    label={t("landing.doodle.try")}
                                    className="absolute -left-2 top-0 z-10 hidden sm:flex lg:-left-6"
                                    width={88}
                                    height={64}
                                />
                                {assets.heroImage ? (
                                    <MediaPlaceholder
                                        label={t("landing.media.hero")}
                                        src={assets.heroImage}
                                        aspect="aspect-[9/16] max-w-[280px]"
                                    />
                                ) : (
                                    <HeroPhone t={t} />
                                )}
                            </div>
                        </div>
                    </section>

                    <section id="how" className="mx-auto max-w-[980px] px-6 py-14">
                        <div className="relative inline-block">
                            <h2 className="font-head text-3xl font-extrabold tracking-tight sm:text-4xl">
                                <RichText text={t("landing.how.title")} />
                            </h2>
                            <DoodleArrow
                                variant="scribble-under"
                                className="absolute -bottom-6 left-0"
                                width={140}
                                height={36}
                                color="var(--c-orange)"
                            />
                        </div>
                        <p className="mt-8 max-w-[52ch] text-muted leading-relaxed">
                            {t("landing.how.lead")}
                        </p>
                        <div className="mt-8">
                            <AppFlowPreview t={t} />
                        </div>
                    </section>

                    <section
                        id="product"
                        className="border-y border-line bg-surface"
                    >
                        <div className="mx-auto max-w-[980px] px-6 py-14">
                            <div className="relative max-w-[36ch]">
                                <h2 className="font-head text-3xl font-extrabold tracking-tight sm:text-4xl">
                                    {t("landing.showcase.title")}
                                </h2>
                                <DoodleArrow
                                    variant="zigzag"
                                    className="absolute -right-16 top-0 hidden md:flex"
                                    width={72}
                                    height={56}
                                    color="var(--c-orange)"
                                />
                            </div>
                            <p className="mt-4 max-w-[56ch] text-muted leading-relaxed">
                                {t("landing.showcase.body")}
                            </p>
                            <div className="mt-8 grid gap-6 lg:grid-cols-2 lg:items-start">
                                {assets.sheetImage ? (
                                    <MediaPlaceholder
                                        label={t("landing.media.sheet")}
                                        note={t("landing.media.note")}
                                        src={assets.sheetImage}
                                    />
                                ) : (
                                    <SheetPreview
                                        kind="master"
                                        t={t}
                                        lang={lang}
                                    />
                                )}
                                {assets.demoVideo ? (
                                    <MediaPlaceholder
                                        label={t("landing.media.video")}
                                        src={assets.demoVideo}
                                        video
                                    />
                                ) : (
                                    <div className="rounded-panel border-2 border-line bg-card p-5">
                                        <p className="mb-4 text-sm font-semibold text-body">
                                            {t("landing.media.flowTitle")}
                                        </p>
                                        <AppFlowPreview t={t} />
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>

                    <section
                        id="who"
                        className="mx-auto max-w-[980px] px-6 py-14"
                    >
                        <h2 className="font-head text-3xl font-extrabold tracking-tight sm:text-4xl">
                            {t("landing.who.title")}
                        </h2>
                        <p className="mt-4 max-w-[56ch] text-muted leading-relaxed">
                            {t("landing.audience.body")}
                        </p>
                        <div className="mt-7 grid gap-4 sm:grid-cols-2">
                            {personasForRegion(region).map((persona) => (
                                <a
                                    key={persona.id}
                                    href={personaHref(persona.id, region)}
                                    className="flex flex-col rounded-panel border-2 border-line bg-card p-6 transition hover:border-brand"
                                >
                                    <h3 className="font-head text-2xl font-extrabold tracking-tight">
                                        {t(`landing.who.${persona.whoKey}.title`)}
                                    </h3>
                                    <p className="mt-2 flex-1 text-muted leading-relaxed">
                                        {t(`landing.who.${persona.whoKey}.body`)}
                                    </p>
                                    <span className="mt-4 self-start text-sm font-semibold text-brand">
                                        {t(`landing.who.${persona.whoKey}.template`)}
                                        {" →"}
                                    </span>
                                </a>
                            ))}
                        </div>
                    </section>

                    <section
                        id="proof"
                        className="border-y border-line bg-surface"
                    >
                        <div className="mx-auto max-w-[980px] px-6 py-14">
                            <ImpactProof t={t} />
                        </div>
                    </section>

                    <section
                        id="pricing"
                        className="mx-auto max-w-[980px] px-6 py-14"
                    >
                        <h2 className="font-head text-3xl font-extrabold tracking-tight sm:text-4xl">
                            {t("landing.pricing.title")}
                        </h2>
                        <p className="mt-4 max-w-[48ch] text-muted leading-relaxed">
                            <RichText text={t("landing.pricing.body")} />
                        </p>
                        <div className="mt-6 flex flex-wrap gap-3">
                            <a
                                href="/api/auth/login"
                                className="inline-flex items-center rounded-full bg-maroon px-7 py-4 font-semibold text-white"
                            >
                                {t("landing.pricing.cta")}
                            </a>
                            <a
                                href={legalHref("pricing", lang)}
                                className="inline-flex items-center rounded-full bg-peach px-7 py-4 font-semibold text-ink"
                            >
                                {t("landing.pricing.details")}
                            </a>
                        </div>

                        <div className="mt-8 max-w-[980px] rounded-panel bg-surface p-7">
                            <h3 className="font-head text-2xl font-extrabold tracking-tight">
                                {t("landing.referral.title")}
                            </h3>
                            <p className="mt-2 text-muted leading-relaxed">
                                {t("landing.referral.body")}
                            </p>
                        </div>
                    </section>

                    <section
                        id="questions"
                        className="mx-auto max-w-[980px] px-6 pb-14"
                    >
                        <h2 className="font-head text-3xl font-extrabold tracking-tight sm:text-4xl">
                            {t("landing.faq.title")}
                        </h2>
                        <div className="mt-6">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <details
                                    key={i}
                                    className="border-t border-line py-4"
                                >
                                    <summary className="cursor-pointer font-semibold">
                                        {t(`landing.faq.q${i}`)}
                                    </summary>
                                    <p className="mt-2 max-w-[60ch] text-muted leading-relaxed">
                                        {t(`landing.faq.a${i}`)}
                                    </p>
                                </details>
                            ))}
                        </div>
                    </section>

                    <footer className="bg-maroon px-6 py-14 text-center text-white">
                        <h2 className="mx-auto max-w-[40ch] font-head text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
                            <RichText text={t("landing.foot.title")} />
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
