import type { T } from "@/lib/t";

/** Rich phone mock for the hero: never shows "coming soon". */
export default function HeroPhone({ t }: { t: T }) {
    return (
        <div className="relative mx-auto w-full max-w-[280px]">
            <div className="overflow-hidden rounded-[32px] border-[3px] border-ink bg-card shadow-[0_18px_40px_rgba(28,11,9,0.22)]">
                <div className="flex items-center justify-between bg-maroon px-4 py-2.5 text-[11px] font-semibold text-white">
                    <span>zippp</span>
                    <span className="opacity-80">12 credits</span>
                </div>
                <div className="bg-page px-3 pb-4 pt-3">
                    <div className="relative overflow-hidden rounded-2xl border-2 border-line bg-[#2a1612]">
                        <div className="flex h-44 flex-col items-center justify-center gap-2 px-4">
                            <div className="h-28 w-[72%] rounded-lg border-2 border-dashed border-brand/70 bg-brand/20" />
                            <p className="text-center text-[10px] font-semibold text-peach">
                                {t("landing.flow.snapCue")}
                            </p>
                        </div>
                        <div className="absolute inset-x-0 bottom-3 flex justify-center">
                            <span className="h-11 w-11 rounded-full border-4 border-white/80 bg-maroon" />
                        </div>
                    </div>
                    <div className="mt-3 space-y-2">
                        <div className="rounded-xl border-2 border-amber-400/80 bg-amber-50 px-3 py-2">
                            <p className="text-[10px] font-semibold text-muted">
                                {t("landing.flow.merchant")}
                            </p>
                            <p className="text-xs font-bold text-body">
                                Pasar Induk
                            </p>
                        </div>
                        <div className="flex items-center justify-between rounded-xl border border-line bg-card px-3 py-2">
                            <div>
                                <p className="text-[10px] text-muted">
                                    {t("landing.flow.total")}
                                </p>
                                <p className="text-xs font-bold">Rp 115.000</p>
                            </div>
                            <span className="rounded-lg bg-maroon px-3 py-1.5 text-[10px] font-semibold text-white">
                                {t("landing.flow.accept")}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
