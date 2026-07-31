/**
 * Placement maths for chart tooltips.
 *
 * The tooltips are centred on the hovered data point, which means a point near
 * either edge would hang outside the chart. Two things went wrong with that:
 * on a narrow screen it widened the document (horizontal scrollbar), and once
 * the chart clipped its own overflow to stop that, the bubble simply lost its
 * left or right side.
 *
 * So instead of only re-anchoring near the edges, the box is centred and then
 * slid back until it fits the viewport. A point on the far left therefore
 * borrows the empty space to its right, and vice versa — the bubble is never
 * cut and never pushes the page.
 */

export type Rect = { left: number; top: number; width: number; height: number };

export const TIP_MARGIN = 10;
export const TIP_GAP = 12;

/**
 * @param box     the chart's on-screen rect
 * @param xFrac   horizontal position of the point inside the chart, 0..1
 * @param yFrac   vertical position of the point inside the chart, 0..1
 * @param tipW    measured tooltip width
 * @param tipH    measured tooltip height
 * @param viewW   viewport width
 * @param viewH   viewport height
 * @returns viewport coordinates for a `position: fixed` tooltip
 */
export function clampTip(
  box: Rect,
  xFrac: number,
  yFrac: number,
  tipW: number,
  tipH: number,
  viewW: number,
  viewH: number,
): { left: number; top: number } {
  const px = box.left + box.width * xFrac;
  const py = box.top + box.height * yFrac;

  // Centre on the point, then pull back inside the viewport. Math.max wins over
  // Math.min when the tooltip is wider than the viewport, which keeps the left
  // edge visible instead of the right.
  const left = Math.max(TIP_MARGIN, Math.min(px - tipW / 2, viewW - tipW - TIP_MARGIN));

  // Prefer sitting above the point; flip below only when there is no room up
  // there, and never let it run off the bottom.
  const above = py - TIP_GAP - tipH;
  const top =
    above >= TIP_MARGIN
      ? above
      : Math.max(TIP_MARGIN, Math.min(py + TIP_GAP, viewH - tipH - TIP_MARGIN));

  return { left, top };
}
