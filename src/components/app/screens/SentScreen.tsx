import PhoneShell from "../PhoneShell";
import { fill, type T } from "@/lib/t";

/** Screen 05 / Sent. Rows are in the sheet. */
export default function SentScreen({
    t,
    count,
    merchant,
    total,
    sheetUrl,
    onAgain,
}: {
    t: T;
    count: number;
    merchant: string;
    total: string;
    sheetUrl: string | null;
    onAgain: () => void;
}) {
    return (
        <PhoneShell>
            <div className="mt-7 flex h-[84px] w-[84px] items-center justify-center rounded-full bg-brand">
                <span className="h-[17px] w-[34px] -rotate-45 border-b-[7px] border-l-[7px] border-white" />
            </div>
            <h2 className="mt-4 font-head text-3xl font-extrabold leading-none">
                {fill(t("app.sent.title"), { count })}{" "}
                <span className="text-accent">{t("app.sent.title2")}</span>
            </h2>
            <p className="text-muted">
                {fill(t("app.sent.body"), { merchant, total })}
            </p>
            <div className="rounded-2xl bg-surface px-4 py-3 text-sm">
                {t("app.sent.note")}
            </div>
            <div className="mt-auto grid gap-3">
                {sheetUrl ? (
                    <a
                        href={sheetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full bg-btn px-6 py-4 text-center font-semibold text-btntext"
                    >
                        {t("app.sent.open")}
                    </a>
                ) : null}
                <button
                    type="button"
                    onClick={onAgain}
                    className="rounded-full bg-mist px-6 py-4 font-semibold text-ink"
                >
                    {t("app.sent.again")}
                </button>
            </div>
        </PhoneShell>
    );
}
