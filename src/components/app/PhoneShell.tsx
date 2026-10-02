import type { ReactNode } from "react";

/**
 * The phone-shaped shell every app screen sits in, mirroring the prototype.
 *
 * Args:
 *     pill: Optional status pill shown next to the logo.
 *     tone: "brand" paints the orange screen (Intro, Capture).
 */
export default function PhoneShell({
    pill,
    tone = "default",
    children,
}: {
    pill?: ReactNode;
    tone?: "default" | "brand";
    children: ReactNode;
}) {
    const brand = tone === "brand";

    return (
        <div
            className={`mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[430px] flex-1 flex-col overflow-hidden sm:min-h-[720px] sm:rounded-phone sm:border-2 sm:border-line ${
                brand ? "bg-brand text-ink" : "bg-card text-body"
            }`}
        >
            <div className="flex items-center justify-between px-6 pb-2 pt-6">
                <span
                    className={`font-head text-2xl font-black tracking-tight ${
                        brand ? "text-ink" : "text-brand"
                    }`}
                >
                    zippp
                </span>
                {pill ? (
                    <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            brand ? "bg-peach text-ink" : "bg-surface text-body"
                        }`}
                    >
                        {pill}
                    </span>
                ) : (
                    <span />
                )}
            </div>
            <div className="flex flex-1 flex-col gap-4 px-6 pb-8 pt-3">
                {children}
            </div>
        </div>
    );
}
