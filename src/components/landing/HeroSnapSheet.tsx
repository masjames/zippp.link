"use client";

import { useEffect, useState } from "react";
import { Camera, Check } from "lucide-react";
import type { T } from "@/lib/t";

type Phase = "snap" | "check" | "sheet";

const PHASES: Phase[] = ["snap", "check", "sheet"];
const DWELL_MS = 2200;

/**
 * Hero visual: one full-size stage at a time — snap → check → Sheets.
 */
export default function HeroSnapSheet({ t }: { t: T }) {
    const [phase, setPhase] = useState<Phase>("snap");

    useEffect(() => {
        const i = setInterval(() => {
            setPhase((p) => PHASES[(PHASES.indexOf(p) + 1) % PHASES.length]);
        }, DWELL_MS);
        return () => clearInterval(i);
    }, []);

    return (
        <div className="relative mx-auto w-full max-w-[300px] sm:max-w-[320px]">
            <div className="mb-4 flex items-center justify-center gap-2">
                {PHASES.map((p) => {
                    const active = phase === p;
                    const label =
                        p === "snap"
                            ? t("landing.how.snap.title")
                            : p === "check"
                              ? t("landing.how.check.title")
                              : t("landing.how.send.title");
                    return (
                        <span
                            key={p}
                            className={`rounded-full px-3 py-1 text-xs font-semibold transition-all duration-300 ${
                                active
                                    ? "bg-maroon text-white"
                                    : "bg-peach/70 text-maroon/50"
                            }`}
                        >
                            {label}
                        </span>
                    );
                })}
            </div>

            <div className="relative min-h-[420px]">
                <div
                    className={`absolute inset-0 transition-all duration-500 ${
                        phase === "snap"
                            ? "z-10 translate-y-0 opacity-100"
                            : "z-0 translate-y-3 opacity-0 pointer-events-none"
                    }`}
                >
                    <PhoneShell>
                        <div className="relative overflow-hidden rounded-2xl border-2 border-line bg-[#2a1612]">
                            <div className="flex h-56 flex-col items-center justify-center gap-3 px-5">
                                <div className="hero-pulse h-36 w-[78%] rounded-xl border-2 border-dashed border-brand/70 bg-brand/25" />
                                <p className="text-center text-sm font-semibold text-peach">
                                    {t("landing.flow.snapCue")}
                                </p>
                            </div>
                            <div className="absolute inset-x-0 bottom-4 flex justify-center">
                                <span className="hero-shutter h-14 w-14 rounded-full border-4 border-white/85 bg-maroon" />
                            </div>
                        </div>
                        <p className="mt-3 flex items-center justify-center gap-1.5 text-xs font-semibold text-muted">
                            <Camera className="h-3.5 w-3.5" />
                            {t("landing.how.snap.body")}
                        </p>
                    </PhoneShell>
                </div>

                <div
                    className={`absolute inset-0 transition-all duration-500 ${
                        phase === "check"
                            ? "z-10 translate-y-0 opacity-100"
                            : "z-0 translate-y-3 opacity-0 pointer-events-none"
                    }`}
                >
                    <PhoneShell>
                        <div className="overflow-hidden rounded-2xl border-2 border-line bg-[#2a1612]">
                            <div className="flex h-36 items-center justify-center px-4">
                                <div className="h-24 w-[72%] rounded-lg border-2 border-brand/50 bg-brand/20" />
                            </div>
                        </div>
                        <div className="mt-3 space-y-2.5">
                            <div className="rounded-xl border-2 border-amber-400/80 bg-amber-50 px-4 py-3">
                                <p className="text-xs font-semibold text-muted">
                                    {t("landing.flow.merchant")}
                                </p>
                                <p className="text-base font-bold text-body">
                                    Pasar Induk
                                </p>
                            </div>
                            <div className="flex items-center justify-between rounded-xl border-2 border-line bg-card px-4 py-3">
                                <div>
                                    <p className="text-xs text-muted">
                                        {t("landing.flow.total")}
                                    </p>
                                    <p className="text-base font-bold">
                                        Rp 115.000
                                    </p>
                                </div>
                                <span className="hero-pulse inline-flex items-center gap-1 rounded-lg bg-maroon px-4 py-2.5 text-sm font-semibold text-white">
                                    <Check className="h-4 w-4" />
                                    {t("landing.flow.accept")}
                                </span>
                            </div>
                        </div>
                    </PhoneShell>
                </div>

                <div
                    className={`absolute inset-0 transition-all duration-500 ${
                        phase === "sheet"
                            ? "z-10 translate-y-0 opacity-100"
                            : "z-0 translate-y-3 opacity-0 pointer-events-none"
                    }`}
                >
                    <div className="overflow-hidden rounded-2xl border-[3px] border-line bg-[#f8f9fa] shadow-[0_18px_40px_rgba(28,11,9,0.2)]">
                        <div className="flex items-center gap-2 border-b border-line bg-white px-4 py-3">
                            <span className="inline-block h-3.5 w-3.5 rounded-full bg-[#0F9D58]" />
                            <span className="truncate text-sm font-semibold text-body">
                                [zippp] Resto inventory
                            </span>
                        </div>
                        <div className="border-b border-line bg-[#e8f0fe] px-3 py-2">
                            <span className="rounded-t bg-white px-3 py-1 text-xs font-semibold shadow-sm">
                                2026-10
                            </span>
                        </div>
                        <table className="w-full border-collapse text-left text-xs">
                            <thead>
                                <tr className="bg-[#f3f3f3]">
                                    {["Date", "Supplier", "Item", "Amt"].map(
                                        (h) => (
                                            <th
                                                key={h}
                                                className="border border-line px-2 py-2 font-semibold"
                                            >
                                                {h}
                                            </th>
                                        )
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="bg-white">
                                    <td className="border border-line px-2 py-2">
                                        10-12
                                    </td>
                                    <td className="border border-line px-2 py-2">
                                        Pasar
                                    </td>
                                    <td className="border border-line px-2 py-2">
                                        Cabai
                                    </td>
                                    <td className="border border-line px-2 py-2">
                                        40k
                                    </td>
                                </tr>
                                <tr className="hero-row-land bg-brand/15">
                                    <td className="border border-line px-2 py-2 font-semibold">
                                        10-13
                                    </td>
                                    <td className="border border-line px-2 py-2 font-semibold">
                                        Pasar
                                    </td>
                                    <td className="border border-line px-2 py-2 font-semibold">
                                        Bawang
                                    </td>
                                    <td className="border border-line px-2 py-2 font-semibold">
                                        75k
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                        <p className="border-t border-line bg-white px-4 py-3 text-sm font-semibold text-[#0F9D58]">
                            {t("landing.flow.sent")}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function PhoneShell({ children }: { children: React.ReactNode }) {
    return (
        <div className="overflow-hidden rounded-[32px] border-[3px] border-ink bg-card shadow-[0_18px_40px_rgba(28,11,9,0.22)]">
            <div className="flex items-center justify-between bg-maroon px-4 py-2.5 text-xs font-semibold text-white">
                <span>zippp</span>
                <span className="opacity-80">12 credits</span>
            </div>
            <div className="bg-page px-3 pb-4 pt-3">{children}</div>
        </div>
    );
}
