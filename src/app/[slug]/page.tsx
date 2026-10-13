import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LegalPage from "@/components/landing/LegalPage";
import { loadWording } from "@/lib/content";
import { legalIdFromSlug, legalSlugs } from "@/lib/legal";
import { makeT } from "@/lib/t";

/** English information pages: /pricing, /terms, /privacy, /refund, /contact. */

export const dynamicParams = false;

export function generateStaticParams() {
    return legalSlugs("en").map((slug) => ({ slug }));
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const id = legalIdFromSlug(slug, "en");
    if (!id) return {};
    const t = makeT(loadWording(), "en");
    return { title: `${t(`legal.${id}.title`)} · zippp` };
}

export default async function EnLegalPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const id = legalIdFromSlug(slug, "en");
    if (!id) notFound();
    return <LegalPage id={id} lang="en" />;
}
