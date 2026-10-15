"use client";

import AppFlowPreview from "./AppFlowPreview";
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
                <main className="overflow-hidden rounded-phone border-2 border-line bg-card">
                    <LandingNav t={t} region={region} />

                    <section className="bg-brand text-ink">
                        <div className="mx-auto grid max-w-[980px] items-center gap-10 px-6 py-14 sm:py-16 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
                            <div>
                                <h1 className="font-head text-[2.6rem] font-extrabold leading-[1.05] tracking-tight sm:text-[3.75rem]">
                                    <RichText text={t("landing.hero.title")} />
                                </h1>
                                <p className="mt-5 max-w-[48ch] text-lg leading-relaxed sm:text-xl">
                                    <RichText text={t("landing.hero.body")} />
                                </p>
                                <div className="mt-8">
                                    <GoogleSignInButton t={t} />
                                </div>
                                <div className="mt-7">
                                    <GoogleIntegrations t={t} />
                                </div>
                            </div>
                            <div className="relative flex justify-center lg:justify-end">
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
                    </section>

                    <section id="how" className="mx-auto max-w-[980px] px-6 py-14">
                        <h2 className="font-head text-3xl font-extrabold tracking-tight sm:text-4xl">
                            <RichText text={t("landing.how.title")} />
                        </h2>
                        <p className="mt-4 max-w-[52ch] text-muted leading-relaxed">
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
                            <h2 className="max-w-[36ch] font-head text-3xl font-extrabold tracking-tight sm:text-4xl">
                                <RichText text={t("landing.showcase.title")} />
                            </h2>
                            <p className="mt-4 max-w-[56ch] text-muted leading-relaxed">
                                {t("landing.showcase.body")}
                            </p>
                            <div className="mt-8">
                                <TemplateGallery
                                    t={t}
                                    lang={lang}
                                    region={region}
                                />
                            </div>
                        </div>
                    </section>

                    <section
                        id="testimonials"
                        className="border-y border-line bg-surface"
                    >
                        <div className="mx-auto max-w-[980px] px-6 py-14">
                            <ImpactProof t={t} />
                        </div>
                    </section>

                    <section className="mx-auto max-w-[980px] px-6 py-10">
                        <div className="rounded-panel bg-surface p-7">
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
