"use client";

import { useEffect, useId, useRef } from "react";
import rough from "roughjs";

export type DoodleVariant =
    | "curve-down"
    | "curve-left"
    | "scribble-under"
    | "loop-point"
    | "zigzag";

type Props = {
    variant?: DoodleVariant;
    label?: string;
    className?: string;
    /** stroke color; defaults to maroon ink */
    color?: string;
    width?: number;
    height?: number;
};

/**
 * Hand-drawn accents via rough.js (seeded so SSR/client match).
 * Several path variants so the page does not repeat one dashed arrow.
 */
export default function DoodleArrow({
    variant = "curve-down",
    label,
    className = "",
    color = "var(--c-maroon)",
    width = 96,
    height = 72,
}: Props) {
    const canvasRef = useRef<SVGSVGElement>(null);
    const reactId = useId();
    // Stable seed from variant + react id length (deterministic enough for hydrate)
    const seed = hashSeed(`${variant}-${reactId}`);

    useEffect(() => {
        const svg = canvasRef.current;
        if (!svg) return;
        while (svg.firstChild) svg.removeChild(svg.firstChild);

        const rc = rough.svg(svg);
        const stroke = color;
        const opts = {
            stroke,
            strokeWidth: 2.2,
            roughness: 1.6,
            bowing: 1.2,
            seed,
        } as const;

        const nodes: SVGElement[] = [];

        if (variant === "curve-down") {
            nodes.push(
                rc.path("M12 14 C 28 18, 48 28, 58 52", opts),
                rc.path("M46 44 L58 54 L50 58", { ...opts, roughness: 1.1 })
            );
        } else if (variant === "curve-left") {
            nodes.push(
                rc.path("M78 18 C 60 22, 36 30, 22 50", opts),
                rc.path("M30 42 L20 52 L32 54", { ...opts, roughness: 1.1 })
            );
        } else if (variant === "scribble-under") {
            nodes.push(
                rc.path(
                    "M8 40 C 24 28, 40 52, 56 36 S 80 44, 90 32",
                    { ...opts, strokeWidth: 2.6 }
                )
            );
        } else if (variant === "loop-point") {
            nodes.push(
                rc.path(
                    "M20 20 C 10 36, 28 56, 48 40 C 62 28, 70 48, 78 56",
                    opts
                ),
                rc.path("M68 48 L80 58 L70 60", { ...opts, roughness: 1 })
            );
        } else {
            nodes.push(
                rc.path("M14 16 L28 28 L40 14 L54 30 L66 18 L78 40", opts),
                rc.path("M68 32 L80 42 L70 46", { ...opts, roughness: 1 })
            );
        }

        for (const node of nodes) svg.appendChild(node);
    }, [variant, color, seed]);

    return (
        <div
            className={`pointer-events-none flex flex-col items-center ${className}`}
            aria-hidden
        >
            {label ? (
                <span
                    className="mb-0.5 max-w-[9rem] text-center font-head text-[11px] font-bold leading-tight tracking-wide text-maroon"
                    style={{ transform: "rotate(-4deg)" }}
                >
                    {label}
                </span>
            ) : null}
            <svg
                ref={canvasRef}
                width={width}
                height={height}
                viewBox={`0 0 ${width} ${height}`}
                className="overflow-visible"
            />
        </div>
    );
}

function hashSeed(s: string): number {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return Math.abs(h % 2_147_483_647) || 1;
}
