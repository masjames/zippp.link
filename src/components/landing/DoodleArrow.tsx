/** Hand-drawn style arrow for landing emphasis (decorative). */
export default function DoodleArrow({
    className = "",
    label,
}: {
    className?: string;
    label?: string;
}) {
    return (
        <div
            className={`pointer-events-none flex flex-col items-center text-maroon ${className}`}
            aria-hidden
        >
            {label ? (
                <span className="mb-1 rotate-[-6deg] font-head text-xs font-bold tracking-wide">
                    {label}
                </span>
            ) : null}
            <svg width="72" height="48" viewBox="0 0 72 48" fill="none">
                <path
                    d="M6 10c18 2 28 8 38 22"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeDasharray="5 4"
                />
                <path
                    d="M38 28l10 6-12 2"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
        </div>
    );
}
