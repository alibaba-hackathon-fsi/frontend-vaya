import React from "react";

/**
 * Mini trend sparkline — ported from the source `sparkline()` helper.
 * Stroke is green when the series ends at/below where it started, red otherwise.
 */
export default function Sparkline({
  arr,
  w = 92,
  h = 30,
}: {
  arr: number[];
  w?: number;
  h?: number;
}) {
  const mn = Math.min(...arr);
  const mx = Math.max(...arr);
  const pad = 3;
  const pts = arr
    .map((v, i) => {
      const x = pad + (i * (w - 2 * pad)) / (arr.length - 1);
      const y = h - pad - ((v - mn) / (mx - mn || 1)) * (h - 2 * pad);
      return x.toFixed(1) + "," + y.toFixed(1);
    })
    .join(" ");
  const good = arr[arr.length - 1] <= arr[0];
  const c = good ? "#0A8F55" : "#E5533B";
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`}>
      <polyline
        points={pts}
        fill="none"
        stroke={c}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
