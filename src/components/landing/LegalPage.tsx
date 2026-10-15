import type { ReactNode } from "react";
import ProtectedEmail from "./ProtectedEmail";
import SiteFooter from "./SiteFooter";
import { businessInfo, whatsappLink } from "@/lib/business";
import {
    IDR_PER_CREDIT,
    INTL_PACK_CREDITS,
    INTL_PACK_USD,
    MIN_TOPUP_IDR,
    CREDIT_TTL_DAYS,
    IDR_TOPUP_PRESETS,
    creditsForIdr,
} from "@/lib/billing/config";
import { loadWording } from "@/lib/content";
import { legalHref, type LegalPageId } from "@/lib/legal";
import type { Lang } from "@/lib/region";
import { fill, makeT } from "@/lib/t";

/**
 * One public information page (pricing, terms, privacy, refund, contact).
 *
 * Body copy comes from `legal.<id>.body.<lang>` in wording.txt. Paragraphs are
 * separated by a blank line; a paragraph starting with `# ` renders as a
 * subheading; one starting with `- ` renders as a list. `{placeholders}` are
 * filled from the business info and billing constants.
 */
export default function LegalPage({
    id,
    lang,
}: {
    id: LegalPageId;
    lang: Lang;
}) {
    const wording = loadWording();
    const t = makeT(wording, lang);
    const business = businessInfo();
    const home = lang === "id" ? "/id" : "/";

    const values: Record<string, string | number> = {
        business: business.name,
        operator: business.operator,
        email: t("contact.reveal.placeholder"),
        whatsapp: business.whatsapp || "-",
        address: business.address || "-",
        idrPerCredit: IDR_PER_CREDIT.toLocaleString("id-ID"),
        minTopupIdr: MIN_TOPUP_IDR.toLocaleString("id-ID"),
        minTopupCredits: Math.floor(MIN_TOPUP_IDR / IDR_PER_CREDIT),
        intlCredits: INTL_PACK_CREDITS,
        intlUsd: INTL_PACK_USD,
        ttlDays: CREDIT_TTL_DAYS,
        termsHref: legalHref("terms", lang),
        privacyHref: legalHref("privacy", lang),
        refundHref: legalHref("refund", lang),
        pricingHref: legalHref("pricing", lang),
        contactHref: legalHref("contact", lang),
        updated: t("legal.updated"),
    };

    const body = fill(t(`legal.${id}.body`), values);
    const blocks = body.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
    const wa = whatsappLink(business.whatsapp);

    return (
        <div className="min-h-screen bg-page">
            <div className="mx-auto max-w-[1180px] px-5 pb-16 pt-8">
                <main className="overflow-hidden rounded-phone border-2 border-line bg-card">
                    <nav className="mx-auto flex max-w-[980px] flex-wrap items-center justify-between gap-3 px-6 py-5">
                        <a
                            href={home}
                            className="font-head text-3xl font-black leading-none tracking-tight text-brand"
                        >
                            zippp
                        </a>
                    </nav>

                    <article className="mx-auto max-w-[760px] px-6 pb-14 pt-6">
                        <h1 className="font-head text-4xl font-extrabold tracking-tight sm:text-5xl">
                            {t(`legal.${id}.title`)}
                        </h1>
                        <p className="mt-3 text-sm text-muted">
                            {fill(t("legal.updatedLine"), values)}
                        </p>
                        <div className="mt-8 space-y-4 leading-relaxed text-body">
                            {blocks.map((block, i) => renderBlock(block, i))}
                        </div>

                        {id === "contact" ? (
                            <div className="mt-8 flex flex-wrap items-center gap-3">
                                <ProtectedEmail
                                    labels={{
                                        show: t("contact.reveal.show"),
                                        prompt: t("contact.reveal.prompt"),
                                        submit: t("contact.reveal.submit"),
                                        wrong: t("contact.reveal.wrong"),
                                    }}
                                />
                                {wa ? (
                                    <a
                                        href={wa}
                                        className="inline-flex items-center rounded-full bg-peach px-6 py-3 font-semibold text-ink"
                                    >
                                        WhatsApp {business.whatsapp}
                                    </a>
                                ) : null}
                            </div>
                        ) : null}

                        {id === "pricing" ? (
                            <PricingTiers t={t} lang={lang} values={values} />
                        ) : null}
                    </article>

                    <SiteFooter t={t} lang={lang} business={business} />
                </main>
            </div>
        </div>
    );
}

/**
 * The part of the pricing page a payment gateway reviewer looks for: what the
 * customer picks, what it costs, how they pay, and the button that leads to
 * payment. Sign-in is required to actually pay, so the CTA goes to login.
 */
function PricingTiers({
    t,
    lang,
    values,
}: {
    t: (key: string) => string;
    lang: Lang;
    values: Record<string, string | number>;
}) {
    const tiers =
        lang === "id"
            ? IDR_TOPUP_PRESETS.map((idr) => ({
                  price: `Rp ${idr.toLocaleString("id-ID")}`,
                  credits: creditsForIdr(idr),
              }))
            : [{ price: `$${INTL_PACK_USD}`, credits: INTL_PACK_CREDITS }];

    return (
        <section className="mt-10 rounded-phone border-2 border-line bg-page p-6">
            <h2 className="font-head text-2xl font-extrabold tracking-tight">
                {t("legal.pricing.tiers.title")}
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {tiers.map((tier) => (
                    <div
                        key={tier.price}
                        className="flex items-baseline justify-between rounded-2xl bg-card px-5 py-4"
                    >
                        <span className="font-head text-2xl font-extrabold">
                            {tier.price}
                        </span>
                        <span className="text-sm font-semibold text-muted">
                            {fill(t("legal.pricing.tiers.credits"), {
                                count: tier.credits,
                            })}
                        </span>
                    </div>
                ))}
            </div>
            <p className="mt-4 text-sm text-muted">
                {fill(t("legal.pricing.tiers.methods"), values)}
            </p>
            <a
                href="/api/auth/login"
                className="mt-5 inline-flex items-center rounded-full bg-maroon px-7 py-4 font-semibold text-white"
            >
                {t("legal.pricing.tiers.cta")}
            </a>
        </section>
    );
}

function renderBlock(block: string, key: number): ReactNode {
    if (block.startsWith("# ")) {
        return (
            <h2
                key={key}
                className="pt-4 font-head text-2xl font-extrabold tracking-tight"
            >
                {block.slice(2)}
            </h2>
        );
    }
    const lines = block.split("\n").map((l) => l.trim());
    if (lines.every((l) => l.startsWith("- "))) {
        return (
            <ul key={key} className="list-disc space-y-1 pl-6">
                {lines.map((l, i) => (
                    <li key={i}>{renderInline(l.slice(2))}</li>
                ))}
            </ul>
        );
    }
    return <p key={key}>{renderInline(block)}</p>;
}

/** `[text](href)` becomes a link; nothing else is parsed. */
function renderInline(text: string): ReactNode {
    const parts: ReactNode[] = [];
    const re = /\[([^\]]+)\]\(([^)]+)\)/g;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
        if (m.index > last) parts.push(text.slice(last, m.index));
        parts.push(
            <a
                key={m.index}
                href={m[2]}
                className="font-semibold text-accent underline"
            >
                {m[1]}
            </a>
        );
        last = m.index + m[0].length;
    }
    if (last < text.length) parts.push(text.slice(last));
    return parts.length === 1 ? parts[0] : parts;
}
