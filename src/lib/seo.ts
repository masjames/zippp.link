import type { Metadata } from "next";
import { absoluteUrl, SITE_URL } from "./site";
import type { Lang, Region } from "./region";

export type PageSeoInput = {
    title: string;
    description: string;
    /** Path for this page, e.g. `/for-purchasing` or `/id` */
    path: string;
    /** Matching path in the other locale */
    alternatePath: string;
    lang: Lang;
    region: Region;
    noIndex?: boolean;
    /** Optional absolute or site-relative OG image override */
    ogImage?: string;
    ogAlt?: string;
};

function ogImageFor(path: string, lang: Lang): string {
    if (path === "/id" || path.startsWith("/id/")) {
        return absoluteUrl("/id/opengraph-image");
    }
    if (lang === "id") {
        return absoluteUrl("/id/opengraph-image");
    }
    return absoluteUrl("/opengraph-image");
}

/** Shared metadata for public marketing pages (SEO + social). */
export function buildPageMetadata(input: PageSeoInput): Metadata {
    const { title, description, path, alternatePath, lang, noIndex } = input;
    const url = absoluteUrl(path);
    const enPath = lang === "en" ? path : alternatePath;
    const idPath = lang === "id" ? path : alternatePath;
    const image = input.ogImage
        ? input.ogImage.startsWith("http")
            ? input.ogImage
            : absoluteUrl(input.ogImage)
        : ogImageFor(path, lang);
    const imageAlt =
        input.ogAlt ??
        (lang === "id"
            ? "zippp — Untuk yang masih mengetik nota"
            : "zippp — For people who still type receipts");

    return {
        // Absolute so root `title.template` does not double-suffix.
        title: { absolute: title },
        description,
        applicationName: "zippp",
        authors: [{ name: "Aldan Arkara", url: SITE_URL }],
        creator: "Aldan Arkara",
        publisher: "zippp",
        category: "productivity",
        keywords:
            lang === "id"
                ? [
                      "untuk yang masih mengetik nota",
                      "mengetik nota",
                      "foto nota Google Sheets",
                      "scan nota ke spreadsheet",
                      "pembelian dapur",
                      "pengeluaran pribadi",
                      "rekap penjualan harian",
                      "reimbursement",
                      "zippp",
                  ]
                : [
                      "for people who still type receipts",
                      "type receipts into sheets",
                      "receipt to Google Sheets",
                      "kitchen purchasing",
                      "personal expenses",
                      "daily sales recap",
                      "reimbursement claims",
                      "zippp",
                  ],
        alternates: {
            canonical: url,
            languages: {
                en: absoluteUrl(enPath === "/" ? "/" : enPath),
                id: absoluteUrl(idPath),
                "x-default": absoluteUrl(enPath === "/" ? "/" : enPath),
            },
        },
        openGraph: {
            title,
            description,
            url,
            siteName: "zippp",
            locale: lang === "id" ? "id_ID" : "en_US",
            type: "website",
            images: [
                {
                    url: image,
                    width: 1200,
                    height: 630,
                    alt: imageAlt,
                },
            ],
        },
        twitter: {
            card: "summary_large_image",
            title,
            description,
            images: [image],
        },
        robots: noIndex
            ? { index: false, follow: false }
            : {
                  index: true,
                  follow: true,
                  googleBot: {
                      index: true,
                      follow: true,
                      "max-image-preview": "large",
                      "max-snippet": -1,
                      "max-video-preview": -1,
                  },
              },
    };
}
