import type { T } from "@/lib/t";

/** One grey row: Terintegrasi dengan · Sheets · Drive. */
export default function GoogleIntegrations({ t }: { t: T }) {
    return (
        <div className="inline-flex max-w-full items-center gap-3 overflow-x-auto rounded-full bg-[#e8e4e0] px-4 py-2.5 text-sm font-semibold text-body">
            <span className="shrink-0 text-muted">
                {t("landing.integrations.label")}
            </span>
            <span className="inline-flex shrink-0 items-center gap-1.5">
                <SheetsIcon />
                {t("landing.integrations.sheets")}
            </span>
            <span className="inline-flex shrink-0 items-center gap-1.5">
                <DriveIcon />
                {t("landing.integrations.drive")}
            </span>
        </div>
    );
}

function SheetsIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
            <path
                fill="#0F9D58"
                d="M8 4h22l10 10v30a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4z"
            />
            <path fill="#87CEAC" d="M30 4v10h10z" />
            <path fill="#fff" d="M14 20h20v4H14zm0 8h20v4H14zm0 8h12v4H14z" />
        </svg>
    );
}

function DriveIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
            <path fill="#FFC107" d="M17.2 8h13.6L44 32H30.4z" />
            <path fill="#2196F3" d="M4 32 17.2 8l6.8 12L10.8 44z" />
            <path fill="#4CAF50" d="M10.8 44h26.4L44 32H17.6z" />
        </svg>
    );
}
