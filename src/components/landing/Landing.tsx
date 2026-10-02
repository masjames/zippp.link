"use client";

import { useState } from "react";
import {
    COOKIE_MAX_AGE,
    LANG_COOKIE,
    type Lang,
    type Region,
} from "@/lib/region";
import { makeT, type Wording } from "@/lib/t";

type Props = {
    wording: Wording;
    initialLang: Lang;
    region: Region;
};

type Plan = {
    name: string;
    price: string;
    features: string[];
    cta: string;
};

/**
 * Public landing page. Copy comes from zippp-wording.md; prices follow the
 * visitor's region (IDR for Indonesia, international elsewhere).
 */
export default function Landing({ wording, initialLang, region }: Props) {
    const [lang, setLang] = useState<Lang>(initialLang);
    const t = makeT(wording, lang);

    function switchLang(next: Lang) {
        setLang(next);
        document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
    }

    function plan(n: 1 | 2): Plan {
        // Price keys already carry the region (.id / .intl), so look them up
        // directly instead of going through the language-bound translator.
        const priceKey =
            region === "id"
                ? `landing.plan${n}.price.id`
                : `landing.plan${n}.price.intl`;
        return {
            name: t(`landing.plan${n}.name`),
            price: wording[priceKey] ?? "",
            features: [1, 2, 3, 4].map((i) => t(`landing.plan${n}.f${i}`)),
            cta: t(`landing.plan${n}.cta`),
        };
    }

    const plans = [plan(1), plan(2)];
    const faqs = [1, 2, 3].map((i) => ({
        q: t(`landing.faq.q${i}`),
        a: t(`landing.faq.a${i}`),
    }));

    return (
        <div className="min-h-screen bg-page">
            <div className="mx-auto max-w-[1180px] px-5 pb-16 pt-8">
                <main className="overflow-hidden rounded-phone border-2 border-line bg-card">
                    {/* Nav */}
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
                            <a href="#questions" className="text-body hover:text-brand">
                                {t("nav.questions")}
                            </a>
                        </div>
                        <div className="flex items-center gap-3">
                            <LangToggle lang={lang} onChange={switchLang} />
                            <a
                                href="/app"
                                className="inline-flex items-center rounded-full bg-btn px-5 py-2.5 text-sm font-semibold text-btntext"
                            >
                                {t("nav.signin")}
                            </a>
                        </div>
                    </nav>

                    {/* Hero */}
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
                                    href="/app"
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

                    {/* How it works */}
                    <section id="how" className="mx-auto max-w-[980px] px-6 py-14">
                        <h2 className="font-head text-3xl font-extrabold tracking-tight sm:text-4xl">
                            {t("landing.how.title")}
                        </h2>
                        <div className="mt-7 grid gap-4 sm:grid-cols-3">
                            {(["snap", "check", "send"] as const).map((step) => (
                                <div key={step} className="rounded-panel bg-surface p-6">
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

                    {/* Audience */}
                    <section className="mx-auto max-w-[980px] px-6 pb-14">
                        <h2 className="font-head text-3xl font-extrabold tracking-tight sm:text-4xl">
                            {t("landing.audience.title")}
                        </h2>
                        <p className="mt-4 max-w-[56ch] text-muted">
                            {t("landing.audience.body")}
                        </p>
                    </section>

                    {/* Pricing */}
                    <section id="pricing" className="mx-auto max-w-[980px] px-6 pb-14">
                        <h2 className="font-head text-3xl font-extrabold tracking-tight sm:text-4xl">
                            {t("landing.pricing.title")}
                        </h2>
                        <div className="mt-7 grid gap-4 sm:grid-cols-2">
                            {plans.map((p, i) => (
                                <div
                                    key={p.name}
                                    className={`flex flex-col gap-4 rounded-panel border-2 p-7 ${
                                        i === 0
                                            ? "border-brand bg-brand text-ink"
                                            : "border-line bg-card text-body"
                                    }`}
                                >
                                    <h3 className="font-head text-2xl font-extrabold tracking-tight">
                                        {p.name}
                                    </h3>
                                    <div className="font-head text-4xl font-extrabold tracking-tight">
                                        {p.price}{" "}
                                        <small className="font-body text-sm font-medium tracking-normal">
                                            {t("landing.pricing.period")}
                                        </small>
                                    </div>
                                    <ul className="flex-1 space-y-2">
                                        {p.features.map((f) => (
                                            <li key={f} className="flex gap-2">
                                                <span aria-hidden>✓</span>
                                                <span>{f}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    <a
                                        href="/app"
                                        className={`inline-flex items-center justify-center rounded-full px-6 py-4 font-semibold ${
                                            i === 0
                                                ? "bg-maroon text-white"
                                                : "bg-mist text-ink"
                                        }`}
                                    >
                                        {p.cta}
                                    </a>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* FAQ */}
                    <section
                        id="questions"
                        className="mx-auto max-w-[980px] px-6 pb-14"
                    >
                        <h2 className="font-head text-3xl font-extrabold tracking-tight sm:text-4xl">
                            {t("landing.faq.title")}
                        </h2>
                        <div className="mt-6">
                            {faqs.map((item) => (
                                <details
                                    key={item.q}
                                    className="border-t border-line py-4"
                                >
                                    <summary className="cursor-pointer font-semibold">
                                        {item.q}
                                    </summary>
                                    <p className="mt-2 max-w-[60ch] text-muted">
                                        {item.a}
                                    </p>
                                </details>
                            ))}
                        </div>
                    </section>

                    {/* Footer CTA */}
                    <footer className="bg-maroon px-6 py-14 text-center text-white">
                        <h2 className="mx-auto max-w-[980px] font-head text-3xl font-extrabold tracking-tight sm:text-4xl">
                            {t("landing.foot.title")}
                        </h2>
                        <a
                            href="/app"
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

function LangToggle({
    lang,
    onChange,
}: {
    lang: Lang;
    onChange: (lang: Lang) => void;
}) {
    return (
        <div className="flex gap-1" role="group" aria-label="Language">
            {(["en", "id"] as const).map((value) => (
                <button
                    key={value}
                    type="button"
                    onClick={() => onChange(value)}
                    aria-pressed={lang === value}
                    className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${
                        lang === value
                            ? "bg-btn text-btntext"
                            : "text-muted hover:bg-surface"
                    }`}
                >
                    {value}
                </button>
            ))}
        </div>
    );
}
