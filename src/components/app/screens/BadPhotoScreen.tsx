import PhoneShell from "../PhoneShell";
import DebugPanel from "../DebugPanel";
import type { T } from "@/lib/t";
import type { ExtractDebug } from "@/types/receipt";

/** Unreadable photo, with the full extraction trace expanded. */
export default function BadPhotoScreen({
    t,
    onRetry,
    debug,
}: {
    t: T;
    onRetry: () => void;
    debug?: ExtractDebug | null;
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
            <DebugPanel debug={debug} defaultOpen />
        </PhoneShell>
    );
}
