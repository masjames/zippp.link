import type { Metadata } from "next";
import { notFound } from "next/navigation";
import VsLanding from "@/components/landing/VsLanding";
import JsonLd from "@/components/seo/JsonLd";
import { businessInfo } from "@/lib/business";
import {
    competitorById,
    competitorHref,
    type CompetitorId,
} from "@/lib/competitors";
import { loadWording } from "@/lib/content";
import { getLocale } from "@/lib/server-locale";
import { buildPageMetadata } from "@/lib/seo";
import { leafJsonLd } from "@/lib/structured-data";
import { makeT } from "@/lib/t";
import type { Region } from "@/lib/region";

export function competitorMetadata(id: CompetitorId): () => Promise<Metadata> {
    return async () => {
        const competitor = competitorById(id);
        if (!competitor) return {};
        const { lang, region } = await getLocale();
        const t = makeT(loadWording(), lang);
        const title = t(`landing.vs.${id}.metaTitle`);
        const description = t(`landing.vs.${id}.metaDesc`);
        const path = competitorHref(id, region === "id" ? "id" : "intl");
        const alternatePath = competitorHref(
            id,
            region === "id" ? "intl" : "id"
        );
        return buildPageMetadata({
            title: `${title} · zippp`,
            description,
            path,
            alternatePath,
            lang,
            region,
        });
    };
}

export async function renderCompetitorPage(id: CompetitorId, region: Region) {
    const competitor = competitorById(id);
    if (!competitor) notFound();
    const wording = loadWording();
    const { lang } = await getLocale();
    const t = makeT(wording, lang);
    const path = competitorHref(id, region);
    const name = t(`landing.vs.${id}.metaTitle`);
    const description = t(`landing.vs.${id}.metaDesc`);
    return (
        <>
            <JsonLd
                data={leafJsonLd({
                    t,
                    region,
                    path,
                    name,
                    description,
                    kind: "compare",
                })}
            />
            <VsLanding
                competitor={competitor}
                wording={wording}
                lang={lang}
                region={region}
                business={businessInfo()}
            />
        </>
    );
}
