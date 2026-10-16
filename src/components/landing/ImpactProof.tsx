"use client";

import type { T } from "@/lib/t";

/** Sonny, Adit, Bagas — one-row seamless infinite marquee. */
const QUOTES = [1, 2, 3] as const;

export default function ImpactProof({ t }: { t: T }) {
    return (
        <div className="space-y-8">
            <h2 className="font-head text-3xl font-extrabold tracking-tight sm:text-4xl">
                {t("landing.stories.title")}
            </h2>

            <MarqueeRow t={t} duration="48s" />
        </div>
    );
}

function MarqueeRow({ t, duration }: { t: T; duration: string }) {
    // Exactly two identical halves so translateX(-50%) loops without a jump.
    const half = QUOTES.map((n) => (
        <TestimonialCard key={`a-${n}`} n={n} t={t} />
    ));
    const half2 = QUOTES.map((n) => (
        <TestimonialCard key={`b-${n}`} n={n} t={t} />
    ));

    return (
        <div className="testimonials-fade relative overflow-hidden">
            <div
                className="testimonials-slide-rtl flex w-max gap-4"
                style={{ animationDuration: duration }}
            >
                {half}
                {half2}
            </div>
        </div>
    );
}

function TestimonialCard({ n, t }: { n: number; t: T }) {
    return (
        <figure className="flex w-[280px] shrink-0 flex-col rounded-panel border-2 border-line bg-card p-5 sm:w-[300px]">
            <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={`https://images.unsplash.com/${AVATARS[n - 1]}?auto=format&fit=crop&w=96&h=96&q=80`}
                    alt=""
                    width={48}
                    height={48}
                    className="h-12 w-12 rounded-full object-cover ring-2 ring-line"
                    loading="lazy"
                />
                <div>
                    <figcaption className="text-sm font-bold text-body">
                        {t(`landing.stories.q${n}.name`)}
                    </figcaption>
                    <p className="text-xs text-muted">
                        {t(`landing.stories.q${n}.role`)}
                    </p>
                </div>
            </div>
            <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-body">
                “{t(`landing.stories.q${n}.quote`)}”
            </blockquote>
            <p className="mt-3 text-xs font-semibold text-brand">
                {t(`landing.stories.q${n}.result`)}
            </p>
        </figure>
    );
}

const AVATARS = [
    "photo-1507003211169-0a1dd7228f2d",
    "photo-1519345182560-3f2917c472ef",
    "photo-1472099645785-5658abf4ff4e",
] as const;
