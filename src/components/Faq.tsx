import { COPY, type Language } from "./copy";

/**
 * FAQ section using native disclosure elements.
 *
 * Args:
 *     language: Interface language to render.
 */
export default function Faq({ language }: { language: Language }) {
    const t = COPY[language];

    return (
        <section className="py-16">
            <div className="max-w-3xl mx-auto px-4 sm:px-6">
                <h2 className="text-3xl font-bold text-gray-900 text-center">
                    {t.faqTitle}
                </h2>
                <div className="mt-10 divide-y divide-gray-200 border-y border-gray-200">
                    {t.faq.map((item) => (
                        <details key={item.q} className="group py-5">
                            <summary className="flex cursor-pointer list-none items-center justify-between font-semibold text-gray-900">
                                {item.q}
                                <span className="ml-4 text-gray-400 transition group-open:rotate-45">
                                    +
                                </span>
                            </summary>
                            <p className="mt-3 text-gray-600">{item.a}</p>
                        </details>
                    ))}
                </div>
            </div>
        </section>
    );
}
