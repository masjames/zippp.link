import type { Lang } from "./region";

/**
 * Public information pages. The slug is the URL segment under `/` (English)
 * or `/id` (Indonesian). Copy lives in `spec/wording.md` under `legal.<id>.*`.
 */
export type LegalPageId = "pricing" | "terms" | "privacy" | "refund" | "contact";

export const LEGAL_PAGES: LegalPageId[] = [
    "pricing",
    "terms",
    "privacy",
    "refund",
    "contact",
];

const SLUGS: Record<Lang, Record<LegalPageId, string>> = {
    en: {
        pricing: "pricing",
        terms: "terms",
        privacy: "privacy",
        refund: "refund",
        contact: "contact",
    },
    id: {
        pricing: "harga",
        terms: "syarat",
        privacy: "privasi",
        refund: "refund",
        contact: "kontak",
    },
};

export function legalSlug(id: LegalPageId, lang: Lang): string {
    return SLUGS[lang][id];
}

export function legalHref(id: LegalPageId, lang: Lang): string {
    const slug = legalSlug(id, lang);
    return lang === "id" ? `/id/${slug}` : `/${slug}`;
}

export function legalIdFromSlug(slug: string, lang: Lang): LegalPageId | null {
    for (const id of LEGAL_PAGES) {
        if (SLUGS[lang][id] === slug) return id;
    }
    return null;
}

export function legalSlugs(lang: Lang): string[] {
    return LEGAL_PAGES.map((id) => SLUGS[lang][id]);
}
