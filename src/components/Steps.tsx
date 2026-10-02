import { COPY, type Language } from "./copy";

/**
 * Three-step process section.
 *
 * Args:
 *     language: Interface language to render.
 */
export default function Steps({ language }: { language: Language }) {
    const t = COPY[language];

    return (
        <section className="py-16 bg-gray-50">
            <div className="max-w-5xl mx-auto px-4 sm:px-6">
                <h2 className="text-3xl font-bold text-gray-900 text-center">
                    {t.stepsTitle}
                </h2>
                <ol className="mt-12 grid gap-6 md:grid-cols-3">
                    {t.steps.map((step, i) => (
                        <li
                            key={step.title}
                            className="rounded-lg bg-white p-6 shadow-sm border border-gray-200"
                        >
                            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-900 font-bold text-white">
                                {i + 1}
                            </span>
                            <h3 className="mt-4 text-lg font-semibold text-gray-900">
                                {step.title}
                            </h3>
                            <p className="mt-2 text-gray-600">{step.body}</p>
                        </li>
                    ))}
                </ol>
            </div>
        </section>
    );
}
