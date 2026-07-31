"use client";

/**
 * Multi-series rate-trend chart for the compare page: one line per selected
 * package over the same 12 months, so a cheap headline rate that has been
 * climbing is visibly different from one that has been falling.
 */
import React, { useRef, useState } from "react";
import ChartTip from "@/components/charts/ChartTip";

const MO = ["Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"];

export type Series = { name: string; color: string; arr: number[] };

export default function CompareChart({ series }: { series: Series[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const n = series[0]?.arr.length ?? 0;
  if (!n) return null;

  const W = 660,
    H = 210,
    pl = 46,
    pr = 16,
    pt = 16,
    pb = 26;
  const all = series.flatMap((s) => s.arr);
  const lo = Math.min(...all),
    hi = Math.max(...all);
  const pad = (hi - lo) * 0.22 || 0.4;
  const mn = lo - pad,
    mx = hi + pad;
  const X = (i: number) => pl + (i * (W - pl - pr)) / (n - 1);
  const Y = (v: number) => pt + (1 - (v - mn) / (mx - mn)) * (H - pt - pb);

  const onMove = (e: React.MouseEvent | React.TouchEvent) => {
    const svg = svgRef.current;
    if (!svg) return;
    const r = svg.getBoundingClientRect();
    const cX = "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    let i = Math.round((((cX - r.left) / r.width) * W - pl) / ((W - pl - pr) / (n - 1)));
    i = Math.max(0, Math.min(n - 1, i));
    setHover(i);
  };

  return (
    <div
      className="chart-wrap"
      style={{ cursor: "crosshair" }}
      onMouseMove={onMove}
      onMouseLeave={() => setHover(null)}
      onTouchStart={onMove}
      onTouchMove={onMove}
    >
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="survsvg">
        {[0, 1, 2, 3].map((g) => {
          const val = mx - ((mx - mn) * g) / 3;
          const yy = Y(val);
          return (
            <g key={g}>
              <line x1={pl} y1={yy} x2={W - pr} y2={yy} stroke="#EDF1F4" />
              <text x={pl - 8} y={yy + 4} textAnchor="end" fontSize="10" fill="#95A29F">
                {val.toFixed(1)}%
              </text>
            </g>
          );
        })}

        {series.map((s) => (
          <polyline
            key={s.name}
            points={s.arr.map((v, i) => X(i).toFixed(1) + "," + Y(v).toFixed(1)).join(" ")}
            fill="none"
            stroke={s.color}
            strokeWidth="2.6"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}

        {series.map((s) =>
          s.arr.map((v, i) => (
            <circle key={s.name + i} cx={X(i)} cy={Y(v)} r="2.3" fill="#fff" stroke={s.color} strokeWidth="1.5" />
          )),
        )}

        {MO.slice(0, n).map((m, i) =>
          i % 2 === 0 || i === n - 1 ? (
            <text key={"x" + i} x={X(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="#95A29F">
              {m}
            </text>
          ) : null,
        )}

        {hover != null && (
          <>
            <line
              x1={X(hover)}
              y1={pt}
              x2={X(hover)}
              y2={H - pb}
              stroke="#0A8F55"
              strokeWidth="1"
              strokeDasharray="3 3"
              opacity="0.45"
            />
            {series.map((s) => (
              <circle
                key={"h" + s.name}
                cx={X(hover)}
                cy={Y(s.arr[hover])}
                r="5"
                fill={s.color}
                stroke="#fff"
                strokeWidth="2.2"
              />
            ))}
          </>
        )}
      </svg>

      {hover != null && (
        <ChartTip
          svgRef={svgRef}
          xFrac={X(hover) / W}
          yFrac={Y(Math.max(...series.map((s) => s.arr[hover]))) / H}
        >
          <b>{MO[hover]}</b>
          {series.map((s) => (
            <React.Fragment key={"t" + s.name}>
              <br />
              <span className="cmp-tipdot" style={{ background: s.color }} />
              {s.name} · {s.arr[hover].toFixed(1)}%
            </React.Fragment>
          ))}
        </ChartTip>
      )}
    </div>
  );
}
