"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Camera, Check } from "lucide-react";
import type { T } from "@/lib/t";

type Phase = "snap" | "check" | "fly" | "sheet";

const PHASES: Phase[] = ["snap", "check", "fly", "sheet"];
const DWELL_MS = 1400;

/**
 * Hero visual: loops snap → check → row flies into Google Sheets.
 */
export default function HeroSnapSheet({ t }: { t: T }) {
    const [phase, setPhase] = useState<Phase>("snap");

    useEffect(() => {
        const i = setInterval(() => {
            setPhase((p) => PHASES[(PHASES.indexOf(p) + 1) % PHASES.length]);
        }, DWELL_MS);
        return () => clearInterval(i);
    }, []);

    const step =
        phase === "snap" ? 0 : phase === "check" ? 1 : phase === "fly" ? 2 : 3;

    return (
        <div className="relative mx-auto w-full max-w-[340px]">
            <div className="mb-3 flex items-center justify-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-maroon/80">
                <span className={step >= 0 ? "text-maroon" : "opacity-40"}>
                    {t("landing.how.snap.title")}
                </span>
                <ArrowRight className="h-3.5 w-3.5 opacity-50" aria-hidden />
                <span className={step >= 1 ? "text-maroon" : "opacity-40"}>
                    {t("landing.how.check.title")}
                </span>
                <ArrowRight className="h-3.5 w-3.5 opacity-50" aria-hidden />
                <span className={step >= 2 ? "text-maroon" : "opacity-40"}>
                    {t("landing.how.send.title")}
                </span>
            </div>

            <div className="relative flex items-end justify-center gap-3">
                <div
                    className={`w-[46%] shrink-0 transition-all duration-500 ${
                        phase === "sheet"
                            ? "scale-90 opacity-55"
                            : "scale-100 opacity-100"
                    }`}
                >
                    <div className="overflow-hidden rounded-[26px] border-[3px] border-ink bg-card shadow-[0_14px_32px_rgba(28,11,9,0.2)]">
                        <div className="flex items-center justify-between bg-maroon px-3 py-2 text-[10px] font-semibold text-white">
                            <span>zippp</span>
                            <Camera className="h-3.5 w-3.5 opacity-80" />
                        </div>
                        <div className="bg-page px-2.5 pb-3 pt-2">
                            <div className="relative overflow-hidden rounded-xl border-2 border-line bg-[#2a1612]">
                                <div className="flex h-28 flex-col items-center justify-center gap-1.5 px-3">
                                    <div
                                        className={`h-16 w-[70%] rounded-md border-2 border-dashed border-brand/70 bg-brand/25 transition-all duration-400 ${
                                            phase === "snap"
                                                ? "hero-pulse scale-100"
                                                : "scale-95 opacity-70"
                                        }`}
                                    />
                                    <p className="text-center text-[9px] font-semibold text-peach">
                                        {t("landing.flow.snapCue")}
                                    </p>
                                </div>
                                {(phase === "snap" || phase === "check") && (
                                    <div className="absolute inset-x-0 bottom-2 flex justify-center">
                                        <span
                                            className={`h-8 w-8 rounded-full border-[3px] border-white/80 bg-maroon ${
                                                phase === "snap"
                                                    ? "hero-shutter"
                                                    : ""
                                            }`}
                                        />
                                    </div>
                                )}
                            </div>
                            <div
                                className={`mt-2 space-y-1.5 transition-all duration-400 ${
                                    phase === "check" || phase === "fly"
                                        ? "opacity-100"
                                        : "opacity-40"
                                }`}
                            >
                                <div className="rounded-lg border border-amber-400/80 bg-amber-50 px-2 py-1.5">
                                    <p className="text-[9px] font-semibold text-muted">
                                        {t("landing.flow.merchant")}
                                    </p>
                                    <p className="text-[10px] font-bold text-body">
                                        Pasar Induk
                                    </p>
                                </div>
                                <div className="flex items-center justify-between rounded-lg border border-line bg-card px-2 py-1.5">
                                    <p className="text-[10px] font-bold">
                                        Rp 115.000
                                    </p>
                                    <span
                                        className={`inline-flex items-center gap-0.5 rounded-md bg-maroon px-2 py-1 text-[9px] font-semibold text-white ${
                                            phase === "check"
                                                ? "hero-pulse"
                                                : ""
                                        }`}
                                    >
                                        <Check className="h-3 w-3" />
                                        {t("landing.flow.accept")}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div
                    className={`pointer-events-none absolute left-1/2 top-[42%] z-20 -translate-x-1/2 ${
                        phase === "fly" ? "hero-row-fly" : "invisible"
                    }`}
                    aria-hidden
                >
                    <div className="rounded-md border-2 border-brand bg-white px-2 py-1 text-[9px] font-bold shadow-md">
                        Pasar · 115k
                    </div>
                </div>

                <div
                    className={`w-[52%] shrink-0 transition-all duration-500 ${
                        phase === "sheet" || phase === "fly"
                            ? "scale-100 opacity-100"
                            : "scale-95 opacity-70"
                    }`}
                >
                    <div className="overflow-hidden rounded-xl border-2 border-line bg-[#f8f9fa] shadow-[0_14px_32px_rgba(28,11,9,0.16)]">
                        <div className="flex items-center gap-1.5 border-b border-line bg-white px-2 py-1.5">
                            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#0F9D58]" />
                            <span className="truncate text-[9px] font-semibold text-body">
                                Google Sheets
                            </span>
                        </div>
                        <div className="border-b border-line bg-[#e8f0fe] px-2 py-1">
                            <span className="rounded bg-white px-2 py-0.5 text-[9px] font-semibold shadow-sm">
                                2026-10
                            </span>
                        </div>
                        <table className="w-full border-collapse text-left text-[8px]">
                            <thead>
                                <tr className="bg-[#f3f3f3]">
                                    {["Date", "Item", "Amt"].map((h) => (
                                        <th
                                            key={h}
                                            className="border border-line px-1 py-1 font-semibold"
                                        >
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="bg-white">
                                    <td className="border border-line px-1 py-1">
                                        10-12
                                    </td>
                                    <td className="border border-line px-1 py-1">
                                        Cabai
                                    </td>
                                    <td className="border border-line px-1 py-1">
                                        40k
                                    </td>
                                </tr>
                                <tr
                                    className={`bg-brand/15 ${
                                        phase === "sheet"
                                            ? "hero-row-land"
                                            : phase === "fly"
                                              ? "opacity-30"
                                              : "opacity-0"
                                    }`}
                                >
                                    <td className="border border-line px-1 py-1 font-semibold">
                                        10-13
                                    </td>
                                    <td className="border border-line px-1 py-1 font-semibold">
                                        Bawang
                                    </td>
                                    <td className="border border-line px-1 py-1 font-semibold">
                                        75k
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                        <p
                            className={`border-t border-line bg-white px-2 py-1.5 text-[9px] font-semibold text-[#0F9D58] transition-opacity duration-300 ${
                                phase === "sheet" ? "opacity-100" : "opacity-0"
                            }`}
                        >
                            {t("landing.flow.sent")}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
