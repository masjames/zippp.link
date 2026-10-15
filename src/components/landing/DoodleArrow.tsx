"use client";

import {
    ArrowDownLeft,
    ArrowDownRight,
    CornerDownRight,
    MoveRight,
} from "lucide-react";

type Variant = "curve-left" | "loop-point" | "scribble-under" | "zigzag";

const ICONS = {
    "curve-left": CornerDownRight,
    "loop-point": ArrowDownRight,
    "scribble-under": MoveRight,
    zigzag: ArrowDownLeft,
} as const;

/**
 * Lucide accent arrow — no custom drawing.
 */
export default function DoodleArrow({
    variant,
    label,
    className = "",
    width = 56,
    height = 56,
    color = "var(--c-orange)",
}: {
    variant: Variant;
    label?: string;
    className?: string;
    width?: number;
    height?: number;
    color?: string;
}) {
    const Icon = ICONS[variant];
    const size = Math.min(width, height);

    return (
        <div
            className={`pointer-events-none flex flex-col items-center gap-0.5 ${className}`}
            aria-hidden
        >
            {label ? (
                <span
                    className="font-head text-[11px] font-bold italic tracking-tight"
                    style={{ color }}
                >
                    {label}
                </span>
            ) : null}
            <Icon
                strokeWidth={2.25}
                absoluteStrokeWidth
                style={{ color, width: size, height: size }}
            />
        </div>
    );
}
