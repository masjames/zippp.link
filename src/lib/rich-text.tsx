import type { ReactNode } from "react";

/**
 * Render wording with *emphasis* — bold + cuanlagi-style wavy underline.
 * Example: "Untuk yang masih *merekap manual*"
 */
export function RichText({
    text,
    className,
}: {
    text: string;
    className?: string;
}): ReactNode {
    const parts = text.split(/(\*[^*]+\*)/g);
    return (
        <span className={className}>
            {parts.map((part, i) => {
                if (
                    part.startsWith("*") &&
                    part.endsWith("*") &&
                    part.length > 2
                ) {
                    return (
                        <em key={i} className="mark-u not-italic font-extrabold">
                            {part.slice(1, -1)}
                            <svg
                                className="mark-u-line"
                                viewBox="0 0 200 12"
                                preserveAspectRatio="none"
                                aria-hidden
                            >
                                <path
                                    d="M2 8 C 40 2, 70 11, 110 6 C 145 2, 175 10, 198 5"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="3.5"
                                    strokeLinecap="round"
                                />
                            </svg>
                        </em>
                    );
                }
                return <span key={i}>{part}</span>;
            })}
        </span>
    );
}
