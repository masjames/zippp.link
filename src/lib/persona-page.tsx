import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PersonaLanding from "@/components/landing/PersonaLanding";
import { businessInfo } from "@/lib/business";
import { loadWording } from "@/lib/content";
import { personaById, type PersonaId } from "@/lib/personas";
import { getLocale } from "@/lib/server-locale";
import { makeT } from "@/lib/t";
import type { Region } from "@/lib/region";

export function personaMetadata(id: PersonaId): () => Promise<Metadata> {
    return async () => {
        const persona = personaById(id);
        if (!persona) return {};
        const { lang } = await getLocale();
        const t = makeT(loadWording(), lang);
        const title = t(`landing.persona.${persona.whoKey}.metaTitle`);
        const description = t(`landing.persona.${persona.whoKey}.metaDesc`);
        return {
            title: `${title} · zippp`,
            description,
            openGraph: { title: `${title} · zippp`, description },
        };
    };
}

export async function renderPersonaPage(id: PersonaId, region: Region) {
    const persona = personaById(id);
    if (!persona) notFound();
    const wording = loadWording();
    const { lang } = await getLocale();
    return (
        <PersonaLanding
            persona={persona}
            wording={wording}
            lang={lang}
            region={region}
            business={businessInfo()}
        />
    );
}
