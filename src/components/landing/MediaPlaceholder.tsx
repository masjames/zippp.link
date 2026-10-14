/**
 * Slot for a screenshot or video that is not shipped yet.
 *
 * Drop the real file into `public/landing/` and the page picks it up through
 * `landingAssets()`; until then this renders a dashed box with a label. Use
 * `video` for an mp4 so it renders with controls.
 */
export default function MediaPlaceholder({
    label,
    note,
    src,
    video = false,
    aspect = "aspect-video",
    className = "",
}: {
    label: string;
    note?: string;
    src?: string | null;
    video?: boolean;
    aspect?: string;
    className?: string;
}) {
    if (src) {
        return video ? (
            <video
                src={src}
                controls
                playsInline
                className={`w-full rounded-panel border-2 border-line bg-ink ${className}`}
            />
        ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
                src={src}
                alt={label}
                className={`w-full rounded-panel border-2 border-line bg-card object-cover ${className}`}
            />
        );
    }

    return (
        <div
            className={`flex ${aspect} flex-col items-center justify-center rounded-panel border-2 border-dashed border-line bg-surface p-6 text-center ${className}`}
        >
            <svg
                viewBox="0 0 24 24"
                className="mb-3 h-8 w-8 text-muted"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
            >
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <circle cx="8.5" cy="9.5" r="1.5" />
                <path d="M21 15l-5-5L5 20" />
            </svg>
            <p className="font-semibold text-body">{label}</p>
            {note ? <p className="mt-1 text-xs text-muted">{note}</p> : null}
        </div>
    );
}
