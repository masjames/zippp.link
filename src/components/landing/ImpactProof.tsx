import type { T } from "@/lib/t";

const STATS = ["hours", "rows", "cost"] as const;
const QUOTES = [1, 2, 3] as const;

/** Impact stats + placeholder testimonials (marked dummy until real quotes). */
export default function ImpactProof({ t }: { t: T }) {
    return (
        <div className="space-y-10">
            <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-brand">
                    {t("landing.impact.eyebrow")}
                </p>
                <h2 className="mt-2 font-head text-3xl font-extrabold tracking-tight sm:text-4xl">
                    {t("landing.impact.title")}
                </h2>
                <p className="mt-3 max-w-[52ch] text-muted">
                    {t("landing.impact.body")}
                </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
                {STATS.map((key) => (
                    <div
                        key={key}
                        className="rounded-panel border-2 border-line bg-card p-6"
                    >
                        <p className="font-head text-3xl font-black text-brand">
                            {t(`landing.impact.stat.${key}.value`)}
                        </p>
                        <p className="mt-2 text-sm font-semibold text-body">
                            {t(`landing.impact.stat.${key}.label`)}
                        </p>
                    </div>
                ))}
            </div>

            <div>
                <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                    <h3 className="font-head text-2xl font-extrabold tracking-tight">
                        {t("landing.stories.title")}
                    </h3>
                    <span className="rounded bg-peach px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-maroon">
                        {t("landing.stories.placeholder")}
                    </span>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                    {QUOTES.map((n) => (
                        <figure
                            key={n}
                            className="flex flex-col rounded-panel bg-surface p-5"
                        >
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
                            <blockquote className="mt-4 flex-1 text-sm text-body">
                                “{t(`landing.stories.q${n}.quote`)}”
                            </blockquote>
                            <p className="mt-3 text-xs font-semibold text-brand">
                                {t(`landing.stories.q${n}.result`)}
                            </p>
                        </figure>
                    ))}
                </div>
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

const AVATARS = [
    "photo-1507003211169-0a1dd7228f2d",
    "photo-1494790108377-be9c29b29330",
    "photo-1472099645785-5658abf4ff4e",
] as const;
