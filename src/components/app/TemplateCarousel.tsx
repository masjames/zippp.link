"use client";

import {
    useEffect,
    useRef,
    type PointerEvent,
    type ReactNode,
} from "react";

/**
 * Horizontal snap scroller that works with trackpad/mouse wheel and drag
 * on desktop, and touch swipe on mobile.
 */
export default function TemplateCarousel({
    label,
    children,
}: {
    label: string;
    children: ReactNode;
}) {
    const scrollerRef = useRef<HTMLDivElement>(null);
    const drag = useRef<{
        active: boolean;
        startX: number;
        startScroll: number;
        moved: boolean;
        pointerId: number | null;
    }>({
        active: false,
        startX: 0,
        startScroll: 0,
        moved: false,
        pointerId: null,
    });

    useEffect(() => {
        const el = scrollerRef.current;
        if (!el) return;
        const onWheel = (e: WheelEvent) => {
            const dx =
                Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
            if (dx === 0) return;
            const max = el.scrollWidth - el.clientWidth;
            if (max <= 0) return;
            e.preventDefault();
            el.scrollLeft += dx;
        };
        el.addEventListener("wheel", onWheel, { passive: false });
        return () => el.removeEventListener("wheel", onWheel);
    }, []);

    function onPointerDown(e: PointerEvent<HTMLDivElement>) {
        if (e.pointerType === "touch") return;
        const el = scrollerRef.current;
        if (!el) return;
        drag.current = {
            active: true,
            startX: e.clientX,
            startScroll: el.scrollLeft,
            moved: false,
            pointerId: e.pointerId,
        };
        el.setPointerCapture(e.pointerId);
    }

    function onPointerMove(e: PointerEvent<HTMLDivElement>) {
        const el = scrollerRef.current;
        const d = drag.current;
        if (!el || !d.active || e.pointerType === "touch") return;
        const delta = e.clientX - d.startX;
        if (Math.abs(delta) > 4) d.moved = true;
        el.scrollLeft = d.startScroll - delta;
    }

    function endDrag(e: PointerEvent<HTMLDivElement>) {
        const el = scrollerRef.current;
        const d = drag.current;
        if (!d.active) return;
        d.active = false;
        if (el && d.pointerId != null) {
            try {
                el.releasePointerCapture(d.pointerId);
            } catch {
                /* ignore */
            }
        }
        if (d.moved) e.preventDefault();
        d.pointerId = null;
    }

    return (
        <div
            ref={scrollerRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onClickCapture={(e) => {
                if (drag.current.moved) {
                    e.preventDefault();
                    e.stopPropagation();
                    drag.current.moved = false;
                }
            }}
            role="listbox"
            aria-label={label}
            className="flex cursor-grab gap-2 overflow-x-auto overscroll-x-contain px-6 py-1 snap-x snap-mandatory scroll-px-6 touch-pan-x active:cursor-grabbing [scrollbar-width:thin]"
        >
            {children}
        </div>
    );
}
