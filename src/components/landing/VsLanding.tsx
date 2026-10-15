"use client";

import SiteFooter from "./SiteFooter";
import GoogleIntegrations from "./GoogleIntegrations";
import GoogleSignInButton from "./GoogleSignInButton";
import RegionSelect from "../RegionSelect";
import type { BusinessInfo } from "@/lib/business";
import {
    COMPETITORS,
    competitorHref,
    VS_ROW_KEYS,
    type CompetitorDef,
} from "@/lib/competitors";
import { masterHref } from "@/lib/personas";
import { RichText } from "@/lib/rich-text";
import { makeT, type Wording } from "@/lib/t";
import type { Lang, Region } from "@/lib/region";

/** PhotoAI-style zippp vs X comparison page. */
export default function VsLanding({
    competitor,
    wording,
    lang,
    region,
    business,
}: {
    competitor: CompetitorDef;
    wording: Wording;
    lang: Lang;
    region: Region;
    business: BusinessInfo;
}) {
    const t = makeT(wording, lang);
    const home = masterHref(region);
    const id = competitor.id;
    const others = COMPETITORS.filter((c) => c.id !== id);

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
                        <div className="mx-auto max-w-[980px] px-6 py-14 sm:py-20">
                            <p className="text-sm font-semibold uppercase tracking-wide opacity-80">
                                {t("landing.vs.eyebrow")}
                            </p>
                            <h1 className="mt-3 font-head text-[2.4rem] font-extrabold leading-[0.96] tracking-tight sm:text-[4rem]">
                                <RichText text={t(`landing.vs.${id}.title`)} />
                            </h1>
                            <p className="mt-6 max-w-[52ch] text-lg sm:text-xl">
                                <RichText text={t(`landing.vs.${id}.body`)} />
                            </p>
                            <div className="mt-8">
                                <a
                                    href="/api/auth/login"
                                    className="inline-flex items-center rounded-full bg-maroon px-7 py-4 font-semibold text-white"
                                >
                                    {t("landing.vs.cta")}
                                </a>
                            </div>
                        </div>
                    </section>

                    <section className="mx-auto max-w-[980px] px-6 py-10">
                        <GoogleIntegrations t={t} />
                    </section>

                    <section className="mx-auto max-w-[980px] px-6 pb-14">
                        <h2 className="font-head text-3xl font-extrabold tracking-tight">
                            {t("landing.vs.tableTitle")}
                        </h2>
                        <div className="mt-6 overflow-x-auto rounded-panel border-2 border-line">
                            <table className="min-w-full text-left text-sm">
                                <thead>
                                    <tr className="bg-surface">
                                        <th className="px-4 py-3 font-semibold">
                                            {t("landing.vs.col.feature")}
                                        </th>
                                        <th className="px-4 py-3 font-semibold text-brand">
                                            zippp
                                        </th>
                                        <th className="px-4 py-3 font-semibold">
                                            {competitor.name}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {VS_ROW_KEYS.map((row) => (
                                        <tr
                                            key={row}
                                            className="border-t border-line"
                                        >
                                            <td className="px-4 py-3 font-semibold text-body">
                                                {t(`landing.vs.row.${row}`)}
                                            </td>
                                            <td className="px-4 py-3 text-body">
                                                {t(`landing.vs.${id}.zippp.${row}`)}
                                            </td>
                                            <td className="px-4 py-3 text-muted">
                                                {t(`landing.vs.${id}.them.${row}`)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <p className="mt-4 text-xs text-muted">
                            {t("landing.vs.disclaimer")}
                        </p>
                    </section>

                    <section className="mx-auto max-w-[980px] px-6 pb-14">
                        <h2 className="font-head text-2xl font-extrabold tracking-tight">
                            {t("landing.vs.whyTitle")}
                        </h2>
                        <ul className="mt-4 list-disc space-y-2 pl-5 text-muted">
                            {[1, 2, 3].map((n) => (
                                <li key={n}>
                                    <RichText
                                        text={t(`landing.vs.${id}.why${n}`)}
                                    />
                                </li>
                            ))}
                        </ul>
                    </section>

                    <section className="mx-auto max-w-[980px] px-6 pb-14">
                        <h2 className="font-head text-2xl font-extrabold tracking-tight">
                            {t("landing.vs.otherTitle")}
                        </h2>
                        <div className="mt-4 flex flex-wrap gap-3">
                            {others.map((c) => (
                                <a
                                    key={c.id}
                                    href={competitorHref(c.id, region)}
                                    className="rounded-panel bg-surface px-4 py-2 text-sm font-semibold text-body hover:bg-peach/50"
                                >
                                    zippp vs {c.shortName}
                                </a>
                            ))}
                        </div>
                    </section>

                    <footer className="bg-maroon px-6 py-14 text-center text-white">
                        <h2 className="mx-auto max-w-[980px] font-head text-3xl font-extrabold tracking-tight">
                            {t("landing.vs.foot")}
                        </h2>
                        <a
                            href="/api/auth/login"
                            className="mt-6 inline-flex items-center rounded-full bg-brand px-7 py-4 font-semibold text-ink"
                        >
                            {t("landing.foot.cta")}
                        </a>
                    </footer>
                    <SiteFooter t={t} lang={lang} business={business} region={region} />
                </main>
            </div>
        </div>
    );
}
