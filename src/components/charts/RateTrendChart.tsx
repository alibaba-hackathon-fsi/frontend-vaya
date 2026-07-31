"use client";

// Interactive 12-month rate-trend chart for a loan package: area + line + dots,
// min/max annotations, and a hover tooltip with the month, rate and MoM delta.
import React, { useRef, useState } from "react";
import ChartTip from "@/components/charts/ChartTip";

const MO = ["Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"];

export default function RateTrendChart({
  arr,
  t,
}: {
  arr: number[];
  t: (k: string) => string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const W = 660, H = 190, pl = 46, pr = 16, pt = 16, pb = 24, n = arr.length;
  const lo = Math.min(...arr), hi = Math.max(...arr);
  const pad = (hi - lo) * 0.25 || 0.4;
  const mn = lo - pad, mx = hi + pad;
  const X = (i: number) => pl + (i * (W - pl - pr)) / (n - 1);
  const Y = (v: number) => pt + (1 - (v - mn) / (mx - mn)) * (H - pt - pb);
  const line = arr.map((v, i) => X(i).toFixed(1) + "," + Y(v).toFixed(1)).join(" ");
  const iMin = arr.indexOf(lo), iMax = arr.indexOf(hi);

  const onMove = (e: React.MouseEvent | React.TouchEvent) => {
    const svg = svgRef.current;
    if (!svg) return;
    const r = svg.getBoundingClientRect();
    const cX = "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    let i = Math.round((((cX - r.left) / r.width) * W - pl) / ((W - pl - pr) / (n - 1)));
    i = Math.max(0, Math.min(n - 1, i));
    setHover(i);
  };

  let tip: React.ReactNode = null;
  if (hover != null) {
    const prev = hover > 0 ? arr[hover - 1] : null;
    const d = prev != null ? arr[hover] - prev : 0;
    tip = (
      <ChartTip svgRef={svgRef} xFrac={X(hover) / W} yFrac={Y(arr[hover]) / H}>
        <b>{arr[hover].toFixed(1)}%</b> · {MO[hover] ?? hover}
        {prev != null && (
          <>
            <br />
            <span className="d">{d <= 0 ? "▼" : "▲"} {Math.abs(d).toFixed(1)} {t("tip_vs")}</span>
          </>
        )}
        {arr[hover] === lo && <span className="low"> ★ {t("d_low")}</span>}
        {arr[hover] === hi && <span className="low"> {t("d_high")}</span>}
      </ChartTip>
    );
  }

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
        <defs>
          <linearGradient id="rtg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#00C776" stopOpacity=".24" />
            <stop offset="1" stopColor="#00C776" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3].map((g) => {
          const val = mx - ((mx - mn) * g) / 3;
          const yy = Y(val);
          return (
            <g key={g}>
              <line x1={pl} y1={yy} x2={W - pr} y2={yy} stroke="#EDF1F4" />
              <text x={pl - 8} y={yy + 4} textAnchor="end" fontSize="10" fill="#95A29F">{val.toFixed(1)}%</text>
            </g>
          );
        })}
        <polygon points={`${pl},${H - pb} ${line} ${W - pr},${H - pb}`} fill="url(#rtg)" />
        <polyline points={line} fill="none" stroke="#0A8F55" strokeWidth="2.6" strokeLinejoin="round" />
        {arr.map((v, i) => (
          <circle key={i} cx={X(i)} cy={Y(v)} r="2.6" fill="#fff" stroke="#0A8F55" strokeWidth="1.6" />
        ))}
        {/* min / max annotations */}
        <circle cx={X(iMin)} cy={Y(lo)} r="4.4" fill="#00C776" stroke="#fff" strokeWidth="2" />
        <text x={X(iMin)} y={Y(lo) + 16} textAnchor="middle" fontSize="10" fontWeight="700" fill="#0A8F55">{lo.toFixed(1)}%</text>
        <circle cx={X(iMax)} cy={Y(hi)} r="4.4" fill="#E5533B" stroke="#fff" strokeWidth="2" />
        <text x={X(iMax)} y={Y(hi) - 9} textAnchor="middle" fontSize="10" fontWeight="700" fill="#E5533B">{hi.toFixed(1)}%</text>
        {arr.map((v, i) =>
          i % 2 === 0 || i === n - 1 ? (
            <text key={"x" + i} x={X(i)} y={H - 7} textAnchor="middle" fontSize="10" fill="#95A29F">{MO[i] ?? i}</text>
          ) : null
        )}
        {hover != null && (
          <>
            <line x1={X(hover)} y1={pt} x2={X(hover)} y2={H - pb} stroke="#0A8F55" strokeWidth="1" strokeDasharray="3 3" opacity="0.45" />
            <circle cx={X(hover)} cy={Y(arr[hover])} r="5.4" fill="#00C776" stroke="#fff" strokeWidth="2.4" />
          </>
        )}
      </svg>
      {tip}
    </div>
  );
}
