import { LEGAL_PAGES, legalHref } from "@/lib/legal";
import type { Lang, Region } from "@/lib/region";
import type { T } from "@/lib/t";
import type { BusinessInfo } from "@/lib/business";
import RegionSelect from "../RegionSelect";

/**
 * Links to the public information pages plus the operator's contact line.
 * Shared by the landing and every legal page so reviewers can reach them all.
 * Email is not printed here; scrapers follow the contact page reveal instead.
 */
export default function SiteFooter({
    t,
    lang,
    region,
    business,
}: {
    t: T;
    lang: Lang;
    region: Region;
    business: BusinessInfo;
}) {
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
                <RegionSelect
                    region={region}
                    labels={{
                        label: t("region.label"),
                        worldwide: t("region.worldwide"),
                        indonesia: t("region.indonesia"),
                    }}
                />
            </nav>
            <p className="mt-4">
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
