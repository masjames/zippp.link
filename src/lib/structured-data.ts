import { businessInfo } from "./business";
import { COMPETITORS } from "./competitors";
import { PERSONAS, personaHref } from "./personas";
import { absoluteUrl, SITE_URL } from "./site";
import type { Lang, Region } from "./region";
import type { T } from "./t";

/** JSON-LD graph for master landing (SoftwareApplication + FAQ + Org). */
export function masterJsonLd(t: T, lang: Lang, region: Region) {
    const business = businessInfo();
    const home = region === "id" ? "/id" : "/";
    const faqs = [1, 2, 3, 4, 5].map((i) => ({
        "@type": "Question",
        name: t(`landing.faq.q${i}`),
        acceptedAnswer: {
            "@type": "Answer",
            text: t(`landing.faq.a${i}`),
        },
    }));

    return {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "Organization",
                "@id": `${SITE_URL}/#organization`,
                name: "zippp",
                url: SITE_URL,
                logo: absoluteUrl("/og.png"),
                founder: {
                    "@type": "Person",
                    name: "Aldan Arkara",
                },
                contactPoint: business.email
                    ? {
                          "@type": "ContactPoint",
                          email: business.email,
                          contactType: "customer support",
                          availableLanguage: ["English", "Indonesian"],
                      }
                    : undefined,
            },
            {
                "@type": "WebSite",
                "@id": `${SITE_URL}/#website`,
                url: SITE_URL,
                name: "zippp",
                inLanguage: [lang === "id" ? "id" : "en"],
                publisher: { "@id": `${SITE_URL}/#organization` },
            },
            {
                "@type": "SoftwareApplication",
                "@id": `${SITE_URL}/#app`,
                name: "zippp",
                applicationCategory: "BusinessApplication",
                operatingSystem: "Web",
                url: absoluteUrl(home),
                description: t("meta.description"),
                offers: {
                    "@type": "Offer",
                    priceCurrency: region === "id" ? "IDR" : "USD",
                    price: region === "id" ? "15000" : "9",
                    description:
                        region === "id"
                            ? "From Rp 15.000 for 100 scan credits"
                            : "100 credits for $9",
                },
                featureList: [
                    "Receipt and invoice photo capture",
                    "Human check before Google Sheets append",
                    "Google Sheets and Google Drive integration",
                    "Indonesian and English",
                    "Prepaid credits",
                ],
                author: { "@id": `${SITE_URL}/#organization` },
            },
            {
                "@type": "FAQPage",
                "@id": absoluteUrl(home) + "#faq",
                mainEntity: faqs,
            },
            {
                "@type": "ItemList",
                name: t("footer.useCases"),
                itemListElement: PERSONAS.map((p, i) => ({
                    "@type": "ListItem",
                    position: i + 1,
                    name: t(`landing.who.${p.whoKey}.title`),
                    url: absoluteUrl(personaHref(p.id, region)),
                })),
            },
        ],
    };
}

/** Breadcrumb + WebPage for persona / vs routes. */
export function leafJsonLd(opts: {
    t: T;
    region: Region;
    path: string;
    name: string;
    description: string;
    kind: "persona" | "compare";
}) {
    const home = opts.region === "id" ? "/id" : "/";
    return {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "WebPage",
                "@id": absoluteUrl(opts.path),
                url: absoluteUrl(opts.path),
                name: opts.name,
                description: opts.description,
                isPartOf: { "@id": `${SITE_URL}/#website` },
                about: { "@id": `${SITE_URL}/#app` },
            },
            {
                "@type": "BreadcrumbList",
                itemListElement: [
                    {
                        "@type": "ListItem",
                        position: 1,
                        name: "zippp",
                        item: absoluteUrl(home),
                    },
                    {
                        "@type": "ListItem",
                        position: 2,
                        name: opts.name,
                        item: absoluteUrl(opts.path),
                    },
                ],
            },
            opts.kind === "compare"
                ? {
                      "@type": "WebPage",
                      name: opts.name,
                      description: opts.description,
                      speakable: {
                          "@type": "SpeakableSpecification",
                          cssSelector: ["h1", "table"],
                      },
                  }
                : undefined,
        ].filter(Boolean),
    };
}

export function compareIndexHint() {
    return COMPETITORS.map((c) => c.id);
}
