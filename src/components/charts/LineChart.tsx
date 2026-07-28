"use client";

// Interactive average-rate line chart — pure SVG, hover shows a tooltip with the
// month, rate and month-over-month delta, plus a guide line and highlighted point.
import React, { useId, useRef, useState } from "react";

export default function LineChart({
  data,
  labels,
  tipVs,
  tipLow,
}: {
  data: number[];
  labels: string[];
  tipVs: string;
  tipLow: string;
}) {
  const gid = "ga-" + useId().replace(/[:]/g, "");
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const w = 900,
    h = 240,
    pl = 42,
    pr = 18,
    pt = 18,
    pb = 34;
  const mn = Math.min(...data) - 0.5;
  const mx = Math.max(...data) + 0.4;
  const minV = Math.min(...data);
  const X = (i: number) => pl + (i * (w - pl - pr)) / (data.length - 1);
  const Y = (v: number) => pt + (1 - (v - mn) / (mx - mn || 1)) * (h - pt - pb);
  const line = data.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(" ");
  const area = `${X(0)},${h - pb} ` + line + ` ${X(data.length - 1)},${h - pb}`;
  const gridYs = [0, 1, 2, 3].map((g) => {
    const val = mx - ((mx - mn) * g) / 3;
    return { val, y: Y(val) };
  });

  const onMove = (e: React.MouseEvent | React.TouchEvent) => {
    const svg = svgRef.current;
    if (!svg) return;
    const r = svg.getBoundingClientRect();
    const cX = "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    let i = Math.round((((cX - r.left) / r.width) * w - pl) / ((w - pl - pr) / (data.length - 1)));
    i = Math.max(0, Math.min(data.length - 1, i));
    setHover(i);
  };

  let tip: React.ReactNode = null;
  if (hover != null) {
    const prev = hover > 0 ? data[hover - 1] : null;
    const d = prev != null ? data[hover] - prev : 0;
    const low = data[hover] === minV;
    tip = (
      <div className="chart-tip" style={{ left: `${(X(hover) / w) * 100}%`, top: `${(Y(data[hover]) / h) * 100}%`, opacity: 1 }}>
        <b>{data[hover].toFixed(1)}%</b> · {labels[hover]}
        <br />
        {prev != null && (
          <span className="d">
            {d <= 0 ? "▼" : "▲"} {Math.abs(d).toFixed(1)} {tipVs}
          </span>
        )}{" "}
        {low && <span className="low">★ {tipLow}</span>}
      </div>
    );
  }

  return (
    <div
      className="chart-wrap"
      onMouseMove={onMove}
      onMouseLeave={() => setHover(null)}
      onTouchStart={onMove}
      onTouchMove={onMove}
    >
      <svg ref={svgRef} viewBox={`0 0 ${w} ${h}`}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#00C776" stopOpacity=".22" />
            <stop offset="1" stopColor="#00C776" stopOpacity="0" />
          </linearGradient>
        </defs>
        {gridYs.map((g, i) => (
          <g key={i}>
            <line x1={pl} y1={g.y} x2={w - pr} y2={g.y} stroke="#EDF1F4" />
            <text x={pl - 9} y={g.y + 4} textAnchor="end" fontSize="13" fill="#95A29F">
              {g.val.toFixed(1)}%
            </text>
          </g>
        ))}
        {data.map((v, i) =>
          i % 2 === 0 || i === data.length - 1 ? (
            <text key={i} x={X(i)} y={h - 12} textAnchor="middle" fontSize="13" fill="#95A29F">
              {labels[i]}
            </text>
          ) : null
        )}
        <polygon points={area} fill={`url(#${gid})`} />
        <polyline points={line} fill="none" stroke="#0A8F55" strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" />
        {hover != null && (
          <>
            <line x1={X(hover)} y1={pt} x2={X(hover)} y2={h - pb} stroke="#0A8F55" strokeWidth="1" strokeDasharray="3 3" opacity="0.45" />
            <circle cx={X(hover)} cy={Y(data[hover])} r="5.5" fill="#00C776" stroke="#fff" strokeWidth="2.5" />
          </>
        )}
      </svg>
      {tip}
    </div>
  );
}
