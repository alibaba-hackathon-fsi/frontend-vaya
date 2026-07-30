"use client";

import React, { useRef, useState } from "react";
import type { MCResult } from "@/lib/survival";
import { fvShort } from "@/lib/survival";
import { tipPos } from "@/lib/chartTip";

/**
 * Interactive savings-buffer chart — replaces the static SVG string.
 * Hover/touch shows a tooltip with median, stress and band values at that month.
 */
export default function SurvivalChart({
  mc,
  T,
  t,
}: {
  mc: MCResult;
  T: number;
  t: (k: string) => string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const { p10, p50, p90, stress, months } = mc;
  const n = months.length;
  const W = 680,
    H = 250,
    pl = 52,
    pr = 14,
    pt = 14,
    pb = 26;

  const all = p10.concat(p90, stress, [0]);
  let mn = Math.min(...all);
  let mx = Math.max(...all);
  if (mx === mn) mx = mn + 1;

  const X = (i: number) => pl + (i * (W - pl - pr)) / (n - 1);
  const Y = (v: number) => pt + (1 - (v - mn) / (mx - mn)) * (H - pt - pb);

  const bandUp = p90
    .map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`)
    .join(" ");
  const bandDn = p10
    .map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`)
    .reverse()
    .join(" ");
  const medLine = p50
    .map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`)
    .join(" ");
  const stressLine = stress
    .map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`)
    .join(" ");

  const marks = [0, 6, 12, 18, 24, 36, 48, 60].filter((x) => x <= T);
  if (marks[marks.length - 1] !== T) marks.push(T);

  const onMove = (e: React.MouseEvent | React.TouchEvent) => {
    const svg = svgRef.current;
    if (!svg) return;
    const r = svg.getBoundingClientRect();
    const cX =
      "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    let i = Math.round(
      (((cX - r.left) / r.width) * W - pl) / ((W - pl - pr) / (n - 1)),
    );
    i = Math.max(0, Math.min(n - 1, i));
    setHover(i);
  };

  return (
    <div
      className="chart-wrap"
      style={{ marginTop: 0, cursor: "crosshair" }}
      onMouseMove={onMove}
      onMouseLeave={() => setHover(null)}
      onTouchStart={onMove}
      onTouchMove={onMove}
    >
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="survsvg">
        {/* Grid lines */}
        {[0, 1, 2, 3].map((g) => {
          const val = mx - ((mx - mn) * g) / 3;
          const yy = Y(val);
          return (
            <g key={g}>
              <line x1={pl} y1={yy} x2={W - pr} y2={yy} stroke="#EDF1F4" />
              <text
                x={pl - 8}
                y={yy + 4}
                textAnchor="end"
                fontSize="10.5"
                fill="#95A29F"
              >
                {fvShort(val)}
              </text>
            </g>
          );
        })}

        {/* Zero line */}
        {mn < 0 && (
          <line
            x1={pl}
            y1={Y(0)}
            x2={W - pr}
            y2={Y(0)}
            stroke="#E5533B"
            strokeWidth="1"
            strokeDasharray="2 3"
            opacity=".55"
          />
        )}

        {/* Confidence band */}
        <polygon points={`${bandUp} ${bandDn}`} fill="rgba(0,199,118,.15)" />

        {/* Stress line */}
        <polyline
          points={stressLine}
          fill="none"
          stroke="#E5533B"
          strokeWidth="1.8"
          strokeDasharray="5 4"
        />

        {/* Median line */}
        <polyline
          points={medLine}
          fill="none"
          stroke="#0A8F55"
          strokeWidth="2.6"
          strokeLinejoin="round"
        />

        {/* X-axis labels */}
        {marks.map((mm) => (
          <text
            key={mm}
            x={X(Math.min(mm, n - 1))}
            y={H - 9}
            textAnchor="middle"
            fontSize="10.5"
            fill="#95A29F"
          >
            {mm}
          </text>
        ))}

        {/* Hover guide */}
        {hover != null && (
          <>
            <line
              x1={X(hover)}
              y1={pt}
              x2={X(hover)}
              y2={H - pb}
              stroke="#013D3B"
              strokeWidth="1"
              opacity=".25"
            />
            <circle
              cx={X(hover)}
              cy={Y(p50[hover])}
              r="4.5"
              fill="#0A8F55"
              stroke="#fff"
              strokeWidth="2"
            />
            <circle
              cx={X(hover)}
              cy={Y(stress[hover])}
              r="4"
              fill="#E5533B"
              stroke="#fff"
              strokeWidth="2"
            />
          </>
        )}
      </svg>

      {/* Tooltip */}
      {hover != null && (
        <div
          className="chart-tip"
          style={tipPos((X(hover) / W) * 100, (Y(p50[hover]) / H) * 100)}
        >
          <b>
            {t("sc_month")} {months[hover]}
          </b>
          <br />
          <span className="d">
            {t("r_median")}: {fvShort(p50[hover])}
          </span>
          <br />
          <span style={{ color: "#ffa39e" }}>
            {t("r_stress")}: {fvShort(stress[hover])}
          </span>
          <br />
          <span style={{ color: "#b7eb8f" }}>
            {t("sc_band")}: {fvShort(p10[hover])} – {fvShort(p90[hover])}
          </span>
        </div>
      )}
    </div>
  );
}
