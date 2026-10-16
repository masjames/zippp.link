import { COMPETITORS, competitorHref } from "@/lib/competitors";
import { LEGAL_PAGES, legalHref } from "@/lib/legal";
import { PERSONAS, personaHref } from "@/lib/personas";
import type { Lang, Region } from "@/lib/region";
import type { T } from "@/lib/t";
import type { BusinessInfo } from "@/lib/business";

/**
 * PhotoAI-style footer: legal row, then vertical Use cases / Compare columns.
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
        <div className="mx-auto max-w-[980px] px-6 py-12 text-sm text-muted">
            <nav className="flex flex-wrap gap-x-5 gap-y-2 pb-8">
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

            <div className="grid gap-10 sm:grid-cols-2">
                <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-body">
                        {t("footer.useCases")}
                    </p>
                    <ul className="mt-3 flex flex-col gap-2">
                        {PERSONAS.map((p) => (
                            <li key={p.id}>
                                <a
                                    href={personaHref(p.id, resolvedRegion)}
                                    className="font-semibold text-muted hover:text-body"
                                >
                                    {t(`landing.who.${p.whoKey}.title`)}
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
                <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-body">
                        {t("footer.compare")}
                    </p>
                    <ul className="mt-3 flex flex-col gap-2">
                        {COMPETITORS.map((c) => (
                            <li key={c.id}>
                                <a
                                    href={competitorHref(c.id, resolvedRegion)}
                                    className="font-semibold text-muted hover:text-body"
                                >
                                    zippp vs {c.shortName}
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            <p className="mt-10 pt-6">
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
