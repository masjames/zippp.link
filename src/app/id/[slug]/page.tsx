import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LegalPage from "@/components/landing/LegalPage";
import { loadWording } from "@/lib/content";
import { legalIdFromSlug, legalSlugs } from "@/lib/legal";
import { makeT } from "@/lib/t";

/** Indonesian information pages: /id/harga, /id/syarat, /id/privasi, /id/refund, /id/kontak. */

export const dynamicParams = false;

export function generateStaticParams() {
    return legalSlugs("id").map((slug) => ({ slug }));
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const id = legalIdFromSlug(slug, "id");
    if (!id) return {};
    const t = makeT(loadWording(), "id");
    return { title: `${t(`legal.${id}.title`)} · zippp` };
}

export default async function IdLegalPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const id = legalIdFromSlug(slug, "id");
    if (!id) notFound();
    return <LegalPage id={id} lang="id" />;
}
