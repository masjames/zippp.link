import type { ReactNode } from "react";

/**
 * Render wording with *emphasis* spans (brand color + underline doodle vibe).
 * Example: "Staff snap the *nota*." → nota emphasized.
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
                if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
                    return (
                        <em
                            key={i}
                            className="not-italic font-extrabold text-maroon underline decoration-brand decoration-[3px] underline-offset-4"
                        >
                            {part.slice(1, -1)}
                        </em>
                    );
                }
                return <span key={i}>{part}</span>;
            })}
        </span>
    );
}
