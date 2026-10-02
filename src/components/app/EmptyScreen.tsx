"use client";

import { useRef, useState } from "react";
import type { Language } from "@/components/copy";
import { APP_COPY } from "./copy";

/**
 * Screen 01 / Empty. Drop a receipt, or tap to open the camera / file picker.
 *
 * Args:
 *     language: Interface language.
 *     onFile: Called with the chosen image file.
 */
export default function EmptyScreen({
    language,
    onFile,
}: {
    language: Language;
    onFile: (file: File) => void;
}) {
    const t = APP_COPY[language];
    const inputRef = useRef<HTMLInputElement>(null);
    const [over, setOver] = useState(false);

    function pick(files: FileList | null) {
        const file = files?.[0];
        if (file) onFile(file);
    }

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    inputRef.current?.click();
                }
            }}
            onDragOver={(e) => {
                e.preventDefault();
                setOver(true);
            }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => {
                e.preventDefault();
                setOver(false);
                pick(e.dataTransfer.files);
            }}
            className={`flex min-h-[60vh] w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 ${
                over ? "border-gray-900 bg-gray-100" : "border-gray-300 bg-white"
            }`}
        >
            <p className="text-2xl font-semibold text-gray-900 sm:text-3xl">
                {t.empty.main}
            </p>
            <p className="mt-2 text-sm text-gray-500 sm:text-base">
                {t.empty.hint}
            </p>
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
        </div>
    );
}
