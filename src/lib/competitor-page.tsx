import type { Metadata } from "next";
import { notFound } from "next/navigation";
import VsLanding from "@/components/landing/VsLanding";
import { businessInfo } from "@/lib/business";
import { competitorById, type CompetitorId } from "@/lib/competitors";
import { loadWording } from "@/lib/content";
import { getLocale } from "@/lib/server-locale";
import { makeT } from "@/lib/t";
import type { Region } from "@/lib/region";

export function competitorMetadata(id: CompetitorId): () => Promise<Metadata> {
    return async () => {
        const competitor = competitorById(id);
        if (!competitor) return {};
        const { lang } = await getLocale();
        const t = makeT(loadWording(), lang);
        const title = t(`landing.vs.${id}.metaTitle`);
        const description = t(`landing.vs.${id}.metaDesc`);
        return {
            title: `${title} · zippp`,
            description,
            openGraph: { title: `${title} · zippp`, description },
        };
    };
}

export async function renderCompetitorPage(id: CompetitorId, region: Region) {
    const competitor = competitorById(id);
    if (!competitor) notFound();
    const wording = loadWording();
    const { lang } = await getLocale();
    return (
        <VsLanding
            competitor={competitor}
            wording={wording}
            lang={lang}
            region={region}
            business={businessInfo()}
        />
    );
}
