import Link from "next/link";
import Tetris from "@/components/Tetris";
import { loadWording } from "@/lib/content";
import { getLocale } from "@/lib/server-locale";
import { makeT } from "@/lib/t";

/** Custom 404: a short message and a playable game. */
export default async function NotFound() {
    const wording = loadWording();
    const { lang } = await getLocale();
    const t = makeT(wording, lang);

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-page px-5 py-12 text-center">
            <p className="font-head text-sm font-black tracking-[0.3em] text-brand">
                404
            </p>
            <h1 className="mt-2 font-head text-4xl font-extrabold tracking-tight sm:text-5xl">
                {t("notfound.title")}
            </h1>
            <p className="mt-3 max-w-[46ch] text-muted">
                {t("notfound.body")}
            </p>

            <Tetris
                labels={{
                    play: t("notfound.play"),
                    over: t("notfound.over"),
                    restart: t("notfound.restart"),
                    paused: t("notfound.paused"),
                    resume: t("notfound.resume"),
                    pause: t("notfound.pause"),
                    score: t("notfound.score"),
                    lines: t("notfound.lines"),
                    controls: t("notfound.controls"),
                    left: t("notfound.left"),
                    right: t("notfound.right"),
                    rotate: t("notfound.rotate"),
                    down: t("notfound.down"),
                    drop: t("notfound.drop"),
                }}
            />

            <Link
                href={lang === "id" ? "/id" : "/"}
                className="mt-8 rounded-full bg-btn px-6 py-3 font-semibold text-btntext"
            >
                {t("notfound.home")}
            </Link>
        </div>
    );
}
