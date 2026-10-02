import type { Language } from "@/components/copy";
import { APP_COPY } from "./copy";

/**
 * Screen 04 / Bad Photo. Shown when the photo is unreadable or not a receipt.
 *
 * Args:
 *     language: Interface language.
 *     onRetry: Called when the user taps "Try again".
 */
export default function BadPhotoScreen({
    language,
    onRetry,
}: {
    language: Language;
    onRetry: () => void;
}) {
    const t = APP_COPY[language].badPhoto;
    return (
        <div
            role="alert"
            className="flex min-h-[60vh] flex-col items-center justify-center text-center"
        >
            <p className="text-2xl font-semibold text-gray-900 sm:text-3xl">
                {t.title}
            </p>
            <p className="mt-2 text-sm text-gray-500 sm:text-base">{t.hint}</p>
            <button
                type="button"
                onClick={onRetry}
                className="mt-8 w-full rounded-xl bg-gray-900 px-6 py-3 font-medium text-white hover:bg-gray-700 sm:w-auto"
            >
                {t.retry}
            </button>
        </div>
    );
}
