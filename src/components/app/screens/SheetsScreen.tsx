import PhoneShell from "../PhoneShell";
import type { T } from "@/lib/t";

export type SheetCandidate = {
    id: string;
    name: string;
    modifiedTime: string;
};

/** Sheet preparation: connecting, pick-one, or error. */
export default function SheetsScreen({
    t,
    busy,
    error,
    candidates,
    onPick,
    onRetry,
}: {
    t: T;
    busy: boolean;
    error: boolean;
    candidates: SheetCandidate[];
    onPick: (id: string) => void;
    onRetry: () => void;
}) {
    if (candidates.length > 0) {
        return (
            <PhoneShell>
                <h2 className="mt-2 font-head text-3xl font-extrabold leading-none">
                    {t("app.sheets.title")}
                </h2>
                <p className="text-muted">{t("app.sheets.body")}</p>
                <div className="mt-2 grid gap-2">
                    {candidates.map((c) => (
                        <button
                            key={c.id}
                            type="button"
                            disabled={busy}
                            onClick={() => onPick(c.id)}
                            className="rounded-2xl border-2 border-line bg-card px-4 py-3 text-left disabled:opacity-60"
                        >
                            <span className="block font-semibold">{c.name}</span>
                            <span className="block text-xs text-muted">
                                {new Date(c.modifiedTime).toLocaleDateString()}
                            </span>
                        </button>
                    ))}
                </div>
            </PhoneShell>
        );
    }

    if (error) {
        return (
            <PhoneShell>
                <div className="flex flex-1 flex-col items-center justify-center text-center">
                    <p className="text-2xl font-semibold">
                        {t("app.sheets.error")}
                    </p>
                    <button
                        type="button"
                        onClick={onRetry}
                        className="mt-8 w-full rounded-full bg-btn px-6 py-4 font-semibold text-btntext"
                    >
                        {t("app.sheets.retry")}
                    </button>
                </div>
            </PhoneShell>
        );
    }

    return (
        <PhoneShell>
            <div className="flex flex-1 flex-col items-center justify-center text-center">
                <div
                    className="h-10 w-10 animate-spin rounded-full border-4 border-line border-t-brand"
                    aria-hidden
                />
                <p className="mt-6 text-lg text-muted">
                    {t("app.sheets.connecting")}
                </p>
            </div>
        </PhoneShell>
    );
}
