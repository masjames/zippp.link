import PhoneShell from "../PhoneShell";
import type { T } from "@/lib/t";

/** Busy state while /api/extract runs. */
export default function ReadingScreen({ t }: { t: T }) {
    return (
        <PhoneShell tone="brand">
            <div className="flex flex-1 flex-col items-center justify-center text-center">
                <div
                    className="h-10 w-10 animate-spin rounded-full border-4 border-[#00000033] border-t-ink"
                    aria-hidden
                />
                <p className="mt-6 text-2xl font-semibold">
                    {t("app.reading.title")}
                </p>
                <p className="mt-1 text-sm opacity-80">{t("app.reading.body")}</p>
            </div>
        </PhoneShell>
    );
}
