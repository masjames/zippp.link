"use client";

import GoogleIntegrations from "./GoogleIntegrations";
import GoogleSignInButton from "./GoogleSignInButton";
import HeroSnapSheet from "./HeroSnapSheet";
import ImpactProof from "./ImpactProof";
import LandingNav from "./LandingNav";
import MediaPlaceholder from "./MediaPlaceholder";
import SiteFooter from "./SiteFooter";
import TemplateGallery from "./TemplateGallery";
import type { BusinessInfo } from "@/lib/business";
import type { LandingAssets } from "@/lib/landing-assets";
import { RichText } from "@/lib/rich-text";
import { makeT, type Wording } from "@/lib/t";
import type { Lang, Region } from "@/lib/region";

/**
 * Public master landing. Pricing lives on /pricing (and /id/harga) only.
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
                <main className="overflow-hidden rounded-phone border-0 bg-card">
                    <LandingNav t={t} region={region} />

                    <section className="bg-[aliceblue] text-ink">
                        <div className="mx-auto grid max-w-[980px] items-center gap-10 px-6 py-14 sm:py-16 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
                            <div className="order-2 lg:order-1">
                                <h1 className="font-head text-[2.6rem] font-extrabold leading-[1.05] tracking-tight sm:text-[3.75rem]">
                                    <RichText text={t("landing.hero.title")} />
                                </h1>
                                <p className="mt-5 max-w-[48ch] text-lg leading-relaxed sm:text-xl">
                                    <RichText text={t("landing.hero.body")} />
                                </p>
                                <div className="mt-8">
                                    <GoogleSignInButton t={t} />
                                </div>
                            </div>
                            <div className="relative order-1 flex justify-center lg:order-2 lg:justify-end">
                                {assets.heroImage ? (
                                    <MediaPlaceholder
                                        label={t("landing.media.hero")}
                                        src={assets.heroImage}
                                        aspect="aspect-[9/16] max-w-[280px]"
                                    />
                                ) : (
                                    <HeroSnapSheet t={t} />
                                )}
                            </div>
                        </div>
                        <GoogleIntegrations t={t} />
                    </section>

                    <section
                        id="testimonials"
                        className="border-y border-line bg-surface"
                    >
                        <div className="mx-auto max-w-[980px] px-6 pb-14 pt-16 sm:pt-20">
                            <ImpactProof t={t} />
                        </div>
                    </section>

                    <section
                        id="product"
                        className="border-y border-line bg-[#e8e4e0]"
                    >
                        <div className="mx-auto max-w-[980px] px-6 py-14">
                            <h2 className="max-w-[36ch] font-head text-3xl font-extrabold tracking-tight sm:text-4xl">
                                <RichText text={t("landing.showcase.title")} />
                            </h2>
                            <div className="mt-8">
                                <TemplateGallery
                                    t={t}
                                    lang={lang}
                                    region={region}
                                />
                            </div>
                        </div>
                    </section>

                    <section className="mx-auto max-w-[980px] px-6 py-10">
                        <div className="rounded-panel bg-surface p-7 opacity-80">
                            <div className="flex flex-wrap items-baseline gap-3">
                                <h3 className="font-head text-2xl font-extrabold tracking-tight">
                                    {t("landing.referral.title")}
                                </h3>
                                <span className="text-xs font-bold uppercase tracking-wide text-brand">
                                    {t("common.comingSoon")}
                                </span>
                            </div>
                            <p className="mt-2 text-muted leading-relaxed">
                                {t("landing.referral.soonBody")}
                            </p>
                        </div>
                    </section>

                    <section
                        id="questions"
                        className="mx-auto max-w-[980px] px-6 py-14"
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
