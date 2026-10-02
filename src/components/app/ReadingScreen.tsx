import type { Language } from "@/components/copy";
import { APP_COPY } from "./copy";

/**
 * Screen 02 / Reading. Shown while the extraction request is in flight.
 *
 * Args:
 *     language: Interface language.
 */
export default function ReadingScreen({ language }: { language: Language }) {
    const t = APP_COPY[language].reading;
    return (
        <div
            role="status"
            aria-live="polite"
            className="flex min-h-[60vh] flex-col items-center justify-center text-center"
        >
            <div className="mb-6 h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" aria-hidden="true" />
            <div className="mb-4 w-2 h-3 bg-gray-900" />
            <div className="mb-2 h-1 w-1 bg-gray-900 rounded-full" />
            <p className="text-2xl font-semibold text-gray-900 sm:text-3xl">
                {t.title}
            </p>
            <p className="mt-2 text-sm text-gray-500 sm:text-base">{t.hint}</p>
        </div>
    );
}
