"use client";

import { makeT, type Wording } from "@/lib/t";
import type { Lang, Region } from "@/lib/region";

/**
 * Landing page. Language and currency follow the entry route: `/` is English
 * with USD, `/id` is Indonesian with IDR. There is no toggle.
 */
export default function Landing({
    wording,
    lang,
    region,
}: {
    wording: Wording;
    lang: Lang;
    region: Region;
}) {
    const t = makeT(wording, lang);
    const otherHref = lang === "id" ? "/" : "/id";

    return (
        <div className="min-h-screen bg-page">
            <div className="mx-auto max-w-[1180px] px-5 pb-16 pt-8">
                <main className="overflow-hidden rounded-phone border-2 border-line bg-card">
                    <nav className="mx-auto flex max-w-[980px] flex-wrap items-center justify-between gap-3 px-6 py-5">
                        <span className="font-head text-3xl font-black leading-none tracking-tight text-brand">
                            zippp
                        </span>
                        <div className="hidden items-center gap-6 font-semibold sm:flex">
                            <a href="#how" className="text-body hover:text-brand">
                                {t("nav.how")}
                            </a>
                            <a href="#pricing" className="text-body hover:text-brand">
                                {t("nav.pricing")}
                            </a>
                            <a
                                href="#questions"
                                className="text-body hover:text-brand"
                            >
                                {t("nav.questions")}
                            </a>
                        </div>
                        <div className="flex items-center gap-4">
                            <a
                                href={otherHref}
                                className="text-xs font-semibold text-muted hover:text-body"
                            >
                                {t("landing.switch")}
                            </a>
                            <a
                                href="/api/auth/login"
                                className="inline-flex items-center rounded-full bg-btn px-5 py-2.5 text-sm font-semibold text-btntext"
                            >
                                {t("nav.signin")}
                            </a>
                        </div>
                    </nav>

                    <section className="bg-brand text-ink">
                        <div className="mx-auto max-w-[980px] px-6 py-14 sm:py-20">
                            <h1 className="font-head text-[2.8rem] font-extrabold leading-[0.96] tracking-tight sm:text-[5rem]">
                                {t("landing.hero.title1")}
                                <br />
                                {t("landing.hero.title2")}
                            </h1>
                            <p className="mt-6 max-w-[44ch] text-lg sm:text-xl">
                                {t("landing.hero.body")}
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
                        </div>
                    </section>

                    <section id="how" className="mx-auto max-w-[980px] px-6 py-14">
                        <h2 className="font-head text-3xl font-extrabold tracking-tight sm:text-4xl">
                            {t("landing.how.title")}
                        </h2>
                        <div className="mt-7 grid gap-4 sm:grid-cols-3">
                            {(["snap", "check", "send"] as const).map((step) => (
                                <div
                                    key={step}
                                    className="rounded-panel bg-surface p-6"
                                >
                                    <h3 className="font-head text-2xl font-extrabold tracking-tight">
                                        {t(`landing.how.${step}.title`)}
                                    </h3>
                                    <p className="mt-2 text-muted">
                                        {t(`landing.how.${step}.body`)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="mx-auto max-w-[980px] px-6 pb-14">
                        <h2 className="font-head text-3xl font-extrabold tracking-tight sm:text-4xl">
                            {t("landing.audience.title")}
                        </h2>
                        <p className="mt-4 max-w-[56ch] text-muted">
                            {t("landing.audience.body")}
                        </p>
                    </section>

                    <section
                        id="pricing"
                        className="mx-auto max-w-[980px] px-6 pb-14"
                    >
                        <h2 className="font-head text-3xl font-extrabold tracking-tight sm:text-4xl">
                            {t("landing.pricing.title")}
                        </h2>
                        <p className="mt-4 max-w-[48ch] text-muted">
                            {t("landing.pricing.body")}
                        </p>
                        <a
                            href="/api/auth/login"
                            className="mt-6 inline-flex items-center rounded-full bg-maroon px-7 py-4 font-semibold text-white"
                        >
                            {t("landing.pricing.cta")}
                        </a>

                        <div className="mt-8 max-w-[980px] rounded-panel bg-surface p-7">
                            <h3 className="font-head text-2xl font-extrabold tracking-tight">
                                {t("landing.referral.title")}
                            </h3>
                            <p className="mt-2 text-muted">
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
                            {[1, 2, 3].map((i) => (
                                <details
                                    key={i}
                                    className="border-t border-line py-4"
                                >
                                    <summary className="cursor-pointer font-semibold">
                                        {t(`landing.faq.q${i}`)}
                                    </summary>
                                    <p className="mt-2 max-w-[60ch] text-muted">
                                        {t(`landing.faq.a${i}`)}
                                    </p>
                                </details>
                            ))}
                        </div>
                    </section>

                    <footer className="bg-maroon px-6 py-14 text-center text-white">
                        <h2 className="mx-auto max-w-[980px] font-head text-3xl font-extrabold tracking-tight sm:text-4xl">
                            {t("landing.foot.title")}
                        </h2>
                        <a
                            href="/api/auth/login"
                            className="mt-6 inline-flex items-center rounded-full bg-brand px-7 py-4 font-semibold text-ink"
                        >
                            {t("landing.foot.cta")}
                        </a>
                    </footer>
                </main>
            </div>
        </div>
    );
}
