"use client";

import { useRef } from "react";
import PhoneShell from "../PhoneShell";
import type { T } from "@/lib/t";

function Corners() {
    const base = "pointer-events-none absolute h-9 w-9 border-4 border-white";
    return (
        <>
            <span className={`${base} left-4 top-4 rounded-tl-xl border-b-0 border-r-0`} />
            <span className={`${base} right-4 top-4 rounded-tr-xl border-b-0 border-l-0`} />
            <span className={`${base} bottom-4 left-4 rounded-bl-xl border-t-0 border-r-0`} />
            <span className={`${base} bottom-4 right-4 rounded-br-xl border-t-0 border-l-0`} />
        </>
    );
}

/** Screen 03 / Capture. Camera or upload. */
export default function CaptureScreen({
    t,
    pill,
    onFile,
}: {
    t: T;
    pill?: string;
    onFile: (file: File) => void;
}) {
    const inputRef = useRef<HTMLInputElement>(null);

    function pick(files: FileList | null) {
        const file = files?.[0];
        if (file) onFile(file);
    }

    return (
        <PhoneShell tone="brand" pill={pill}>
            <h2 className="mt-2 font-head text-3xl font-extrabold leading-none">
                {t("app.capture.title")}
            </h2>
            <p className="max-w-[30ch]">{t("app.capture.body")}</p>

            <div className="relative flex min-h-[250px] flex-1 items-center justify-center rounded-panel bg-[#2a1410] px-6 text-center text-peach">
                <span className="text-sm">{t("app.capture.frame")}</span>
                <Corners />
            </div>

            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                    pick(e.target.files);
                    e.target.value = "";
                }}
            />

            <button
                type="button"
                aria-label={t("app.capture.shutter")}
                onClick={() => inputRef.current?.click()}
                className="mx-auto mt-1 block h-[84px] w-[84px] rounded-full border-[6px] border-maroon bg-white"
            />
            <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="text-center font-medium text-ink underline underline-offset-4"
            >
                {t("app.capture.upload")}
            </button>
        </PhoneShell>
    );
}
