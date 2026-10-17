import type { Metadata } from "next";
import Landing from "@/components/landing/Landing";
import JsonLd from "@/components/seo/JsonLd";
import { businessInfo } from "@/lib/business";
import { publicInviteForCode } from "@/lib/billing/invites";
import { loadWording } from "@/lib/content";
import { landingAssets } from "@/lib/landing-assets";
import { getLocale } from "@/lib/server-locale";
import { buildPageMetadata } from "@/lib/seo";
import { masterJsonLd } from "@/lib/structured-data";
import { makeT } from "@/lib/t";

export async function generateMetadata(): Promise<Metadata> {
    const { lang, region } = await getLocale();
    const t = makeT(loadWording(), lang);
    return buildPageMetadata({
        title: t("meta.title"),
        description: t("meta.description"),
        path: "/",
        alternatePath: "/id",
        lang,
        region,
    });
}

/** International landing. */
export default async function Home({
    searchParams,
}: {
    searchParams?: Promise<{ invite?: string }>;
}) {
    const wording = loadWording();
    const { region, lang } = await getLocale();
    const t = makeT(wording, lang);
    const params = (await searchParams) ?? {};
    const invite = await publicInviteForCode(params.invite);
    return (
        <>
            <JsonLd data={masterJsonLd(t, lang, region)} />
            <Landing
                wording={wording}
                lang={lang}
                region={region}
                business={businessInfo()}
                assets={landingAssets(lang)}
                invite={invite}
            />
        </>
    );
}
