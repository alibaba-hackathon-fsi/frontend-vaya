/**
 * Placement maths shared by the chart tooltips and the glossary popover.
 *
 * Three problems this solves, in the order they turned up:
 *  1. A tooltip centred on its anchor hung off the edge of a narrow screen and
 *     widened the document, giving the page a horizontal scrollbar.
 *  2. Clipping the chart's overflow stopped that, but then the bubble simply
 *     lost its left or right side.
 *  3. Placing it above the anchor could tuck it under the sticky page header,
 *     which sits at z-index 100 and covered the top of the bubble.
 *
 * So: the box is centred on the anchor and then slid back until it fits, and the
 * vertical side is chosen against a top boundary that knows where the header
 * ends. A point on the far left borrows the empty space to its right; a trigger
 * near the top drops below rather than hiding behind the header.
 */

export const TIP_MARGIN = 10;
export const TIP_GAP = 12;

/** The anchor a tooltip points at, in viewport coordinates. */
export type TipAnchor = {
  left: number;
  width: number;
  /** top edge — the bubble sits above this when placed up */
  top: number;
  /** bottom edge — the bubble sits below this when placed down */
  bottom: number;
};

export type TipOpts = {
  /** lowest y the bubble may occupy; pass safeTop() to clear a sticky header */
  topBound?: number;
  /** try below the anchor first instead of above */
  preferBelow?: boolean;
};

/**
 * Lowest y-coordinate a floating element may use without disappearing under the
 * sticky page header. Falls back to the plain margin when there is no header, or
 * when the header has scrolled out of the way.
 */
export function safeTop(): number {
  if (typeof document === "undefined") return TIP_MARGIN;
  const el = document.querySelector("header");
  if (!el) return TIP_MARGIN;
  return Math.max(TIP_MARGIN, el.getBoundingClientRect().bottom + 6);
}

/**
 * @param a      the anchor rect
 * @param xFrac  horizontal point of interest inside the anchor, 0..1
 * @param tipW   measured tooltip width
 * @param tipH   measured tooltip height
 * @param viewW  viewport width
 * @param viewH  viewport height
 * @returns viewport coordinates for a `position: fixed` tooltip
 */
export function clampTip(
  a: TipAnchor,
  xFrac: number,
  tipW: number,
  tipH: number,
  viewW: number,
  viewH: number,
  opts: TipOpts = {},
): { left: number; top: number } {
  const top0 = opts.topBound ?? TIP_MARGIN;
  const px = a.left + a.width * xFrac;

  // Centre on the anchor, then pull back inside the viewport. Math.max wins over
  // Math.min when the tooltip is wider than the viewport, which keeps the left
  // edge visible rather than the right.
  const left = Math.max(TIP_MARGIN, Math.min(px - tipW / 2, viewW - tipW - TIP_MARGIN));

  const above = a.top - TIP_GAP - tipH;
  const below = a.bottom + TIP_GAP;
  const fitsAbove = above >= top0;
  const fitsBelow = below + tipH <= viewH - TIP_MARGIN;

  const top = opts.preferBelow
    ? fitsBelow
      ? below
      : fitsAbove
        ? above
        : below
    : fitsAbove
      ? above
      : fitsBelow
        ? below
        : above;

  // Last resort when neither side fits: stay inside the safe band.
  const floor = Math.max(top0, viewH - tipH - TIP_MARGIN);
  return { left, top: Math.max(top0, Math.min(top, floor)) };
}
