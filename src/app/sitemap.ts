import type { MetadataRoute } from "next";
import { COMPETITORS } from "@/lib/competitors";
import { PERSONAS } from "@/lib/personas";
import { SITE_URL } from "@/lib/site";

/** Public marketing + legal URLs for crawlers. */
export default function sitemap(): MetadataRoute.Sitemap {
    const now = new Date();
    const entries: MetadataRoute.Sitemap = [
        {
            url: `${SITE_URL}/`,
            lastModified: now,
            changeFrequency: "weekly",
            priority: 1,
            alternates: {
                languages: { en: `${SITE_URL}/`, id: `${SITE_URL}/id` },
            },
        },
        {
            url: `${SITE_URL}/id`,
            lastModified: now,
            changeFrequency: "weekly",
            priority: 1,
            alternates: {
                languages: { en: `${SITE_URL}/`, id: `${SITE_URL}/id` },
            },
        },
    ];

    for (const p of PERSONAS) {
        const en = `${SITE_URL}/for-${p.id}`;
        const id = `${SITE_URL}/id/for-${p.id}`;
        entries.push(
            {
                url: en,
                lastModified: now,
                changeFrequency: "weekly",
                priority: 0.9,
                alternates: { languages: { en, id } },
            },
            {
                url: id,
                lastModified: now,
                changeFrequency: "weekly",
                priority: 0.9,
                alternates: { languages: { en, id } },
            }
        );
    }

    for (const c of COMPETITORS) {
        const en = `${SITE_URL}/vs-${c.id}`;
        const id = `${SITE_URL}/id/vs-${c.id}`;
        entries.push(
            {
                url: en,
                lastModified: now,
                changeFrequency: "monthly",
                priority: 0.7,
                alternates: { languages: { en, id } },
            },
            {
                url: id,
                lastModified: now,
                changeFrequency: "monthly",
                priority: 0.7,
                alternates: { languages: { en, id } },
            }
        );
    }

    const legalEn = ["pricing", "terms", "privacy", "refund", "contact"];
    const legalId = ["harga", "syarat", "privasi", "refund", "kontak"];
    for (let i = 0; i < legalEn.length; i++) {
        const en = `${SITE_URL}/${legalEn[i]}`;
        const id = `${SITE_URL}/id/${legalId[i]}`;
        entries.push(
            {
                url: en,
                lastModified: now,
                changeFrequency: "monthly",
                priority: 0.5,
                alternates: { languages: { en, id } },
            },
            {
                url: id,
                lastModified: now,
                changeFrequency: "monthly",
                priority: 0.5,
                alternates: { languages: { en, id } },
            }
        );
    }

    return entries;
}
