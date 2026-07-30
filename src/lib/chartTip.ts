/**
 * Position a chart tooltip so it can never leave its container.
 *
 * The tips used to be centred on the hovered point (`translateX(-50%)`). At the
 * first and last data point half the bubble therefore hung outside the chart —
 * on a 360px phone that widened the document and gave the whole page a
 * horizontal scrollbar.
 *
 * Instead of always centring, the bubble re-anchors near the edges: left-aligned
 * in the first sliver of the chart, right-aligned in the last one, centred in
 * between. No measuring, no layout thrash, no dependency.
 */
export function tipPos(leftPct: number, topPct: number) {
  const x = Math.max(0, Math.min(100, leftPct));
  // percentage of the tooltip's OWN width to shift by
  const anchor = x < 18 ? 0 : x > 82 ? -100 : -50;
  return {
    left: `${x}%`,
    top: `${topPct}%`,
    transform: `translate(${anchor}%, -118%)`,
    opacity: 1,
  };
}
