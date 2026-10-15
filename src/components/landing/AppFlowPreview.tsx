import type { T } from "@/lib/t";

const STEPS = ["snap", "check", "send"] as const;

/** Three phone-frame mockups of the zippp app flow for landing proof. */
export default function AppFlowPreview({ t }: { t: T }) {
    return (
        <div className="grid gap-6 sm:grid-cols-3">
            {STEPS.map((step, i) => (
                <div key={step} className="relative flex flex-col items-center">
                    <div className="w-full max-w-[200px] overflow-hidden rounded-[28px] border-[3px] border-ink bg-card shadow-md">
                        <div className="bg-maroon px-3 py-2 text-center text-[10px] font-semibold text-white">
                            zippp · {t(`landing.how.${step}.title`)}
                        </div>
                        <div className="min-h-[220px] bg-page p-3">
                            {step === "snap" ? <SnapMock t={t} /> : null}
                            {step === "check" ? <CheckMock t={t} /> : null}
                            {step === "send" ? <SendMock t={t} /> : null}
                        </div>
                    </div>
                    <p className="mt-3 text-center text-sm font-semibold text-body">
                        <span className="text-brand">{i + 1}. </span>
                        {t(`landing.how.${step}.title`)}
                    </p>
                    <p className="mt-1 max-w-[22ch] text-center text-xs text-muted">
                        {t(`landing.how.${step}.body`)}
                    </p>
                </div>
            ))}
        </div>
    );
}

function SnapMock({ t }: { t: T }) {
    return (
        <div className="flex h-full flex-col items-center justify-center gap-3">
            <div className="flex h-36 w-full items-center justify-center rounded-line border-2 border-dashed border-brand bg-peach/50">
                <span className="text-xs font-bold text-maroon">
                    {t("landing.flow.snapCue")}
                </span>
            </div>
            <div className="h-10 w-10 rounded-full bg-maroon" />
        </div>
    );
}

function CheckMock({ t }: { t: T }) {
    return (
        <div className="space-y-2 text-left">
            <div className="rounded-line border-2 border-amber-400 bg-amber-50 px-2 py-1.5">
                <p className="text-[10px] font-semibold text-muted">
                    {t("landing.flow.merchant")}
                </p>
                <p className="text-xs font-bold text-body">Pasar Induk</p>
            </div>
            <div className="rounded-line border border-line bg-card px-2 py-1.5">
                <p className="text-[10px] text-muted">
                    {t("landing.flow.total")}
                </p>
                <p className="text-xs font-bold">Rp 115.000</p>
            </div>
            <div className="rounded-line bg-maroon py-2 text-center text-[10px] font-semibold text-white">
                {t("landing.flow.accept")}
            </div>
        </div>
    );
}

function SendMock({ t }: { t: T }) {
    return (
        <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0F9D58] text-lg font-black text-white">
                ✓
            </div>
            <p className="text-xs font-bold text-body">
                {t("landing.flow.sent")}
            </p>
            <p className="text-[10px] text-muted">
                {t("landing.flow.sentHint")}
            </p>
        </div>
    );
}
