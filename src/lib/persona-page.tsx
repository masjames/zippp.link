import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PersonaLanding from "@/components/landing/PersonaLanding";
import JsonLd from "@/components/seo/JsonLd";
import { businessInfo } from "@/lib/business";
import { loadWording } from "@/lib/content";
import {
    personaById,
    personaHref,
    type PersonaId,
} from "@/lib/personas";
import { getLocale } from "@/lib/server-locale";
import { buildPageMetadata } from "@/lib/seo";
import { leafJsonLd } from "@/lib/structured-data";
import { makeT } from "@/lib/t";
import type { Region } from "@/lib/region";

export function personaMetadata(id: PersonaId): () => Promise<Metadata> {
    return async () => {
        const persona = personaById(id);
        if (!persona) return {};
        const { lang, region } = await getLocale();
        const t = makeT(loadWording(), lang);
        const title = t(`landing.persona.${persona.whoKey}.metaTitle`);
        const description = t(`landing.persona.${persona.whoKey}.metaDesc`);
        // Metadata uses locale cookie; path pair is always EN + ID slugs.
        const path = personaHref(id, region === "id" ? "id" : "intl");
        const alternatePath = personaHref(id, region === "id" ? "intl" : "id");
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

export async function renderPersonaPage(id: PersonaId, region: Region) {
    const persona = personaById(id);
    if (!persona) notFound();
    const wording = loadWording();
    const { lang } = await getLocale();
    const t = makeT(wording, lang);
    const path = personaHref(id, region);
    const name = t(`landing.persona.${persona.whoKey}.metaTitle`);
    const description = t(`landing.persona.${persona.whoKey}.metaDesc`);
    return (
        <>
            <JsonLd
                data={leafJsonLd({
                    t,
                    region,
                    path,
                    name,
                    description,
                    kind: "persona",
                })}
            />
            <PersonaLanding
                persona={persona}
                wording={wording}
                lang={lang}
                region={region}
                business={businessInfo()}
            />
        </>
    );
}
