import type { ReactNode } from "react";

/**
 * The phone-shaped shell every app screen sits in, mirroring the prototype.
 *
 * Args:
 *     pill: Optional status pill shown next to the logo.
 *     pillAction: When set, the pill is a button (a quick sheet selector).
 *     tone: "brand" paints the orange screen (Intro, Capture).
 */
export default function PhoneShell({
    pill,
    pillAction,
    tone = "default",
    children,
}: {
    pill?: ReactNode;
    pillAction?: () => void;
    tone?: "default" | "brand";
    children: ReactNode;
}) {
    const brand = tone === "brand";
    const pillClass = pillAction
        ? "flex max-w-[190px] items-center gap-1 rounded-lg border-2 border-line bg-card px-2.5 py-1 text-xs font-semibold text-body"
        : `rounded-full px-3 py-1 text-xs font-semibold ${
              brand ? "bg-peach text-ink" : "bg-surface text-body"
          }`;

    return (
        <div
            className={`mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-[430px] flex-1 flex-col overflow-hidden sm:min-h-[720px] sm:rounded-phone sm:border-2 sm:border-line ${
                brand ? "bg-brand text-ink" : "bg-card text-body"
            }`}
        >
            <div className="flex items-center justify-between px-6 pb-2 pt-3">
                <span
                    className={`font-head text-2xl font-black tracking-tight ${
                        brand ? "text-ink" : "text-brand"
                    }`}
                >
                    zippp
                </span>
                {pill ? (
                    pillAction ? (
                        <button type="button" onClick={pillAction} className={pillClass}>
                            <span className="truncate">{pill}</span>
                            <svg
                                viewBox="0 0 24 24"
                                className="h-3.5 w-3.5 flex-none"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden
                            >
                                <path d="M6 9l6 6 6-6" />
                            </svg>
                        </button>
                    ) : (
                        <span className={pillClass}>{pill}</span>
                    )
                ) : (
                    <span />
                )}
            </div>
            <div className="flex flex-1 flex-col gap-4 px-6 pb-12 pt-2">
                {children}
            </div>
        </div>
    );
}
