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
    const slogan =
        lang === "id"
            ? "Hari gini nyatet struk masih manual?"
            : "You still do manual recap?";
    const faqs = [1, 2, 3, 4, 5].map((i) => ({
        "@type": "Question",
        name: t(`landing.faq.q${i}`),
        acceptedAnswer: {
            "@type": "Answer",
            text: t(`landing.faq.a${i}`),
        },
    }));

    const featureList =
        lang === "id"
            ? [
                  "Foto nota dan invoice ke Google Sheets",
                  "Cek dulu sebelum baris dikirim",
                  "Integrasi Google Sheets dan Google Drive",
                  "Template pembelian, pengeluaran, penjualan, reimbursement",
                  "Kredit prabayar",
              ]
            : [
                  "Receipt and invoice photo capture into Google Sheets",
                  "Human check before rows are appended",
                  "Google Sheets and Google Drive integration",
                  "Templates for purchasing, expenses, sales, reimbursement",
                  "Prepaid credits",
              ];

    return {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "Organization",
                "@id": `${SITE_URL}/#organization`,
                name: "zippp",
                alternateName: slogan,
                url: SITE_URL,
                logo: absoluteUrl("/icon"),
                image: absoluteUrl(
                    region === "id" ? "/id/opengraph-image" : "/opengraph-image"
                ),
                slogan,
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
                url: absoluteUrl(home),
                name: "zippp",
                alternateName: slogan,
                description: t("meta.description"),
                inLanguage: [lang === "id" ? "id-ID" : "en-US"],
                publisher: { "@id": `${SITE_URL}/#organization` },
            },
            {
                "@type": "WebPage",
                "@id": absoluteUrl(home),
                url: absoluteUrl(home),
                name: t("meta.title"),
                headline: slogan,
                description: t("meta.description"),
                inLanguage: lang === "id" ? "id-ID" : "en-US",
                isPartOf: { "@id": `${SITE_URL}/#website` },
                about: { "@id": `${SITE_URL}/#app` },
                primaryImageOfPage: absoluteUrl(
                    region === "id" ? "/id/opengraph-image" : "/opengraph-image"
                ),
            },
            {
                "@type": "SoftwareApplication",
                "@id": `${SITE_URL}/#app`,
                name: "zippp",
                alternateName: slogan,
                applicationCategory: "BusinessApplication",
                operatingSystem: "Web",
                url: absoluteUrl(home),
                description: t("meta.description"),
                slogan,
                image: absoluteUrl(
                    region === "id" ? "/id/opengraph-image" : "/opengraph-image"
                ),
                offers: {
                    "@type": "Offer",
                    priceCurrency: region === "id" ? "IDR" : "USD",
                    price: region === "id" ? "15000" : "9",
                    description:
                        region === "id"
                            ? "Mulai Rp 15.000 untuk 100 kredit scan"
                            : "100 credits for $9",
                    url: absoluteUrl(
                        region === "id" ? "/id/harga" : "/pricing"
                    ),
                },
                featureList,
                author: { "@id": `${SITE_URL}/#organization` },
                publisher: { "@id": `${SITE_URL}/#organization` },
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
                    description: t(`landing.who.${p.whoKey}.body`),
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
    const og =
        opts.region === "id"
            ? absoluteUrl("/id/opengraph-image")
            : absoluteUrl("/opengraph-image");
    return {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "WebPage",
                "@id": absoluteUrl(opts.path),
                url: absoluteUrl(opts.path),
                name: opts.name,
                description: opts.description,
                primaryImageOfPage: og,
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
