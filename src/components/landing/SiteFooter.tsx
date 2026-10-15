import { COMPETITORS, competitorHref } from "@/lib/competitors";
import { LEGAL_PAGES, legalHref } from "@/lib/legal";
import { PERSONAS, personaHref } from "@/lib/personas";
import type { Lang, Region } from "@/lib/region";
import type { T } from "@/lib/t";
import type { BusinessInfo } from "@/lib/business";

/**
 * Links to legal pages, use cases, and vs-competitor pages (PhotoAI-style).
 * Email is not printed here; scrapers follow the contact page reveal instead.
 */
export default function SiteFooter({
    t,
    lang,
    business,
    region,
}: {
    t: T;
    lang: Lang;
    business: BusinessInfo;
    region?: Region;
}) {
    const resolvedRegion: Region =
        region ?? (lang === "id" ? "id" : "intl");
    const contact = legalHref("contact", lang);
    return (
        <div className="mx-auto max-w-[980px] px-6 py-8 text-sm text-muted">
            <nav className="flex flex-wrap items-center gap-x-5 gap-y-3">
                {LEGAL_PAGES.map((id) => (
                    <a
                        key={id}
                        href={legalHref(id, lang)}
                        className="font-semibold hover:text-body"
                    >
                        {t(`legal.${id}.nav`)}
                    </a>
                ))}
            </nav>

            <p className="mt-6 text-xs font-bold uppercase tracking-wide text-body">
                {t("footer.useCases")}
            </p>
            <nav className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
                {PERSONAS.map((p) => (
                    <a
                        key={p.id}
                        href={personaHref(p.id, resolvedRegion)}
                        className="font-semibold hover:text-body"
                    >
                        {t(`landing.who.${p.whoKey}.title`)}
                    </a>
                ))}
            </nav>

            <p className="mt-6 text-xs font-bold uppercase tracking-wide text-body">
                {t("footer.compare")}
            </p>
            <nav className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
                {COMPETITORS.map((c) => (
                    <a
                        key={c.id}
                        href={competitorHref(c.id, resolvedRegion)}
                        className="font-semibold hover:text-body"
                    >
                        zippp vs {c.shortName}
                    </a>
                ))}
            </nav>

            <p className="mt-6">
                {business.operator}
                {business.address ? ` · ${business.address}` : ""}
                {" · "}
                <a href={contact} className="font-semibold hover:text-body">
                    {t("contact.reveal.footer")}
                </a>
                {business.whatsapp ? ` · WA ${business.whatsapp}` : ""}
            </p>
        </div>
    );
}
