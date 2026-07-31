"use client";

/**
 * Tooltip shell shared by every chart.
 *
 * Rendered into `document.body` with `position: fixed`, for two reasons: no
 * ancestor can clip it (the chart wrapper clips its own overflow so a tooltip
 * can never widen the page), and it is free to use whichever side of the screen
 * actually has room — the previous absolute version lost its left half whenever
 * the user tapped a point near the left edge on a phone.
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { clampTip } from "@/lib/chartTip";

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export default function ChartTip({
  svgRef,
  xFrac,
  yFrac,
  children,
}: {
  svgRef: React.RefObject<SVGSVGElement | null>;
  /** horizontal position of the hovered point inside the chart, 0..1 */
  xFrac: number;
  /** vertical position of the hovered point inside the chart, 0..1 */
  yFrac: number;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useEffect(() => setMounted(true), []);

  // Measured after paint, so the clamp works off the real box rather than a
  // guess — tooltip width varies a lot between en / vi / zh.
  useIsoLayoutEffect(() => {
    const svg = svgRef.current;
    const el = ref.current;
    if (!svg || !el) return;
    const box = svg.getBoundingClientRect();
    setPos(
      clampTip(
        box,
        xFrac,
        yFrac,
        el.offsetWidth,
        el.offsetHeight,
        window.innerWidth,
        window.innerHeight,
      ),
    );
  }, [svgRef, xFrac, yFrac, children, mounted]);

  if (!mounted) return null;

  return createPortal(
    <div
      ref={ref}
      className="chart-tip pinned"
      role="tooltip"
      // Off-screen for the first paint so the pre-measurement position never
      // flashes in the wrong place.
      style={pos ? { left: pos.left, top: pos.top, opacity: 1 } : { left: -9999, top: 0, opacity: 0 }}
    >
      {children}
    </div>,
    document.body,
  );
}
