import type { T } from "@/lib/t";

const QUOTES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
const ROW_A = QUOTES.filter((_, i) => i % 2 === 0);
const ROW_B = QUOTES.filter((_, i) => i % 2 === 1);

/** Endless left→right fading testimonial marquee. */
export default function ImpactProof({ t }: { t: T }) {
    return (
        <div className="space-y-10">
            <div>
                <h2 className="font-head text-3xl font-extrabold tracking-tight sm:text-4xl">
                    {t("landing.stories.title")}
                </h2>
                <p className="mt-4 max-w-[52ch] text-muted leading-relaxed">
                    {t("landing.stories.lead")}
                </p>
            </div>

            <div className="space-y-4">
                <MarqueeRow items={[...ROW_A]} t={t} duration="55s" />
                <MarqueeRow items={[...ROW_B]} t={t} duration="70s" />
            </div>

            <div className="rounded-panel border-2 border-maroon bg-maroon px-6 py-6 text-white sm:px-8">
                <p className="text-sm font-semibold opacity-80">
                    {t("landing.founder.eyebrow")}
                </p>
                <p className="mt-2 max-w-[56ch] text-lg font-semibold leading-snug">
                    {t("landing.founder.body")}
                </p>
                <p className="mt-4 font-head text-xl font-black tracking-tight">
                    {t("landing.founder.name")}
                </p>
                <p className="text-sm opacity-80">{t("landing.founder.role")}</p>
            </div>
        </div>
    );
}

function MarqueeRow({
    items,
    t,
    duration,
}: {
    items: number[];
    t: T;
    duration: string;
}) {
    const loop = [...items, ...items];

    return (
        <div className="testimonials-fade relative overflow-hidden py-1">
            <div
                className="testimonials-track testimonials-slide-ltr flex w-max gap-4"
                style={{ animationDuration: duration }}
            >
                {loop.map((n, i) => (
                    <TestimonialCard key={`${n}-${i}`} n={n} t={t} />
                ))}
            </div>
        </div>
    );
}

function TestimonialCard({ n, t }: { n: number; t: T }) {
    return (
        <figure className="flex w-[280px] shrink-0 flex-col rounded-panel border-2 border-line bg-card p-5 sm:w-[320px]">
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
    "photo-1494790108377-be9c29b29330",
    "photo-1472099645785-5658abf4ff4e",
    "photo-1438761681033-6461ffad8d80",
    "photo-1500648767791-00dcc994a43e",
    "photo-1544005313-94ddf0286df2",
    "photo-1506794778202-cad84cf45f1d",
    "photo-1534528741775-53994a69daeb",
    "photo-1519345182560-3f2917c472ef",
    "photo-1524504388940-b1c1722653e1",
    "photo-1507591064344-4c6ce005b128",
    "photo-1489424731084-a5d8b219a5bb",
] as const;
