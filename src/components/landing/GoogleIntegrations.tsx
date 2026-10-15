import type { T } from "@/lib/t";

/** Product-color icons + labels: zippp writes to Sheets; proof can land in Drive. */
export default function GoogleIntegrations({ t }: { t: T }) {
    return (
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <p className="w-full text-sm font-semibold text-muted sm:w-auto">
                {t("landing.integrations.label")}
            </p>
            <div className="flex items-center gap-2 rounded-panel bg-card px-4 py-2.5 shadow-sm ring-1 ring-line">
                <SheetsIcon />
                <span className="text-sm font-semibold text-body">
                    {t("landing.integrations.sheets")}
                </span>
            </div>
            <div className="flex items-center gap-2 rounded-panel bg-card px-4 py-2.5 shadow-sm ring-1 ring-line">
                <DriveIcon />
                <span className="text-sm font-semibold text-body">
                    {t("landing.integrations.drive")}
                </span>
            </div>
        </div>
    );
}

function SheetsIcon() {
    return (
        <svg width="28" height="28" viewBox="0 0 48 48" aria-hidden>
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
        <svg width="28" height="28" viewBox="0 0 48 48" aria-hidden>
            <path fill="#FFC107" d="M17.2 8h13.6L44 32H30.4z" />
            <path fill="#2196F3" d="M4 32 17.2 8l6.8 12L10.8 44z" />
            <path fill="#4CAF50" d="M10.8 44h26.4L44 32H17.6z" />
        </svg>
    );
}
