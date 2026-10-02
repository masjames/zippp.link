import PhoneShell from "../PhoneShell";
import type { T } from "@/lib/t";

/** Unreadable photo. */
export default function BadPhotoScreen({
    t,
    onRetry,
}: {
    t: T;
    onRetry: () => void;
}) {
    return (
        <PhoneShell>
            <div className="flex flex-1 flex-col items-center justify-center text-center">
                <p className="text-2xl font-semibold">{t("app.bad.title")}</p>
                <p className="mt-2 text-sm text-muted">{t("app.bad.body")}</p>
                <button
                    type="button"
                    onClick={onRetry}
                    className="mt-8 w-full rounded-full bg-btn px-6 py-4 font-semibold text-btntext"
                >
                    {t("app.bad.retry")}
                </button>
            </div>
        </PhoneShell>
    );
}
