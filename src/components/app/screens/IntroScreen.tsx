import PhoneShell from "../PhoneShell";
import type { T } from "@/lib/t";

/** Screen 01 / Intro. */
export default function IntroScreen({
    t,
    onStart,
}: {
    t: T;
    onStart: () => void;
}) {
    return (
        <PhoneShell tone="brand">
            <h2 className="mt-2 font-head text-4xl font-extrabold leading-none">
                {t("app.intro.title")}
            </h2>
            <p className="max-w-[30ch]">{t("app.intro.body")}</p>
            <ul className="mt-2 grid gap-3">
                {(["b1", "b2", "b3"] as const).map((key) => (
                    <li
                        key={key}
                        className="rounded-2xl bg-peach px-4 py-3 font-medium"
                    >
                        {t(`app.intro.${key}`)}
                    </li>
                ))}
            </ul>
            <div className="mt-auto grid gap-4">
                <div className="flex justify-center gap-2" aria-hidden>
                    <i className="h-2 w-6 rounded-full bg-ink" />
                    <i className="h-2 w-2 rounded-full bg-ink opacity-30" />
                </div>
                <button
                    type="button"
                    onClick={onStart}
                    className="rounded-full bg-maroon px-6 py-4 font-semibold text-white"
                >
                    {t("app.intro.cta")}
                </button>
            </div>
        </PhoneShell>
    );
}
