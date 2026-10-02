import { COPY, type Language } from "./copy";

export type { Language };

/**
 * Landing hero with the tagline, short description and call to action.
 *
 * Args:
 *     language: Interface language to render.
 */
export default function Hero({ language }: { language: Language }) {
    const t = COPY[language];

    return (
        <section className="py-20 sm:py-28">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
                <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-gray-900">
                    {t.tagline}
                </h1>
                <p className="mt-6 text-lg sm:text-xl text-gray-600">
                    {t.description}
                </p>
                <a
                    href="/app"
                    className="mt-10 inline-block rounded-lg bg-gray-900 px-8 py-3 font-semibold text-white shadow-sm transition hover:bg-gray-700"
                >
                    {t.cta}
                </a>
            </div>
        </section>
    );
}
