import { LEGAL_PAGES, legalHref } from "@/lib/legal";
import type { Lang } from "@/lib/region";
import type { T } from "@/lib/t";
import type { BusinessInfo } from "@/lib/business";

/**
 * Links to the public information pages plus the operator's contact line.
 * Shared by the landing and every legal page so reviewers can reach them all.
 */
export default function SiteFooter({
    t,
    lang,
    business,
}: {
    t: T;
    lang: Lang;
    business: BusinessInfo;
}) {
    const otherHref = lang === "id" ? "/" : "/id";
    return (
        <div className="mx-auto max-w-[980px] px-6 py-8 text-sm text-muted">
            <nav className="flex flex-wrap gap-x-5 gap-y-2">
                {LEGAL_PAGES.map((id) => (
                    <a
                        key={id}
                        href={legalHref(id, lang)}
                        className="font-semibold hover:text-body"
                    >
                        {t(`legal.${id}.nav`)}
                    </a>
                ))}
                <a href={otherHref} className="font-semibold hover:text-body">
                    {t("landing.switch")}
                </a>
            </nav>
            <p className="mt-4">
                {business.operator}
                {business.address ? ` · ${business.address}` : ""}
                {" · "}
                <a href={`mailto:${business.email}`} className="hover:text-body">
                    {business.email}
                </a>
                {business.whatsapp ? ` · WA ${business.whatsapp}` : ""}
            </p>
        </div>
    );
}
