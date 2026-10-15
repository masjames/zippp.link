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
};

/** Shared metadata for public marketing pages (SEO + social). */
export function buildPageMetadata(input: PageSeoInput): Metadata {
    const { title, description, path, alternatePath, lang, noIndex } = input;
    const url = absoluteUrl(path);
    const enPath = lang === "en" ? path : alternatePath;
    const idPath = lang === "id" ? path : alternatePath;

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
                      "scan nota Google Sheets",
                      "OCR resi Indonesia",
                      "foto nota ke spreadsheet",
                      "zippp",
                      "pembelian dapur",
                      "expense Google Sheets",
                  ]
                : [
                      "receipt to Google Sheets",
                      "receipt OCR",
                      "invoice to spreadsheet",
                      "zippp",
                      "expense tracker Google Sheets",
                      "photograph receipt",
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
                    url: "/og.png",
                    width: 1200,
                    height: 630,
                    alt: title,
                },
            ],
        },
        twitter: {
            card: "summary_large_image",
            title,
            description,
            images: ["/og.png"],
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
